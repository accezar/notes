import { onDomReady } from './dom-ready';

const DRAWER_ID = 'home-profile-drawer';
const MENU_SELECTOR = '[data-home-profile-menu]';
const CLOSE_SELECTOR = '[data-home-profile-drawer-close]';
const MOBILE_MQ = '(max-width: 899px)';

function isMobile(): boolean {
	return window.matchMedia(MOBILE_MQ).matches;
}

function isBackdropClick(drawer: HTMLDialogElement, event: MouseEvent): boolean {
	const rect = drawer.getBoundingClientRect();
	return (
		event.clientX < rect.left ||
		event.clientX > rect.right ||
		event.clientY < rect.top ||
		event.clientY > rect.bottom
	);
}

function syncMenuState(drawer: HTMLDialogElement, menu: HTMLButtonElement): void {
	const open = drawer.open;
	menu.setAttribute('aria-expanded', open ? 'true' : 'false');
	menu.setAttribute(
		'aria-label',
		open ? 'Fechar painel de perfil e navegação' : 'Abrir painel de perfil e navegação',
	);
}

export function attachHomeProfileDrawer(): void {
	onDomReady(() => {
		const drawer = document.getElementById(DRAWER_ID) as HTMLDialogElement | null;
		const menu = document.querySelector<HTMLButtonElement>(MENU_SELECTOR);
		if (!drawer || !menu) return;

		const closeButton = drawer.querySelector<HTMLButtonElement>(CLOSE_SELECTOR);
		const mobileQuery = window.matchMedia(MOBILE_MQ);

		const close = (): void => {
			if (drawer.open) {
				drawer.close();
			}
			syncMenuState(drawer, menu);
		};

		menu.addEventListener('click', () => {
			if (!isMobile()) return;
			if (drawer.open) {
				close();
				return;
			}
			drawer.showModal();
			syncMenuState(drawer, menu);
		});

		closeButton?.addEventListener('click', () => {
			close();
		});

		drawer.addEventListener('click', (event) => {
			if (!drawer.open || !isMobile()) return;
			if (isBackdropClick(drawer, event)) {
				close();
			}
		});

		drawer.addEventListener('close', () => {
			syncMenuState(drawer, menu);
		});

		drawer.querySelectorAll<HTMLAnchorElement>('a[href*="#"]').forEach((link) => {
			link.addEventListener('click', () => {
				if (isMobile()) {
					close();
				}
			});
		});

		mobileQuery.addEventListener('change', () => {
			if (!isMobile()) {
				close();
			}
		});
	});
}
