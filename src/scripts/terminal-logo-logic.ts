export interface TerminalLogoConfig {
	text: string;
	cycleMs: number;
	typeMs: number;
	eraseMs: number;
}

export function parseTerminalLogoConfig(el: HTMLElement): TerminalLogoConfig | null {
	const text = el.dataset.terminalLogoText;
	if (!text) return null;

	const cycleMs = Number(el.dataset.terminalLogoCycleMs);
	const typeMs = Number(el.dataset.terminalLogoTypeMs);
	const eraseMs = Number(el.dataset.terminalLogoEraseMs);

	if (!Number.isFinite(cycleMs) || !Number.isFinite(typeMs) || !Number.isFinite(eraseMs)) {
		return null;
	}

	return { text, cycleMs, typeMs, eraseMs };
}

export function renderTerminalLogoChars(el: HTMLElement, logoText: string, len: number): void {
	if (len <= 0) {
		el.textContent = '';
		return;
	}
	if (len >= logoText.length) {
		const base = logoText.slice(0, -1);
		const last = logoText.charAt(logoText.length - 1);
		el.innerHTML = `${base}<span class="terminal-logo__blink">${last}</span>`;
		return;
	}
	el.textContent = logoText.slice(0, len);
}
