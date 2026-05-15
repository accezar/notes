export function estimateReadMinutesFromMarkdown(body: string): number {
	const stripped = body
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
		.replace(/\[[^\]]*]\([^)]*\)/g, '$1')
		.replace(/[#>*_|`~-]/g, ' ');
	const words = stripped
		.trim()
		.split(/\s+/)
		.filter(Boolean).length;
	return Math.max(1, Math.ceil(words / 220));
}
