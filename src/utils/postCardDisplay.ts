export function visibleTopicsForCard(topics: string[] | undefined, limit = 2): string[] {
	return (topics ?? []).map((t) => t.trim()).filter(Boolean).slice(0, limit);
}

export function authorAbbrevLine(fullName: string): string {
	const parts = fullName.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return '?';
	if (parts.length === 1) return parts[0].toUpperCase();
	const last = parts[parts.length - 1];
	return `${parts[0].toUpperCase()} ${last[0]?.toUpperCase() ?? ''}.`;
}
