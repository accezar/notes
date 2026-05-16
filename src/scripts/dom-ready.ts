/** Run after DOMContentLoaded, or immediately if the document is already interactive. */
export function onDomReady(run: () => void): void {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', run, { once: true });
	} else {
		run();
	}
}
