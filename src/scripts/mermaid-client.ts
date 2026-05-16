import { onDomReady } from './dom-ready';

const WRAP_CLASS = 'post-article__mermaid-wrap';
const ARTICLE_MAIN = '.post-article__main';

function diagramSourceToBase64(text: string): string {
	const utf8Bytes = new TextEncoder().encode(text);
	const utf8Str = Array.from(utf8Bytes, (byte) => String.fromCodePoint(byte)).join('');
	return btoa(utf8Str);
}

function diagramSourceFromBase64(b64: string): string {
	const bin = atob(b64);
	const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
	return new TextDecoder().decode(bytes);
}

function mermaidTheme(): 'default' | 'dark' {
	return document.documentElement.classList.contains('dark') ? 'dark' : 'default';
}

function prepareMermaidBlocks(root: ParentNode): boolean {
	let count = 0;
	root.querySelectorAll(`${ARTICLE_MAIN} pre[data-language="mermaid"]`).forEach((pre) => {
		if (pre.closest(`.${WRAP_CLASS}`)) return;
		const source = (pre.textContent ?? '').trim();
		if (!source) return;
		const wrap = document.createElement('div');
		wrap.className = WRAP_CLASS;
		wrap.setAttribute('data-mermaid-source', diagramSourceToBase64(source));
		const graph = document.createElement('div');
		graph.className = 'mermaid';
		graph.textContent = source;
		wrap.appendChild(graph);
		pre.replaceWith(wrap);
		count += 1;
	});
	return count > 0;
}

function resetDiagramsForRerender(): void {
	document.querySelectorAll(`${ARTICLE_MAIN} .${WRAP_CLASS}`).forEach((wrap) => {
		const b64 = wrap.getAttribute('data-mermaid-source');
		if (!b64) return;
		let graph = wrap.querySelector<HTMLDivElement>('.mermaid');
		if (!graph) {
			graph = document.createElement('div');
			graph.className = 'mermaid';
			wrap.appendChild(graph);
		}
		graph.removeAttribute('data-processed');
		graph.textContent = diagramSourceFromBase64(b64);
	});
}

async function runMermaid(): Promise<void> {
	const mermaid = (await import('mermaid')).default;
	mermaid.initialize({
		startOnLoad: false,
		theme: mermaidTheme(),
		securityLevel: 'strict',
		fontFamily: 'var(--font-mono), ui-monospace, monospace',
	});
	const nodes = document.querySelectorAll(`${ARTICLE_MAIN} .mermaid`);
	if (nodes.length === 0) return;
	await mermaid.run({ nodes: Array.from(nodes) as HTMLElement[], suppressErrors: true });
}

export async function initMermaidInArticle(): Promise<void> {
	const root = document.querySelector(ARTICLE_MAIN);
	if (!root) return;
	if (!prepareMermaidBlocks(root)) return;

	const run = (): void => {
		void runMermaid();
	};

	run();

	const observer = new MutationObserver(() => {
		resetDiagramsForRerender();
		run();
	});
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}

export function attachMermaidInArticle(): void {
	onDomReady(() => {
		void initMermaidInArticle();
	});
}
