const CODE_BLOCK_LABELS: Record<string, string> = {
	bash: 'Bash',
	css: 'CSS',
	html: 'HTML',
	http: 'HTTP',
	javascript: 'JavaScript',
	js: 'JavaScript',
	json: 'JSON',
	markdown: 'Markdown',
	md: 'Markdown',
	mdx: 'MDX',
	mermaid: 'Mermaid',
	plaintext: 'Texto',
	python: 'Python',
	shell: 'Shell',
	svelte: 'Svelte',
	ts: 'TypeScript',
	tsx: 'TSX',
	typescript: 'TypeScript',
	yaml: 'YAML',
};

export function codeBlockLabel(language: string): string {
	const key = language.trim().toLowerCase();
	if (CODE_BLOCK_LABELS[key]) return CODE_BLOCK_LABELS[key];
	if (!key) return 'Código';
	return key.charAt(0).toUpperCase() + key.slice(1);
}
