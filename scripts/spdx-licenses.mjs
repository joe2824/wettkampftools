// Standardtexte nach SPDX für Pakete, die keinen eigenen Lizenztext mitliefern.
// Die Texte unter scripts/spdx/ stammen unverändert aus https://github.com/spdx/license-list-data.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SPDX_DIR = join(dirname(fileURLToPath(import.meta.url)), "spdx");
const SPDX_ID = /^[A-Za-z0-9][A-Za-z0-9.+-]*$/;
const OPERATORS = new Set(["OR", "AND", "WITH"]);
/** Quellenkopf der mitgelieferten Dateien. */
const HEADER_LINE = /^#.*\n/;
/** Platzhalter wie „Copyright (c) <year> <owner>“; die echten Urheber stehen davor. */
const PLACEHOLDER_COPYRIGHT = /^Copyright (\(c\) )?(<year>|YEAR ).*\n?\n?/gim;

/** Einzelne Lizenzkennungen eines SPDX-Ausdrucks (auch alte Formen wie „MIT/Apache-2.0“). */
export function spdxLicenseIds(/** @type {string} */ expression) {
	const tokens = expression.split(/[\s()/]+/).filter((token) => token !== "" && !OPERATORS.has(token));
	return [...new Set(tokens)];
}

/** Mitgelieferter Standardtext zu einer Kennung, sonst null. */
export function readSpdxText(/** @type {string} */ id) {
	if (!SPDX_ID.test(id)) return null;
	const path = join(SPDX_DIR, `${id}.license`);
	if (!existsSync(path)) return null;
	let text = readFileSync(path, "utf-8").replace(/\r\n?/g, "\n");
	while (HEADER_LINE.test(text)) text = text.replace(HEADER_LINE, "");
	return text.replace(PLACEHOLDER_COPYRIGHT, "").replace(/^\n+|\s+$/g, "");
}

/**
 * Ersatztext: Urheber aus den Paketangaben, dann die Standardtexte aller genannten Lizenzen.
 * null, wenn die Angabe fehlt oder ein Text nicht mitgeliefert ist.
 */
export function fallbackLicenseText(
	/** @type {string} */ license,
	/** @type {string[]} */ authors,
	/** @type {(id: string) => string | null} */ readText = readSpdxText
) {
	const ids = spdxLicenseIds(license);
	const texts = ids.map(readText);
	if (ids.length === 0 || texts.some((text) => text === null)) return null;
	const copyright = authors.length > 0 ? [`Copyright (c) ${authors.join(", ")}`] : [];
	return [...copyright, ...texts].join("\n\n");
}

/** Pakete ohne Lizenztext als „name@version“. */
export function missingLicenseTexts(
	/** @type {{ packages: { name: string, version: string, texts: number[] }[] }} */ notices
) {
	return notices.packages.filter((pkg) => pkg.texts.length === 0).map((pkg) => `${pkg.name}@${pkg.version}`);
}
