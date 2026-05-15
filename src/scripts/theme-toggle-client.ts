import { persistTheme } from './theme-persistence';

export function applyTheme(theme: 'light' | 'dark'): void {
	persistTheme(theme);
}

export function attachThemeToggleListeners(): void {
	const bind = (): void => {
		document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
			btn.addEventListener('click', () => {
				const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
				applyTheme(next);
			});
		});
	};
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', bind, { once: true });
	} else {
		bind();
	}
}
