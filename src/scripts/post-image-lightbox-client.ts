import { onDomReady } from './dom-ready';

const ROOT_SELECTOR = '.post-article__main';
const DIALOG_ID = 'post-image-lightbox';
const IMAGE_SELECTOR = `${ROOT_SELECTOR} figure img`;

export function attachPostImageLightbox(): void {
	onDomReady(() => {
		const dialog = document.getElementById(DIALOG_ID) as HTMLDialogElement | null;
		const dialogImg = dialog?.querySelector<HTMLImageElement>('.post-image-lightbox__img');
		const closeButton = dialog?.querySelector<HTMLButtonElement>('[data-post-image-lightbox-close]');
		if (!dialog || !dialogImg) return;

		const close = (): void => {
			if (dialog.open) {
				dialog.close();
			}
		};

		const open = (source: HTMLImageElement): void => {
			const caption =
				source.closest('figure')?.querySelector('figcaption')?.textContent?.trim() ?? '';

			dialogImg.src = source.currentSrc || source.src;
			dialogImg.alt = caption;

			dialog.showModal();
		};

		document.querySelectorAll<HTMLImageElement>(IMAGE_SELECTOR).forEach((image) => {
			image.addEventListener('click', () => {
				open(image);
			});
		});

		closeButton?.addEventListener('click', close);

		dialog.addEventListener('click', (event) => {
			if (!dialog.open) return;
			if (event.target === dialog) {
				close();
			}
		});
	});
}
