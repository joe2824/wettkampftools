// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {}

	/** Versionsnummer aus package.json, beim Bauen eingesetzt. */
	const __APP_VERSION__: string;
}

export {};
