import fs from 'node:fs';
import path from 'node:path';

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

interface Options {
	base: string;
}

function readRasterDimensions(filePath: string): { width: number; height: number } | null {
	if (!fs.existsSync(filePath)) return null;

	const buf = fs.readFileSync(filePath);
	if (buf.length < 24) return null;

	if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') {
		return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
	}

	if (buf[0] === 0xff && buf[1] === 0xd8) {
		let offset = 2;
		while (offset < buf.length) {
			if (buf[offset] !== 0xff) break;
			const marker = buf[offset + 1];
			const length = buf.readUInt16BE(offset + 2);
			if (marker === 0xc0 || marker === 0xc2) {
				return {
					height: buf.readUInt16BE(offset + 5),
					width: buf.readUInt16BE(offset + 7),
				};
			}
			offset += 2 + length;
		}
	}

	return null;
}

function isWhitespaceText(node: HastNode): boolean {
	return node.type === 'text' && !String((node as HastText).value).trim();
}

export function paragraphOnlyContainsImg(element: HastElement): boolean {
	const children = element.children ?? [];
	const hasImg = children.some(
		(child) => child.type === 'element' && (child as HastElement).tagName === 'img',
	);
	if (!hasImg) return false;
	return children.every(
		(child) =>
			(child.type === 'element' && (child as HastElement).tagName === 'img') ||
			isWhitespaceText(child),
	);
}

function withBase(src: string, base: string): string {
	if (/^https?:\/\//i.test(src)) return src;
	const normalized = src.replace(/^\//, '');
	return `${base}${normalized}`;
}

function resolvePublicImagePath(src: string): string | null {
	const normalized = src.replace(/^\//, '');
	const match = normalized.match(/^blog\/(.+)$/i);
	if (!match) return null;
	return path.join(process.cwd(), 'public', 'blog', match[1]);
}

export function createFigureFromImage(img: HastElement, caption: string): HastElement {
	return {
		type: 'element',
		tagName: 'figure',
		properties: {},
		children: [
			{
				...img,
				properties: {
					...img.properties,
					alt: '',
				},
			},
			{
				type: 'element',
				tagName: 'figcaption',
				properties: {},
				children: [{ type: 'text', value: caption }],
			},
		],
	};
}

interface Replacement {
	parent: HastNode & { children: HastNode[] };
	index: number;
	node: HastElement;
}

function indexOfChild(parent: HastNode & { children: HastNode[] }, child: HastNode): number {
	return parent.children.indexOf(child);
}

function hasChildren(node: HastNode): node is HastNode & { children: HastNode[] } {
	return 'children' in node && Array.isArray(node.children);
}

function walk(
	node: HastNode,
	parent: HastNode | null,
	parentIndex: number,
	grandparent: HastNode | null,
	visitImage: (
		img: HastElement,
		parent: HastElement | null,
		parentIndex: number,
		grandparent: HastNode | null,
	) => void,
): void {
	if (node.type === 'element' && (node as HastElement).tagName === 'img') {
		visitImage(
			node as HastElement,
			parent?.type === 'element' ? (parent as HastElement) : null,
			parentIndex,
			grandparent,
		);
		return;
	}

	if (!hasChildren(node)) return;

	for (let i = 0; i < node.children.length; i++) {
		walk(node.children[i], node, i, parent, visitImage);
	}
}

export function rehypeBlogImages(options: Options) {
	const base = options.base.endsWith('/') ? options.base : `${options.base}/`;
	const replacements: Replacement[] = [];

	return (tree: HastNode) => {
		walk(tree, null, 0, null, (img, parent, parentIndex, grandparent): void => {
			const rawSrc = String(img.properties?.src ?? '');
			if (!rawSrc) return;

			const filePath = resolvePublicImagePath(rawSrc);
			const resolvedSrc = withBase(rawSrc, base);

			img.properties = {
				...img.properties,
				src: resolvedSrc,
				loading: img.properties?.loading ?? 'lazy',
				decoding: img.properties?.decoding ?? 'async',
			};

			if (filePath) {
				const dims = readRasterDimensions(filePath);
				if (dims) {
					img.properties.width = dims.width;
					img.properties.height = dims.height;
				}
			}

			const caption = String(img.properties?.alt ?? '').trim();
			if (!caption) return;

			const figure = createFigureFromImage(img, caption);

			if (
				parent?.tagName === 'p' &&
				paragraphOnlyContainsImg(parent) &&
				grandparent &&
				hasChildren(grandparent)
			) {
				replacements.push({
					parent: grandparent,
					index: indexOfChild(grandparent, parent),
					node: figure,
				});
				return;
			}

			if (parent && hasChildren(parent)) {
				replacements.push({ parent, index: parentIndex, node: figure });
			}
		});

		for (const { parent, index, node } of replacements) {
			parent.children[index] = node;
		}
	};
}
