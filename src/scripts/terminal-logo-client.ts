import { onDomReady } from './dom-ready';
import {
	parseTerminalLogoConfig,
	renderTerminalLogoChars,
	type TerminalLogoConfig,
} from './terminal-logo-logic';

const LOGO_SELECTOR = 'a.terminal-logo';
const CHARS_SELECTOR = '.terminal-logo__chars';

function runLogoCycle(
	anchor: HTMLElement,
	charsEl: HTMLElement,
	config: TerminalLogoConfig,
): void {
	const { text: logoText, cycleMs, typeMs, eraseMs } = config;
	let pos = 0;
	let cycleTimer: ReturnType<typeof setTimeout> | undefined;

	const clearCycleTimer = (): void => {
		if (cycleTimer !== undefined) {
			clearTimeout(cycleTimer);
			cycleTimer = undefined;
		}
	};

	const scheduleNextCycle = (): void => {
		clearCycleTimer();
		cycleTimer = setTimeout(() => {
			eraseThenType();
		}, cycleMs);
	};

	const eraseThenType = (): void => {
		const stepErase = (): void => {
			if (pos <= 0) {
				typeForward();
				return;
			}
			pos -= 1;
			renderTerminalLogoChars(charsEl, logoText, pos);
			setTimeout(stepErase, eraseMs);
		};

		pos = logoText.length;
		renderTerminalLogoChars(charsEl, logoText, pos);
		setTimeout(stepErase, eraseMs);
	};

	const typeForward = (): void => {
		const stepType = (): void => {
			pos += 1;
			renderTerminalLogoChars(charsEl, logoText, pos);
			if (pos >= logoText.length) {
				scheduleNextCycle();
				return;
			}
			setTimeout(stepType, typeMs);
		};
		pos = 0;
		charsEl.textContent = '';
		setTimeout(stepType, typeMs);
	};

	typeForward();

	anchor.addEventListener(
		'astro:before-preparation',
		() => {
			clearCycleTimer();
		},
		{ once: true },
	);
}

function initTerminalLogo(): void {
	const anchor = document.querySelector<HTMLElement>(LOGO_SELECTOR);
	const charsEl = anchor?.querySelector<HTMLElement>(CHARS_SELECTOR);
	if (!anchor || !charsEl) return;

	const config = parseTerminalLogoConfig(anchor);
	if (!config) return;

	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		renderTerminalLogoChars(charsEl, config.text, config.text.length);
		return;
	}

	runLogoCycle(anchor, charsEl, config);
}

export function attachTerminalLogo(): void {
	onDomReady(initTerminalLogo);
}
