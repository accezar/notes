import { codeBlockLabel } from './code-block-label';

interface HastText {
	type: 'text';
	value: string;
}

interface HastElement {
	type: 'element';
	tagName: string;
	properties?: Record<string, unknown>;
	children?: HastNode[];
}

type HastNode = HastElement | HastText | { type: string; children?: HastNode[] };

function hasChildren(node: HastNode): node is HastNode & { children: HastNode[] } {
	return 'children' in node && Array.isArray(node.children);
}

function classNameString(className: unknown): string {
	if (typeof className === 'string') return className;
	if (Array.isArray(className)) {
		return className.filter((value): value is string => typeof value === 'string').join(' ');
	}
	return '';
}

function blockLanguage(pre: HastElement): string {
	const fromData =
		pre.properties?.dataLanguage ?? pre.properties?.['data-language'] ?? pre.properties?.data_language;
	return String(fromData ?? 'plaintext');
}

export function createCodeBlockWrapper(pre: HastElement, language: string): HastElement {
	return {
		type: 'element',
		tagName: 'div',
		properties: {
			class: 'code-block',
			'data-code-block': '',
		},
		children: [
			{
				type: 'element',
				tagName: 'div',
				properties: { class: 'code-block__header' },
				children: [
					{
						type: 'element',
						tagName: 'span',
						properties: { class: 'code-block__lang' },
						children: [{ type: 'text', value: codeBlockLabel(language) }],
					},
					{
						type: 'element',
						tagName: 'button',
						properties: {
							type: 'button',
							class: 'code-block__copy',
							'data-code-copy': '',
							'aria-label': 'Copiar código',
						},
						children: [
							{
								type: 'element',
								tagName: 'span',
								properties: { class: 'code-block__copy-label' },
								children: [{ type: 'text', value: 'Copiar' }],
							},
						],
					},
				],
			},
			{
				type: 'element',
				tagName: 'div',
				properties: { class: 'code-block__panel' },
				children: [pre],
			},
		],
	};
}

interface Replacement {
	parent: HastNode & { children: HastNode[] };
	index: number;
	node: HastElement;
}

function walk(
	node: HastNode,
	parent: HastNode | null,
	parentIndex: number,
	onPre: (pre: HastElement, parent: HastNode & { children: HastNode[] }, index: number) => void,
): void {
	if (node.type === 'element' && (node as HastElement).tagName === 'pre') {
		const pre = node as HastElement;
		if (parent && hasChildren(parent)) {
			onPre(pre, parent, parentIndex);
		}
		return;
	}

	if (!hasChildren(node)) return;

	for (let i = 0; i < node.children.length; i++) {
		walk(node.children[i], node, i, onPre);
	}
}

export function rehypeWrapCodeBlocks() {
	const replacements: Replacement[] = [];

	return (tree: HastNode) => {
		walk(tree, null, 0, (pre, parent, index) => {
			if (!classNameString(pre.properties?.class).includes('astro-code')) return;

			const language = blockLanguage(pre);
			if (language === 'mermaid') return;

			replacements.push({
				parent,
				index,
				node: createCodeBlockWrapper(pre, language),
			});
		});

		for (const { parent, index, node } of replacements) {
			parent.children[index] = node;
		}
	};
}
