import adapter from '@openworkers/adapter-sveltekit';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    inlineStyleThreshold: Number.POSITIVE_INFINITY,
    adapter: adapter({
      functions: true,
      debug: {
        prettier: true,
        errors: true
      }
    })
  }
};

export default config;
