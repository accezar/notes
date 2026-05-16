import { describe, expect, it } from 'vitest';
import {
	filterPostCards,
	filterTimelinePosts,
	shouldHideHomeLoadSentinel,
} from './home-post-timeline-logic';

function mockCard(searchText: string) {
	return {
		getAttribute(name: string) {
			return name === 'data-home-search' ? searchText : null;
		},
	};
}

const samplePosts = [
	{ searchText: 'astro islands architecture' },
	{ searchText: 'tailwind css tokens' },
	{ searchText: 'vitest unit tests' },
];

describe('filterTimelinePosts', () => {
	it('returns all posts when query is empty', () => {
		expect(filterTimelinePosts(samplePosts, '')).toHaveLength(3);
		expect(filterTimelinePosts(samplePosts, '   ')).toHaveLength(3);
	});

	it('filters case-insensitively by searchText', () => {
		const result = filterTimelinePosts(samplePosts, 'ASTRO');
		expect(result).toHaveLength(1);
		expect(result[0]?.searchText).toContain('astro');
	});
});

describe('filterPostCards', () => {
	const cards = [
		mockCard('astro islands architecture'),
		mockCard('tailwind css tokens'),
		mockCard('vitest unit tests'),
	];

	it('returns all cards when query is empty', () => {
		expect(filterPostCards(cards, '')).toHaveLength(3);
	});

	it('filters case-insensitively', () => {
		expect(filterPostCards(cards, 'graphql')).toHaveLength(0);
	});
});

describe('shouldHideHomeLoadSentinel', () => {
	it('hides when there are no results', () => {
		expect(shouldHideHomeLoadSentinel(0, 0)).toBe(true);
	});

	it('hides when all items are rendered', () => {
		expect(shouldHideHomeLoadSentinel(6, 6)).toBe(true);
	});

	it('shows when more items remain', () => {
		expect(shouldHideHomeLoadSentinel(3, 10)).toBe(false);
	});
});
