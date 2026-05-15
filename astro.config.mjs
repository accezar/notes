// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

const base = process.env.NODE_ENV === 'production' ? '/notes' : '/';

export default defineConfig({
	site: 'https://accezar.github.io',
	base,
	trailingSlash: 'always',
	output: 'static',
	vite: {
		plugins: [tailwindcss()],
	},
});
