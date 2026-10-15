// Vite-Plugin: schreibt beim Build die Lizenzhinweise aller Fremdpakete neben die Anwendung.
// npm: nur Pakete, deren Code im Client-Bundle landet. Rust: Crates aus `cargo metadata`.
import { buildNotices, packageDirFromModuleId, readCargoPackages, readNpmPackage } from "./generate-licenses.mjs";

export const NOTICES_FILE = "third-party-licenses.json";

/**
 * @param {{ rustManifestDir: string, requireRust: boolean, cssPackageDirs: string[] }} options
 *   cssPackageDirs: Pakete, deren CSS über Tailwind ins Bundle kommt und daher in keinem Chunk auftaucht.
 * @returns {import("vite").Plugin}
 */
export function thirdPartyLicenses({ rustManifestDir, requireRust, cssPackageDirs }) {
	let serverBuild = false;
	return {
		name: "third-party-licenses",
		apply: "build",
		configResolved(config) {
			serverBuild = Boolean(config.build.ssr);
		},
		generateBundle(_options, bundle) {
			if (serverBuild) return;
			const npm = collectNpmPackages(bundle, cssPackageDirs);
			const cargo = readCargoPackages(rustManifestDir);
			if (!cargo && requireRust) {
				this.error("Rust-Lizenzen fehlen: `cargo metadata` ist hier nicht verfügbar.");
			}
			const notices = buildNotices({ npm, cargo });
			this.emitFile({ type: "asset", fileName: NOTICES_FILE, source: JSON.stringify(notices) });
			const rust = cargo ? `${cargo.length} Rust-Crates` : "Rust nicht verfügbar";
			this.info(`${NOTICES_FILE}: ${npm.length} npm-Pakete, ${rust}, ${notices.texts.length} Texte`);
		}
	};
}

/** npm-Pakete mit mindestens einem tatsächlich gebündelten Modul, je Name und Version einmal. */
function collectNpmPackages(/** @type {import("rollup").OutputBundle} */ bundle, /** @type {string[]} */ extraDirs) {
	const dirs = new Set(extraDirs);
	for (const output of Object.values(bundle)) {
		if (output.type !== "chunk") continue;
		for (const [id, module] of Object.entries(output.modules)) {
			const dir = packageDirFromModuleId(id);
			if (dir && module.renderedLength > 0) dirs.add(dir);
		}
	}
	const byKey = new Map();
	for (const dir of dirs) {
		const pkg = readNpmPackage(dir);
		byKey.set(`${pkg.name}@${pkg.version}`, pkg);
	}
	return [...byKey.values()];
}
