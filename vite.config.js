import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { thirdPartyLicenses } from "./scripts/licenses-plugin.mjs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8"));

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		// Release-Builds müssen die Rust-Lizenzen enthalten (siehe release.yml).
		thirdPartyLicenses({
			rustManifestDir: fileURLToPath(new URL("./src-tauri", import.meta.url)),
			requireRust: process.env.REQUIRE_RUST_LICENSES === "1",
			cssPackageDirs: ["tailwindcss", "tw-animate-css"].map((name) =>
				fileURLToPath(new URL(`./node_modules/${name}`, import.meta.url))
			)
		})
	],
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version ?? "")
	},
	// Tauri erwartet einen festen Port und eigene Fehlerausgaben.
	clearScreen: false,
	server: {
		port: 1420,
		strictPort: true,
		host: host || false,
		hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
		watch: { ignored: ["**/src-tauri/**"] }
	}
});
