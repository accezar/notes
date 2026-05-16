import type { CollectionEntry } from 'astro:content';
import type { HomeTimelinePost } from '../types/blog';
import { SITE_AUTHOR } from '../data/variables';
import { formatDatePt } from './format-date';
import { readingMinutesFromBody } from './reading-time';
import { authorAbbrevLine, visibleTopicsForCard } from './post-card-display';
import { sitePath } from './site-path';

export function toHomeTimelinePosts(
	byYear: [year: number, posts: CollectionEntry<'blog'>[]][],
): HomeTimelinePost[] {
	const authorName = SITE_AUTHOR.name;
	const authorLine = authorAbbrevLine(authorName);

	return byYear.flatMap(([, posts]) =>
		posts.map((post) => {
			const { title, description, date, category, topics, thumbnail: thumbnailRaw } =
				post.data;
			const thumbnail = thumbnailRaw?.trim() || '';
			const href = sitePath(`${post.id}/`);
			const rawBody = typeof post.body === 'string' ? post.body : '';
			const readMin = readingMinutesFromBody(rawBody || undefined);
			const visibleTopics = visibleTopicsForCard(topics);
			const dateFormatted = formatDatePt(date);

			const searchText = [
				title,
				description,
				category,
				...(topics ?? []),
				post.id,
				authorName,
				authorLine,
				dateFormatted,
			]
				.join(' ')
				.replace(/\s+/g, ' ')
				.trim();

			return {
				id: post.id,
				title,
				description,
				href,
				thumbnail,
				searchText,
				readMin,
				visibleTopics,
				authorLine,
				dateIso: date.toISOString(),
				dateFormatted,
			};
		}),
	);
}
