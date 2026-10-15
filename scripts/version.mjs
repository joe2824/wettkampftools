// Versionslogik der Release-Skripte: nächste Version bestimmen und in alle Versionsdateien schreiben.
//
//   node scripts/version.mjs plan [--beta] [--out <datei>] [--otherwise <patch|minor|major>] [patch|minor|major|X.Y.Z|X.Y.Z-beta.N]
//   node scripts/version.mjs apply [--dry-run] <version>
//   node scripts/version.mjs branch <version>
//   node scripts/version.mjs notes <tag> [datei]
//
// Ergebnisse auf stdout (bzw. in --out), Rückfragen und Meldungen auf stderr.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const SEMVER = String.raw`[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.]+)?`;
const STABLE_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const BETA_PATTERN = /^([0-9]+\.[0-9]+\.[0-9]+)-beta\.([0-9]+)$/;
const BUMPS = ["patch", "minor", "major"];
const STABLE_BRANCH = "main";
const BETA_BRANCH = "dev";
const NOTES_FILE = "RELEASE_NOTES.md";

/** Datei → Muster mit der Version in Gruppe 2; nur der erste Treffer zählt. */
const VERSION_PATTERNS = {
	"package.json": new RegExp(`^(\\t"version": ")(${SEMVER})(")`, "m"),
	"src-tauri/tauri.conf.json": new RegExp(`^(\\t"version": ")(${SEMVER})(")`, "m"),
	"src-tauri/Cargo.toml": new RegExp(`^(version = ")(${SEMVER})(")`, "m"),
	"src-tauri/Cargo.lock": new RegExp(`(name = "wettkampftools"\\r?\\nversion = ")(${SEMVER})(")`)
};

export const VERSION_FILES = Object.keys(VERSION_PATTERNS);

const core = (version) => version.split("-")[0].split(".").map(Number);
const betaNumber = (version) => Number(BETA_PATTERN.exec(version)?.[2] ?? Infinity);

/** Semver-Vergleich für X.Y.Z und X.Y.Z-beta.N; eine Beta liegt vor ihrer stabilen Version. */
export function isNewer(a, b) {
	const [left, right] = [core(a), core(b)];
	for (let i = 0; i < left.length; i++) {
		if (left[i] !== right[i]) return left[i] > right[i];
	}
	return betaNumber(a) > betaNumber(b);
}

export function bump(base, kind) {
	const [major, minor, patch] = core(base);
	if (kind === "major") return `${major + 1}.0.0`;
	if (kind === "minor") return `${major}.${minor + 1}.0`;
	return `${major}.${minor}.${patch + 1}`;
}

const versionsOf = (tags) => tags.map((tag) => tag.replace(/^v/, ""));
const newest = (versions) => versions.reduce((best, v) => (best === null || isNewer(v, best) ? v : best), null);

export function nextBetaNumber(base, tags) {
	const numbers = versionsOf(tags)
		.map((v) => BETA_PATTERN.exec(v))
		.filter((match) => match && match[1] === base)
		.map((match) => Number(match[2]));
	return Math.max(0, ...numbers) + 1;
}

export function releaseBranch(version) {
	return BETA_PATTERN.test(version) ? BETA_BRANCH : STABLE_BRANCH;
}

function openBetaSeries(versions, lastStable) {
	const lastBeta = newest(versions.filter((v) => BETA_PATTERN.test(v)));
	if (lastBeta === null) return null;
	const base = BETA_PATTERN.exec(lastBeta)[1];
	return lastStable === null || isNewer(base, lastStable) ? base : null;
}

function check(version, versions, lastStable) {
	if (versions.includes(version)) return { ok: false, error: `Den Tag v${version} gibt es schon.` };
	if (lastStable !== null && !isNewer(version, lastStable)) {
		return { ok: false, error: `v${version} ist nicht neuer als das letzte Release v${lastStable}.` };
	}
	return { ok: true, version };
}

/**
 * Bestimmt die nächste Version aus Kanal, Wunsch und vorhandenen Tags.
 * Ergebnis: { ok, version } | { ok: false, error } | { ok: false, ask, base, choices } für die Rückfrage.
 */
