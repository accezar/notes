import { describe, expect, it } from 'vitest';
import { parseTerminalLogoConfig, renderTerminalLogoChars } from './terminal-logo-logic';

describe('parseTerminalLogoConfig', () => {
	it('returns config when dataset is valid', () => {
		const el = document.createElement('div');
		el.dataset.terminalLogoText = 'ANNA/NOTES/_';
		el.dataset.terminalLogoCycleMs = '300000';
		el.dataset.terminalLogoTypeMs = '72';
		el.dataset.terminalLogoEraseMs = '48';

		expect(parseTerminalLogoConfig(el)).toEqual({
			text: 'ANNA/NOTES/_',
			cycleMs: 300000,
			typeMs: 72,
			eraseMs: 48,
		});
	});

	it('returns null when text is missing', () => {
		const el = document.createElement('div');
		el.dataset.terminalLogoCycleMs = '1';
		el.dataset.terminalLogoTypeMs = '1';
		el.dataset.terminalLogoEraseMs = '1';

		expect(parseTerminalLogoConfig(el)).toBeNull();
	});

	it('returns null when timing values are invalid', () => {
		const el = document.createElement('div');
		el.dataset.terminalLogoText = 'X';
		el.dataset.terminalLogoCycleMs = 'nope';

		expect(parseTerminalLogoConfig(el)).toBeNull();
	});
});

describe('renderTerminalLogoChars', () => {
	it('clears content when len is 0', () => {
		const el = document.createElement('span');
		el.textContent = 'old';
		renderTerminalLogoChars(el, 'AB', 0);
		expect(el.textContent).toBe('');
	});

	it('renders partial text without blink', () => {
		const el = document.createElement('span');
		renderTerminalLogoChars(el, 'ABCD', 2);
		expect(el.textContent).toBe('AB');
		expect(el.querySelector('.terminal-logo__blink')).toBeNull();
	});

	it('renders blink on last character at full length', () => {
		const el = document.createElement('span');
		renderTerminalLogoChars(el, 'AB', 2);
		expect(el.textContent).toContain('A');
		expect(el.querySelector('.terminal-logo__blink')?.textContent).toBe('B');
	});
});
