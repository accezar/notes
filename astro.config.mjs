// @ts-check
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { rehypeBlogImages } from './src/utils/rehype-blog-images.ts';
import { rehypeWrapCodeBlocks } from './src/utils/rehype-wrap-code-blocks.ts';
import { remarkHttpAnnotations } from './src/utils/remark-http-annotations.ts';

const base = process.env.NODE_ENV === 'production' ? '/notes' : '/';

export default defineConfig({
	site: 'https://accezar.github.io',
	base,
	trailingSlash: 'always',
	output: 'static',
	integrations: [react()],
	markdown: {
		shikiConfig: {
			themes: {
				light: 'github-light',
				dark: 'github-dark',
			},
			defaultColor: false,
			wrap: true,
			langAlias: {
				cjs: 'javascript',
				HTML: 'html',
			},
		},
		remarkPlugins: [remarkHttpAnnotations],
		rehypePlugins: [[rehypeBlogImages, { base }], rehypeWrapCodeBlocks],
	},
	vite: {
		plugins: [tailwindcss()],
	},
});
