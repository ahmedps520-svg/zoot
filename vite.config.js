import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const root = import.meta.dirname;
const pages = ['index', 'shop', 'product', 'studio', 'story', '404'];

/**
 * Tiny HTML include system: `<!-- @include header.html -->` is replaced with
 * the contents of /partials/header.html (recursively), in dev and build.
 */
function partials() {
  const include = (html, depth = 0) =>
    html.replace(/<!--\s*@include\s+([\w.-]+)\s*-->/g, (_, file) => {
      if (depth > 5) throw new Error(`Include depth exceeded at ${file}`);
      return include(readFileSync(resolve(root, 'partials', file), 'utf8'), depth + 1);
    });
  return {
    name: 'zooot-partials',
    transformIndexHtml: { order: 'pre', handler: (html) => include(html) },
    handleHotUpdate({ file, server }) {
      if (file.includes('/partials/')) server.ws.send({ type: 'full-reload' });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [partials()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        ...Object.fromEntries(pages.map((p) => [p, resolve(root, `${p}.html`)])),
        admin: resolve(root, 'admin/index.html'),
      },
    },
  },
});
