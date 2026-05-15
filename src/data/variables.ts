export const SITE_NOTES_NAME = "Anna's Notes";

export const SITE_AUTHOR = {
	name: 'Anna',
	bio: 'Notas sobre arquitetura, plataformas, segurança e engenharia de software.',
	githubUsername: 'accezar',
} as const;

export const HOME_PAGE_META = {
	title: SITE_NOTES_NAME,
	description:
		'Notas sobre arquitetura, plataformas, segurança e engenharia de software.',
} as const;

export const SOBRE_PAGE = {
	title: `Sobre · ${SITE_NOTES_NAME}`,
	description: 'Interesses e propósito deste blog de estudos técnicos.',
	lead:
		'Olá — sou a Anna (nome genérico para este template). Trabalho com software e gosto de deixar rastros legíveis do que estou aprendendo.',
	interests: [
		'Software Architecture',
		'Cloud Computing',
		'Application Security',
		'Frontend Engineering',
		'Code Patterns',
		'AI-assisted Development',
	] as const,
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
