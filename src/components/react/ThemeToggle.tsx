import { persistTheme } from '../../scripts/theme-persistence';

export default function ThemeToggle() {
	const handleClick = () => {
		const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
		persistTheme(next);
	};

	return (
		<button
			type="button"
			className="theme-toggle"
			aria-label="Alternar tema claro ou escuro"
			onClick={handleClick}
		>
			<span className="sr-only">Alternar tema</span>
			<svg
				className="theme-toggle__icon theme-toggle__icon--sun"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="4" />
				<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
			</svg>
			<svg
				className="theme-toggle__icon theme-toggle__icon--moon"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
			</svg>
		</button>
	);
}
