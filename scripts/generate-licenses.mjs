// Lizenzhinweise der mitgelieferten Fremdpakete (npm im Bundle, Rust-Crates im Programm).
// Reine Teile sind exportiert und getestet; das Einsammeln beim Build steckt in licenses-plugin.mjs.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * @typedef {{ name: string, version: string, license: string, text: string | null }} PackageLicense
 * @typedef {{ name: string, version: string, license: string, source: "npm" | "cargo", texts: number[] }} NoticeEntry
 * @typedef {{ rust: "ok" | "unavailable", texts: string[], packages: NoticeEntry[] }} Notices
 */

const NODE_MODULES = "/node_modules/";
const LICENSE_FILE = /^(licen[cs]e|copying)([-._][^/]*)?$/i;
const CODE_FILE = /\.(c|m)?(js|ts)$|\.json$/i;
const UNKNOWN_LICENSE = "unbekannt";
/** Die Apache-2.0-Bedingungen stehen in vielen Crates leicht abweichend formatiert. */
const APACHE_TERMS = /Apache License\s+Version 2\.0, January 2004[\s\S]*?END OF TERMS AND CONDITIONS/;
const APACHE_KEY = "apache-2.0-terms";
/** Windows ist das einzige Ziel der Anwendung. */
const RUST_TARGET = "x86_64-pc-windows-msvc";

/** Paketordner unter node_modules zu einer Modul-ID aus Rollup, sonst null. */
export function packageDirFromModuleId(/** @type {string} */ id) {
	const path = id.replace(/^\0/, "").split("?")[0].replaceAll("\\", "/");
	const index = path.lastIndexOf(NODE_MODULES);
	if (index < 0) return null;
	const rest = path.slice(index + NODE_MODULES.length).split("/");
	const depth = rest[0]?.startsWith("@") ? 2 : 1;
	if (rest.length <= depth || rest.slice(0, depth).some((part) => part === "")) return null;
	return path.slice(0, index + NODE_MODULES.length) + rest.slice(0, depth).join("/");
}

/** LICENSE*, LICENCE*, COPYING* – aber keine gleichnamigen Code-Dateien. */
export function isLicenseFileName(/** @type {string} */ name) {
	return LICENSE_FILE.test(name) && !CODE_FILE.test(name) && !/^licenses\b/i.test(name);
}

/** Einheitliche Zeilenenden, kein Leerraum am Zeilenende und am Rand. */
export function normalizeLicenseText(/** @type {string} */ text) {
	return text
		.replace(/^﻿/, "")
		.replace(/\r\n?/g, "\n")
		.split("\n")
		.map((line) => line.trimEnd())
		.join("\n")
		.replace(/^\n+|\n+$/g, "");
}

/**
 * IDs aller Crates, die über normale Abhängigkeiten im Programm landen (ohne das eigene Paket).
 * @param {{ resolve: { root: string | null, nodes: { id: string, deps: { pkg: string, dep_kinds: { kind: string | null }[] }[] }[] } }} metadata
 */
export function rustDependencyIds(metadata) {
	const nodes = new Map(metadata.resolve.nodes.map((node) => [node.id, node]));
	const root = metadata.resolve.root;
	/** @type {Set<string>} */
	const seen = new Set();
	const queue = root ? [root] : [];
	while (queue.length > 0) {
		const node = nodes.get(/** @type {string} */ (queue.pop()));
		for (const dep of node?.deps ?? []) {
			const normal = dep.dep_kinds.some((kind) => kind.kind === null);
			if (!normal || seen.has(dep.pkg) || dep.pkg === root) continue;
			seen.add(dep.pkg);
			queue.push(dep.pkg);
		}
	}
	return seen;
}

/** Zerlegt einen Text in Teile; die Apache-Bedingungen werden ein eigener Teil. */
function splitLicenseText(/** @type {string} */ text) {
	const normalized = normalizeLicenseText(text);
	const match = APACHE_TERMS.exec(normalized);
	if (!match) return [normalized];
	const before = normalized.slice(0, match.index);
	const after = normalized.slice(match.index + match[0].length);
	return [before, match[0], after].map(normalizeLicenseText).filter((part) => part !== "");
}