export function planVersion({ beta, request, tags, currentVersion }) {
	const versions = versionsOf(tags);
	const lastStable = newest(versions.filter((v) => STABLE_PATTERN.test(v)));
	const base = lastStable ?? currentVersion;
	const asBeta = (stable) => `${stable}-beta.${nextBetaNumber(stable, tags)}`;
	const target = (stable) => (beta ? asBeta(stable) : stable);

	if (BUMPS.includes(request)) return check(target(bump(base, request)), versions, lastStable);
	if (STABLE_PATTERN.test(request)) return check(target(request), versions, lastStable);
	if (BETA_PATTERN.test(request)) return check(request, versions, lastStable);
	if (request !== "") {
		return {
			ok: false,
			error: `Ungültige Version „${request}“. Erlaubt: patch, minor, major, 1.2.3 oder 1.2.3-beta.1.`
		};
	}
	const series = beta ? openBetaSeries(versions, lastStable) : null;
	if (series !== null) return check(asBeta(series), versions, lastStable);
	// Vor dem ersten stabilen Release beginnen die Betas bei der geplanten Version selbst.
	if (beta && lastStable === null) return check(asBeta(currentVersion.split("-")[0]), versions, lastStable);
	const choices = Object.fromEntries(BUMPS.map((kind) => [kind, target(bump(base, kind))]));
	return { ok: false, ask: true, base, choices };
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Tags, die die erste Zeile der Notes nennen darf: genau der Tag, bei Betas auch ihre Basisversion. */
function acceptedNotesTags(tag) {
	const beta = BETA_PATTERN.exec(tag.replace(/^v/, ""));
	return beta ? [tag, `v${beta[1]}`] : [tag];
}

/** Nennt die Zeile den Tag als eigenes Wort? v2.1.0 passt nicht zu v2.1.0-beta.3, v2.0.1 nicht zu v2.0.10. */
export function notesHeadlineMatches(headline, tag) {
	return acceptedNotesTags(tag).some((accepted) =>
		new RegExp(`(?:^|[^\\w.-])${escapeRegExp(accepted)}(?=\\s|$)`).test(headline)
	);
}

export function readVersions(root) {
	return Object.fromEntries(
		VERSION_FILES.map((file) => [
			file,
			VERSION_PATTERNS[file].exec(readFileSync(join(root, file), "utf8"))?.[2] ?? null
		])
	);
}

/** Schreibt die Version in alle Dateien; prüft vorher jede, damit nichts halb geändert bleibt. */
export function applyVersion(root, version) {
	const updated = VERSION_FILES.map((file) => {
		const text = readFileSync(join(root, file), "utf8");
		if (!VERSION_PATTERNS[file].test(text)) throw new Error(`Keine Version gefunden in ${file}`);
		return [file, text.replace(VERSION_PATTERNS[file], `$1${version}$3`)];
	});
	for (const [file, text] of updated) writeFileSync(join(root, file), text);
}

// ── Kommandozeile ───────────────────────────────────────────────────────────

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function gitTags() {
	return execFileSync("git", ["tag", "--list", "v*"], { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);
}

async function ask(plan, beta) {
	if (!process.stdin.isTTY)
		throw new Error("Keine Version angegeben. Bitte patch, minor, major oder eine Version nennen.");
	const { patch, minor, major } = plan.choices;
	const lines = [
		beta ? `Letztes Release: v${plan.base} (keine offene Beta-Serie)` : `Letztes Release: v${plan.base}`,
		"",
		`  1) patch → ${patch}  (Fehlerbehebungen)`,
		`  2) minor → ${minor}  (neue Funktionen)`,
		`  3) major → ${major}  (grundlegende Änderungen)`,
		"  4) eigene Version",
		""
	];
	process.stderr.write(lines.join("\n") + "\n");
	const prompt = createInterface({ input: process.stdin, output: process.stderr });
	try {
		const choice = (await prompt.question("Auswahl [1-4]: ")).trim();
		if (choice === "4") return (await prompt.question("Version: ")).trim();
		const picked = { 1: "patch", 2: "minor", 3: "major" }[choice];
		if (!picked) throw new Error("Ungültige Auswahl.");
		return picked;
	} finally {
		prompt.close();
	}
}

/**
 * Argumente von `plan` in beliebiger Reihenfolge. `--otherwise` ersetzt die Rückfrage,
 * wenn ohne Wunsch keine Beta-Serie offen ist (für den Ablauf auf GitHub).
 */
export function parsePlanArgs(args) {
	const parsed = { beta: false, out: null, request: "", fallback: null };
	for (let i = 0; i < args.length; i++) {
		if (args[i] === "--beta") parsed.beta = true;
		else if (args[i] === "--out") parsed.out = args[++i] ?? null;
		else if (args[i] === "--otherwise") parsed.fallback = args[++i] ?? null;
		else parsed.request = args[i];
	}
	return parsed;
}

async function planCommand(args) {
	const { beta, out, request, fallback } = parsePlanArgs(args);
	const input = { beta, request, tags: gitTags(), currentVersion: readVersions(ROOT)["package.json"] };
	let plan = planVersion(input);
	if (plan.ask) plan = planVersion({ ...input, request: fallback ?? (await ask(plan, beta)) });
	if (!plan.ok) throw new Error(plan.error);
	if (out) writeFileSync(out, plan.version);
	else process.stdout.write(`${plan.version}\n`);
}

function applyCommand(args) {
	const dryRun = args.includes("--dry-run");
	const version = args.find((arg) => arg !== "--dry-run");
	if (!version || !(STABLE_PATTERN.test(version) || BETA_PATTERN.test(version))) {
		throw new Error(`Ungültige Version „${version ?? ""}“.`);
	}
	const before = readVersions(ROOT);
	if (!dryRun) applyVersion(ROOT, version);
	for (const file of VERSION_FILES) process.stderr.write(`  ${file}: ${before[file]} → ${version}\n`);
}

/** Prüft RELEASE_NOTES.md (falls vorhanden): die erste Zeile muss den Tag nennen. */
function notesCommand(args) {
	const [tag, file = join(ROOT, NOTES_FILE)] = args;
	if (!tag) throw new Error("Kein Tag angegeben.");
	if (!existsSync(file)) return;
	const headline = readFileSync(file, "utf8").split(/\r?\n/)[0];
	if (!notesHeadlineMatches(headline, tag)) {
		throw new Error(`${NOTES_FILE} nennt in der ersten Zeile nicht ${tag}: „${headline}“. Anpassen oder löschen.`);
	}
}

const COMMANDS = {
	plan: planCommand,
	apply: applyCommand,
	branch: (args) => process.stdout.write(`${releaseBranch(args[0] ?? "")}\n`),
	notes: notesCommand
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const [command, ...args] = process.argv.slice(2);
	try {
		if (!COMMANDS[command])
			throw new Error(`Unbekannter Befehl „${command ?? ""}“. Erlaubt: plan, apply, branch, notes.`);
		await COMMANDS[command](args);
	} catch (error) {
		process.stderr.write(`Fehler: ${error.message}\n`);
		process.exit(1);
	}
}
