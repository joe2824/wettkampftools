import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // Reine Seitenanwendung: Tauri liefert die statischen Dateien aus.
    adapter: adapter({ fallback: "index.html" }),
    // "hash": ohne Server gibt es keinen Nonce je Anfrage.
    csp: {
      mode: "hash",
      directives: {
        "script-src": ["self"]
      }
    }
  }
};

export default config;