/** Schlüssel zum Zusammenfassen: Leerraum zählt nicht, Apache-Bedingungen sind immer gleich. */
function textKey(/** @type {string} */ part) {
	return APACHE_TERMS.test(part) && part.startsWith("Apache") ? APACHE_KEY : part.replace(/\s+/g, " ");
}

/**
 * Gesamtdokument: gleiche Texte nur einmal, Pakete nach Name sortiert.
 * @param {{ npm: PackageLicense[], cargo: PackageLicense[] | null }} input
 * @returns {Notices}
 */
export function buildNotices({ npm, cargo }) {
	/** @type {string[]} */
	const texts = [];
	/** @type {Map<string, number>} */
	const indexByKey = new Map();
	/** @param {string} part */
	const partIndex = (part) => {
		const key = textKey(part);
		if (!indexByKey.has(key)) indexByKey.set(key, texts.push(part) - 1);
		return /** @type {number} */ (indexByKey.get(key));
	};
	/** @type {(source: "npm" | "cargo") => (pkg: PackageLicense) => NoticeEntry} */
	const toEntry = (source) => (pkg) => ({
		name: pkg.name,
		version: pkg.version,
		license: pkg.license || UNKNOWN_LICENSE,
		source,
		texts: pkg.text ? [...new Set(splitLicenseText(pkg.text).map(partIndex))] : []
	});
	const all = [...npm.map(toEntry("npm")), ...(cargo ?? []).map(toEntry("cargo"))];
	all.sort((a, b) => a.name.localeCompare(b.name, "en") || a.version.localeCompare(b.version, "en"));
	return { rust: cargo ? "ok" : "unavailable", texts, packages: all };
}

/** Alle Lizenzdateien eines Ordners, aneinandergehängt; null ohne Datei. */
export function readLicenseFiles(/** @type {string} */ dir, /** @type {string[]} */ extra = []) {
	const names = readdirSync(dir).filter(isLicenseFileName).sort();
	const paths = [...names.map((name) => join(dir, name)), ...extra.filter((path) => existsSync(path))];
	const unique = [...new Set(paths)];
	if (unique.length === 0) return null;
	return unique.map((path) => normalizeLicenseText(readFileSync(path, "utf-8"))).join("\n\n");
}

/** Fehlt die Angabe in package.json, lässt sich MIT am Text erkennen; sonst leer. */
export function licenseFromText(/** @type {string | null} */ text) {
	if (!text) return "";
	return /^MIT License|Permission is hereby granted, free of charge/m.test(text) ? "MIT" : "";
}

/** Lizenzangabe aus package.json: SPDX-Text oder alte Objekt-/Listenform. */
function npmLicense(/** @type {any} */ pkg) {
	const value = pkg.license ?? pkg.licenses;
	if (typeof value === "string") return value;
	if (Array.isArray(value)) return value.map((item) => item.type ?? item).join(" OR ");
	return value?.type ?? "";
}

/** Name, Version, Lizenz und Text eines npm-Pakets aus seinem Ordner. */
export function readNpmPackage(/** @type {string} */ dir) {
	const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8"));
	const text = readLicenseFiles(dir);
	return { name: pkg.name, version: pkg.version, license: npmLicense(pkg) || licenseFromText(text), text };
}

/**
 * Crates des Programms samt Lizenztext aus ~/.cargo/registry; null, wenn cargo fehlt.
 * `cargo metadata` lädt fehlende Quellen selbst nach.
 */
export function readCargoPackages(/** @type {string} */ manifestDir) {
	let output;
	try {
		output = execFileSync(
			"cargo",
			["metadata", "--format-version", "1", "--locked", "--filter-platform", RUST_TARGET],
			{ cwd: manifestDir, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }
		);
	} catch {
		return null;
	}
	const metadata = JSON.parse(output);
	const ids = rustDependencyIds(metadata);
	return metadata.packages
		.filter((/** @type {any} */ pkg) => ids.has(pkg.id))
		.map((/** @type {any} */ pkg) => {
			const dir = dirname(pkg.manifest_path);
			const extra = pkg.license_file ? [join(dir, pkg.license_file)] : [];
			return { name: pkg.name, version: pkg.version, license: pkg.license ?? "", text: readLicenseFiles(dir, extra) };
		});
}
