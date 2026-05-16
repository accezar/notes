import { afterEach, describe, expect, it } from 'vitest';
import { normalizeTheme, readStoredTheme } from './theme-persistence';
import { THEME_STORAGE } from '../data/variables';

describe('normalizeTheme', () => {
	it('accepts light and dark', () => {
		expect(normalizeTheme('light')).toBe('light');
		expect(normalizeTheme('DARK')).toBe('dark');
	});

	it('rejects invalid values', () => {
		expect(normalizeTheme('auto')).toBeNull();
		expect(normalizeTheme(null)).toBeNull();
		expect(normalizeTheme(undefined)).toBeNull();
	});
});

describe('readStoredTheme', () => {
	afterEach(() => {
		localStorage.clear();
	});

	it('reads primary localStorage key', () => {
		localStorage.setItem(THEME_STORAGE.lsKey, 'dark');
		expect(readStoredTheme()).toBe('dark');
	});

	it('falls back to legacy key', () => {
		localStorage.setItem(THEME_STORAGE.legacyLsKey, 'light');
		expect(readStoredTheme()).toBe('light');
	});
});
