export const SITE_NOTES_NAME = "Anna's Notes";

export const SITE_AUTHOR = {
	name: 'Anna',
	bio: 'Notas sobre engenharia de software, segurança e projetos pessoais.',
	githubUsername: 'accezar',
} as const;

export const SITE_SOCIAL = {
	github: `https://github.com/${SITE_AUTHOR.githubUsername}`,
	linkedin: 'https://www.linkedin.com/in/accezar',
	medium: 'https://medium.com/@annacezar',
} as const;

export const HOME_PAGE_META = {
	title: SITE_NOTES_NAME,
	description:
		'Notas sobre arquitetura, plataformas, segurança e engenharia de software.',
} as const;

export const TERMINAL_LOGO = {
	text: 'ANNA/NOTES/_',
	cycleMs: 5 * 60 * 1000,
	typeMs: 72,
	eraseMs: 48,
} as const;

export const SCROLL_TOP = {
	thresholdPx: 360,
} as const;

export const THEME_STORAGE = {
	lsKey: 'blog.color-scheme',
	legacyLsKey: 'theme',
	cookieKey: 'blog_theme',
} as const;
