import { SCROLL_TOP } from '../data/variables';
import { onDomReady } from './dom-ready';

export function attachScrollTop(): void {
	const bind = (): void => {
		const btn = document.querySelector<HTMLButtonElement>('[data-scroll-top]');
		if (!btn) return;

		const setVisible = (): void => {
			const y = window.scrollY || document.documentElement.scrollTop;
			btn.classList.toggle('scroll-top--visible', y > SCROLL_TOP.thresholdPx);
		};

		window.addEventListener('scroll', setVisible, { passive: true });
		setVisible();

		btn.addEventListener('click', () => {
			const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
			btn.focus({ preventScroll: true });
		});
	};

	onDomReady(bind);
}
