/** Reading time from markdown/plain body: ignores fenced code and common markup noise. */
export function readingMinutesFromBody(body: string | undefined, wpm = 220): number {
	if (!body?.trim()) return 1;
	const stripped = body
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
		.replace(/\[[^\]]*]\([^)]*\)/g, '$1')
		.replace(/[#>*_|`~-]/g, ' ');
	const words = stripped
		.trim()
		.split(/\s+/)
		.filter(Boolean).length;
	return Math.max(1, Math.ceil(words / wpm));
}
