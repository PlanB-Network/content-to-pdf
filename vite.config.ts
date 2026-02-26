import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  resolve: {
    alias: {
      // Fix punycode.js resolution for edge bundler (esbuild neutral platform)
      'punycode.js': resolve('node_modules/punycode.js/punycode.es6.js')
    }
  },
  ssr: {
    // Force these packages to be bundled into SSR output (not left as externals)
    // so the OpenWorkers adapter doesn't need to re-resolve them
    noExternal: ['markdown-it', 'punycode.js']
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  }
});
