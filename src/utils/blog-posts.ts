import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export async function getSortedPublishedBlog(): Promise<CollectionEntry<'blog'>[]> {
	const published = await getCollection('blog', ({ data }) => !data.draft);
	published.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
	return published;
}

export function groupPostsByYear(
	posts: CollectionEntry<'blog'>[],
): [year: number, posts: CollectionEntry<'blog'>[]][] {
	const map = new Map<number, CollectionEntry<'blog'>[]>();
	for (const p of posts) {
		const y = p.data.date.getFullYear();
		const list = map.get(y);
		if (list) list.push(p);
		else map.set(y, [p]);
	}
	return [...map.entries()].sort((a, b) => b[0] - a[0]);
}

export function uniqueYearsDesc(posts: CollectionEntry<'blog'>[]): number[] {
	return [...new Set(posts.map((p) => p.data.date.getFullYear()))].sort((a, b) => b - a);
}

export function uniqueSortedTopics(posts: CollectionEntry<'blog'>[]): string[] {
	return [...new Set(posts.flatMap((p) => p.data.topics))].sort((a, b) =>
		a.localeCompare(b, 'pt', { sensitivity: 'base' }),
	);
}

export function uniqueCategoryLabels(posts: CollectionEntry<'blog'>[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const p of posts) {
		const category = p.data.category?.trim();
		if (category && !seen.has(category)) {
			seen.add(category);
			out.push(category);
		}
	}
	return out;
}

export function firstPostIdByTopic(posts: CollectionEntry<'blog'>[]): Map<string, string> {
	const m = new Map<string, string>();
	for (const p of posts) {
		for (const t of p.data.topics) {
			if (!m.has(t)) m.set(t, p.id);
		}
	}
	return m;
}

export function firstPostIdByCategory(posts: CollectionEntry<'blog'>[]): Map<string, string> {
	const m = new Map<string, string>();
	for (const p of posts) {
		const c = p.data.category?.trim();
		if (c && !m.has(c)) m.set(c, p.id);
	}
	return m;
}
