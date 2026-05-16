import type { HomeTimelinePost } from '../../types/blog';

function tagTone(tag: string): string {
	const i = [...tag].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 4;
	const tones = ['purple', 'green', 'orange', 'neutral'] as const;
	return tones[i] ?? 'neutral';
}

function TagBadge({ tag }: { tag: string }) {
	return <span className={`tag-badge tag-badge--${tagTone(tag)}`}>{tag}</span>;
}

interface Props {
	post: HomeTimelinePost;
}

export function HomePostCard({ post }: Props) {
	const topics =
		post.visibleTopics.length > 0 ? post.visibleTopics : (['NOTA'] as const);

	return (
		<a className="home-post-card" href={post.href} id={`post-${post.id}`}>
			<span className="home-post-card__corner home-post-card__corner--tl" aria-hidden="true" />
			<span className="home-post-card__corner home-post-card__corner--br" aria-hidden="true" />

			<div className="home-post-card__media" aria-hidden={post.thumbnail ? undefined : true}>
				{post.thumbnail ? (
					<img
						className="home-post-card__image"
						src={post.thumbnail}
						alt=""
						loading="lazy"
						decoding="async"
					/>
				) : (
					<span className="home-post-card__media-fallback">NO IMAGE</span>
				)}
			</div>

			<div className="home-post-card__body">
				<div className="home-post-card__meta">
					<div className="home-post-card__tags">
						{topics.map((topic) => (
							<TagBadge key={topic} tag={topic} />
						))}
					</div>
					<span className="home-post-card__read">{post.readMin} Min</span>
				</div>

				<h2 className="home-post-card__title">{post.title}</h2>
				<p className="home-post-card__deck">{post.description}</p>

				<div className="home-post-card__rule" aria-hidden="true" />

				<div className="home-post-card__foot">
					<span className="home-post-card__author">{post.authorLine}</span>
					<span className="home-post-card__foot-sep" aria-hidden="true">
						|
					</span>
					<time className="home-post-card__date" dateTime={post.dateIso}>
						{post.dateFormatted}
					</time>
				</div>
			</div>
		</a>
	);
}
