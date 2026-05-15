export function sitePath(relativePath: string): string {
	const base = import.meta.env.BASE_URL;
	const normalized = relativePath.replace(/^\/+/, '');
	if (!normalized) return base;
	return `${base}${normalized}`;
}
