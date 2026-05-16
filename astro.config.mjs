// @ts-check
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

const base = process.env.NODE_ENV === 'production' ? '/notes' : '/';

export default defineConfig({
	site: 'https://accezar.github.io',
	base,
	trailingSlash: 'always',
	output: 'static',
	integrations: [react()],
	vite: {
		plugins: [tailwindcss()],
	},
});
