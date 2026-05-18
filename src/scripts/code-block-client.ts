import { onDomReady } from './dom-ready';

const ROOT_SELECTOR = '.post-article__main';
const COPY_LABEL = 'Copiar';
const COPIED_LABEL = 'Copiado';

function copyText(text: string): Promise<void> {
	if (navigator.clipboard?.writeText) {
		return navigator.clipboard.writeText(text);
	}

	const textarea = document.createElement('textarea');
	textarea.value = text;
	textarea.setAttribute('readonly', '');
	textarea.style.position = 'fixed';
	textarea.style.left = '-9999px';
	document.body.appendChild(textarea);
	textarea.select();
	document.execCommand('copy');
	textarea.remove();
	return Promise.resolve();
}

export function attachCodeBlockCopyButtons(): void {
	onDomReady(() => {
		const root = document.querySelector(ROOT_SELECTOR);
		if (!root) return;

		root.querySelectorAll<HTMLButtonElement>('[data-code-copy]').forEach((button) => {
			const block = button.closest<HTMLElement>('[data-code-block]');
			const pre = block?.querySelector('pre');
			const label = button.querySelector<HTMLElement>('.code-block__copy-label');
			if (!pre || !label) return;

			button.addEventListener('click', async () => {
				const code = (pre.textContent ?? '').replace(/\n$/, '');
				try {
					await copyText(code);
					label.textContent = COPIED_LABEL;
					button.setAttribute('aria-label', 'Código copiado');
					window.setTimeout(() => {
						label.textContent = COPY_LABEL;
						button.setAttribute('aria-label', 'Copiar código');
					}, 1800);
				} catch {
					label.textContent = 'Erro';
					window.setTimeout(() => {
						label.textContent = COPY_LABEL;
					}, 1800);
				}
			});
		});
	});
}
