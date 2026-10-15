import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8"));

export default defineConfig({
	plugins: [svelte({ hot: false })],
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version ?? "")
	},
	resolve: {
		conditions: ["browser"],
		alias: {
			$lib: fileURLToPath(new URL("./src/lib", import.meta.url))
		}
	},
	test: {
		environment: "node",
		include: ["src/**/*.test.ts"],
		// Feste Zeitzone, in der das Programm läuft.
		env: { TZ: process.env.TZ ?? "Europe/Berlin" },
		passWithNoTests: true,
		coverage: {
			provider: "v8",
			include: ["src/lib/**/*.ts"],
			exclude: ["src/lib/components/ui/**", "src/lib/testing/**", "src/**/*.test.ts", "src/**/*.svelte"]
		}
	}
});
