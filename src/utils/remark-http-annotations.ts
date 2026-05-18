import { visit } from 'unist-util-visit';

/** HTML-style inline notes are not HTTP comments for Shiki; map them to `#` lines. */
export function normalizeHttpInlineAnnotations(source: string): string {
	return source
		.replace(/^(.+?)\s+<!--\s*(.+?)\s*-->\s*$/gm, '$1\n# $2')
		.replace(/^\s*<!--\s*(.+?)\s*-->\s*$/gm, '# $1');
}

export function remarkHttpAnnotations() {
	return (tree: Parameters<typeof visit>[0]) => {
		visit(tree, 'code', (node) => {
			if (!node.lang || !/^http$/i.test(node.lang)) return;
			node.value = normalizeHttpInlineAnnotations(node.value);
		});
	};
}
