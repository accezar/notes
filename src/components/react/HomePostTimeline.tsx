import { useCallback, useEffect, useRef, useState } from 'react';
import type { HomeTimelinePost } from '../../types/blog';
import {
	filterTimelinePosts,
	HOME_POST_TIMELINE_BATCH_SIZE,
	shouldHideHomeLoadSentinel,
} from '../../scripts/home-post-timeline-logic';
import { HomePostCard } from './HomePostCard';

interface Props {
	posts: HomeTimelinePost[];
}

export default function HomePostTimeline({ posts }: Props) {
	const [query, setQuery] = useState('');
	const [renderedCount, setRenderedCount] = useState(() =>
		Math.min(HOME_POST_TIMELINE_BATCH_SIZE, posts.length),
	);
	const sentinelRef = useRef<HTMLDivElement>(null);

	const filteredPosts = filterTimelinePosts(posts, query);
	const visiblePosts = filteredPosts.slice(0, renderedCount);
	const showEmpty = filteredPosts.length === 0;
	const hideSentinel = shouldHideHomeLoadSentinel(renderedCount, filteredPosts.length);

	const renderBatch = useCallback(() => {
		setRenderedCount((count) => {
			if (count >= filteredPosts.length) return count;
			return Math.min(count + HOME_POST_TIMELINE_BATCH_SIZE, filteredPosts.length);
		});
	}, [filteredPosts.length]);

	useEffect(() => {
		setRenderedCount(Math.min(HOME_POST_TIMELINE_BATCH_SIZE, filteredPosts.length));
	}, [filteredPosts]);

	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel || hideSentinel) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					renderBatch();
				}
			},
			{ rootMargin: '240px 0px' },
		);

		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [hideSentinel, renderBatch, filteredPosts.length]);

	return (
		<div className="home-timeline">
			<div className="home-timeline__search">
				<label htmlFor="home-post-search" className="sr-only">
					Buscar notas
				</label>
				<div className="home-search">
					<span className="home-search__icon-wrap" aria-hidden="true">
						<svg
							className="home-search__icon"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<circle cx="11" cy="11" r="7" />
							<path d="m21 21-4.3-4.3" />
						</svg>
					</span>
					<input
						id="home-post-search"
						type="search"
						name="q"
						autoComplete="off"
						placeholder="Buscar…"
						className="home-search__input"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onSearch={(e) => setQuery(e.currentTarget.value)}
					/>
				</div>
			</div>

			<section aria-label="Listagem de artigos">
				<div className="post-list--home">
					{visiblePosts.map((post) => (
						<HomePostCard key={post.id} post={post} />
					))}
				</div>
				<div
					ref={sentinelRef}
					className="home-load-sentinel"
					aria-hidden="true"
					hidden={hideSentinel}
				/>
				{showEmpty ? (
					<p className="home-empty-search">Nenhum resultado para esta busca.</p>
				) : null}
			</section>
		</div>
	);
}
