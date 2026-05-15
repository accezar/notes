export function readingMinutesFromBody(body: string | undefined, wpm = 220): number {
	if (!body?.trim()) return 1;
	const words = body.trim().split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / wpm));
}
