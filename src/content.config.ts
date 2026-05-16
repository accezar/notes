import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		date: z.coerce.date(),
		category: z.string(),
		topics: z.array(z.string()),
		draft: z.boolean().optional().default(false),
		toc: z.boolean().optional().default(false),
		tocMinDepth: z.number().int().min(2).max(6).optional().default(2),
		tocMaxDepth: z.number().int().min(2).max(6).optional().default(6),
		thumbnail: z.string().optional(),
	}),
});

export const collections = { blog };
