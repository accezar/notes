import { describe, expect, it } from 'vitest';
import { readingMinutesFromBody } from './reading-time';

describe('readingMinutesFromBody', () => {
	it('returns at least 1 for empty body', () => {
		expect(readingMinutesFromBody('')).toBe(1);
		expect(readingMinutesFromBody(undefined)).toBe(1);
	});

	it('ignores fenced code blocks when counting words', () => {
		const body = 'Hello world ' + 'word '.repeat(400) + '\n```\n' + 'x '.repeat(500) + '\n```';
		const withCode = readingMinutesFromBody(body);
		const withoutCode = readingMinutesFromBody('Hello world ' + 'word '.repeat(400));
		expect(withCode).toBe(withoutCode);
	});

	it('rounds up minutes from word count', () => {
		const words = Array.from({ length: 440 }, (_, i) => `w${i}`).join(' ');
		expect(readingMinutesFromBody(words, 220)).toBe(2);
	});
});
