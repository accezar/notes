import { getCollection, getEntry, render } from 'astro:content';
import {
	getSortedPublishedBlog,
	groupPostsByYear,
	uniqueYearsDesc,
	uniqueSortedTopics,
	uniqueCategoryLabels,
	firstPostIdByTopic,
	firstPostIdByCategory,
} from './blogPosts';
import { SITE_AUTHOR, SITE_NOTES_NAME } from '../data/variables';
import { sitePath } from './sitePath';

export function canonicalUrl(site: URL | undefined, pathname: string): string | undefined {
	if (!site) return undefined;
	return new URL(pathname, site).href;
}

export function currentYear(): number {
	return new Date().getFullYear();
}

export function homePostAnchor(postId: string): string {
	return `${sitePath('')}#post-${postId}`;
}

export function homeYearAnchor(year: number): string {
	return `${sitePath('')}#ano-${year}`;
}

export function githubAvatarUrl(username: string, size = 160): string {
	return `https://github.com/${username}.png?size=${size}`;
}

export function pageTitleWithBrand(title: string): string {
	return `${title} · ${SITE_NOTES_NAME}`;
}

export async function getBlogStaticPaths() {
	const posts = await getCollection('blog', ({ data }) => !data.draft);
	return posts.map((post) => ({ params: { slug: post.id } }));
}

export async function renderBlogPostBySlug(slug: string | undefined) {
	if (!slug) throw new Error('Missing slug');
	const post = await getEntry('blog', slug);
	if (!post) throw new Error(`Unknown post: ${slug}`);
	const { Content } = await render(post);
	return { post, Content };
}

export async function loadHomePageModel() {
	const published = await getSortedPublishedBlog();
	return {
		published,
		years: uniqueYearsDesc(published),
		categories: uniqueCategoryLabels(published),
		topics: uniqueSortedTopics(published),
		byYear: groupPostsByYear(published),
		postIdByTopic: Object.fromEntries(firstPostIdByTopic(published)),
		postIdByCategory: Object.fromEntries(firstPostIdByCategory(published)),
		authorName: SITE_AUTHOR.name,
		authorBio: SITE_AUTHOR.bio,
		authorAvatarUrl: githubAvatarUrl(SITE_AUTHOR.githubUsername),
	};
}
