import { onDomReady } from './dom-ready';

const WRAP_CLASS = 'post-article__mermaid-wrap';
const ARTICLE_MAIN = '.post-article__main';
const DIALOG_ID = 'post-mermaid-lightbox';
const OPEN_CLASS = 'post-mermaid-lightbox-open';
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

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

function mermaidFontFamily(): string {
	return (
		getComputedStyle(document.documentElement).getPropertyValue('--font-sans').trim() ||
		"'Geist', 'Inter', system-ui, sans-serif"
	);
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
		const expandButton = document.createElement('button');
		expandButton.type = 'button';
		expandButton.className = 'post-article__mermaid-expand';
		expandButton.setAttribute('data-mermaid-expand', '');
		expandButton.setAttribute('aria-label', 'Expandir diagrama em tela cheia');
		expandButton.textContent = 'Expandir';
		wrap.append(expandButton, graph);
		pre.replaceWith(wrap);
		count += 1;
	});
	return count > 0;
}

function attachMermaidLightbox(root: HTMLElement): void {
	const dialog = document.getElementById(DIALOG_ID) as HTMLDialogElement | null;
	const viewport = dialog?.querySelector<HTMLElement>('[data-mermaid-viewport]');
	const canvas = dialog?.querySelector<HTMLElement>('[data-mermaid-canvas]');
	const zoomOutput = dialog?.querySelector<HTMLOutputElement>('[data-mermaid-zoom]');
	const zoomOutButton = dialog?.querySelector<HTMLButtonElement>('[data-mermaid-zoom-out]');
	const zoomInButton = dialog?.querySelector<HTMLButtonElement>('[data-mermaid-zoom-in]');
	const resetButton = dialog?.querySelector<HTMLButtonElement>('[data-mermaid-zoom-reset]');
	const closeButton = dialog?.querySelector<HTMLButtonElement>('[data-mermaid-close]');
	if (
		!dialog ||
		!viewport ||
		!canvas ||
		!zoomOutput ||
		!zoomOutButton ||
		!zoomInButton ||
		!resetButton ||
		!closeButton ||
		dialog.dataset.mermaidReady
	) {
		return;
	}

	dialog.dataset.mermaidReady = 'true';
	let zoom = 1;
	let baseWidth = 1;
	let diagramUrl: string | null = null;

	const updateZoom = (): void => {
		const image = canvas.querySelector<HTMLImageElement>('.post-mermaid-lightbox__diagram');
		if (!image) return;

		image.style.width = `${Math.round(baseWidth * zoom)}px`;
		zoomOutput.value = `${Math.round(zoom * 100)}%`;
		zoomOutput.textContent = zoomOutput.value;
		zoomOutButton.disabled = zoom <= MIN_ZOOM;
		zoomInButton.disabled = zoom >= MAX_ZOOM;
	};

	const setZoom = (value: number): void => {
		zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
		updateZoom();
	};

	const close = (): void => {
		if (dialog.open) dialog.close();
	};

	const open = (wrap: Element): void => {
		const svg = wrap.querySelector<SVGSVGElement>('svg');
		if (!svg) return;

		if (diagramUrl) URL.revokeObjectURL(diagramUrl);
		diagramUrl = URL.createObjectURL(
			new Blob([svg.outerHTML], { type: 'image/svg+xml;charset=utf-8' }),
		);

		const image = document.createElement('img');
		image.className = 'post-mermaid-lightbox__diagram';
		image.src = diagramUrl;
		image.alt = 'Diagrama Mermaid ampliado';
		canvas.replaceChildren(image);

		zoom = 1;
		dialog.showModal();
		document.documentElement.classList.add(OPEN_CLASS);

		requestAnimationFrame(() => {
			const viewBoxWidth = svg.viewBox.baseVal.width;
			const viewBoxHeight = svg.viewBox.baseVal.height;
			const renderedWidth = svg.getBoundingClientRect().width;
			const renderedHeight = svg.getBoundingClientRect().height;
			const naturalWidth = viewBoxWidth > 0 ? viewBoxWidth : renderedWidth;
			const naturalHeight = viewBoxHeight > 0 ? viewBoxHeight : renderedHeight;
			const canvasStyle = getComputedStyle(canvas);
			const horizontalPadding =
				Number.parseFloat(canvasStyle.paddingLeft) + Number.parseFloat(canvasStyle.paddingRight);
			const verticalPadding =
				Number.parseFloat(canvasStyle.paddingTop) + Number.parseFloat(canvasStyle.paddingBottom);
			const availableWidth = Math.max(1, viewport.clientWidth - horizontalPadding);
			const availableHeight = Math.max(1, viewport.clientHeight - verticalPadding);
			const fitScale = Math.min(
				1,
				availableWidth / naturalWidth,
				availableHeight / naturalHeight,
			);
			baseWidth = Math.max(1, naturalWidth * fitScale);
			viewport.scrollTo({ top: 0, left: 0 });
			updateZoom();
			viewport.focus();
		});
	};

	root.addEventListener('click', (event) => {
		const target = event.target;
		if (!(target instanceof Element)) return;
		const button = target.closest<HTMLButtonElement>('[data-mermaid-expand]');
		if (!button) return;
		const wrap = button.closest(`.${WRAP_CLASS}`);
		if (wrap) open(wrap);
	});

	zoomOutButton.addEventListener('click', () => setZoom(zoom - ZOOM_STEP));
	zoomInButton.addEventListener('click', () => setZoom(zoom + ZOOM_STEP));
	resetButton.addEventListener('click', () => {
		setZoom(1);
		viewport.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
	});
	closeButton.addEventListener('click', close);

	viewport.addEventListener(
		'wheel',
		(event) => {
			if (!event.ctrlKey && !event.metaKey) return;
			event.preventDefault();
			setZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
		},
		{ passive: false },
	);

	dialog.addEventListener('keydown', (event) => {
		if (event.key === '+' || event.key === '=') {
			event.preventDefault();
			setZoom(zoom + ZOOM_STEP);
		} else if (event.key === '-') {
			event.preventDefault();
			setZoom(zoom - ZOOM_STEP);
		} else if (event.key === '0') {
			event.preventDefault();
			setZoom(1);
		}
	});

	dialog.addEventListener('close', () => {
		document.documentElement.classList.remove(OPEN_CLASS);
		canvas.replaceChildren();
		if (diagramUrl) {
			URL.revokeObjectURL(diagramUrl);
			diagramUrl = null;
		}
	});
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
	const fontFamily = mermaidFontFamily();
	mermaid.initialize({
		startOnLoad: false,
		theme: mermaidTheme(),
		securityLevel: 'strict',
		fontFamily,
		themeVariables: {
			fontFamily,
		},
	});
	const nodes = document.querySelectorAll(`${ARTICLE_MAIN} .mermaid`);
	if (nodes.length === 0) return;
	await mermaid.run({ nodes: Array.from(nodes) as HTMLElement[], suppressErrors: true });
}

export async function initMermaidInArticle(): Promise<void> {
	const root = document.querySelector<HTMLElement>(ARTICLE_MAIN);
	if (!root) return;
	if (!prepareMermaidBlocks(root)) return;
	attachMermaidLightbox(root);

	const run = (): void => {
		void runMermaid();
	};

	run();

	let isDark = document.documentElement.classList.contains('dark');
	const observer = new MutationObserver(() => {
		const nextIsDark = document.documentElement.classList.contains('dark');
		if (nextIsDark === isDark) return;
		isDark = nextIsDark;
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
