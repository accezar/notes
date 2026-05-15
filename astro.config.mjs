// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
// Dev: base `/` → `http://localhost:4321/`. Produção: `base` `/blog/` (GitHub Pages em /blog/).
// `npm run build` define NODE_ENV=production (ver package.json). No CI, exporte NODE_ENV=production se precisar.
const base = process.env.NODE_ENV === 'production' ? '/blog' : '/';

export default defineConfig({
	site: 'https://accezar.github.io',
	base,
	trailingSlash: 'always',
	output: 'static',
	vite: {
		plugins: [tailwindcss()],
	},
});
