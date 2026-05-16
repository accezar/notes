export const HOME_POST_TIMELINE_BATCH_SIZE = 6;

export interface HomePostSearchable {
	searchText: string;
}

export interface HomePostSearchCard {
	getAttribute(name: string): string | null;
}

export function filterTimelinePosts<T extends HomePostSearchable>(
	posts: readonly T[],
	query: string,
): T[] {
	const q = query.trim().toLowerCase();
	if (!q) return [...posts];
	return posts.filter((post) => post.searchText.toLowerCase().includes(q));
}

/** @deprecated Prefer filterTimelinePosts with HomeTimelinePost.searchText */
export function filterPostCards<T extends HomePostSearchCard>(
	cards: readonly T[],
	query: string,
): T[] {
	const q = query.trim().toLowerCase();
	if (!q) return [...cards];
	return cards.filter((card) =>
		(card.getAttribute('data-home-search') || '').toLowerCase().includes(q),
	);
}

export function shouldHideHomeLoadSentinel(
	renderedCount: number,
	filteredLength: number,
): boolean {
	return filteredLength === 0 || renderedCount >= filteredLength;
}
