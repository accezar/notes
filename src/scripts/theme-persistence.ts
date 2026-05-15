import { THEME_STORAGE } from '../data/variables';

export function normalizeTheme(raw: string | null | undefined): 'light' | 'dark' | null {
	if (raw == null) return null;
	const s = String(raw).trim().toLowerCase();
	return s === 'light' || s === 'dark' ? s : null;
}

function readCookieTheme(): 'light' | 'dark' | null {
	if (typeof document === 'undefined') return null;
	try {
		const m = document.cookie.match(
			new RegExp(`(?:^|; )${THEME_STORAGE.cookieKey}=([^;]*)`),
		);
		return m?.[1] ? normalizeTheme(decodeURIComponent(m[1])) : null;
	} catch {
		return null;
	}
}

export function readStoredTheme(): 'light' | 'dark' | null {
	if (typeof localStorage === 'undefined') return readCookieTheme();
	try {
		return (
			normalizeTheme(localStorage.getItem(THEME_STORAGE.lsKey)) ??
			normalizeTheme(localStorage.getItem(THEME_STORAGE.legacyLsKey))
		);
	} catch {
		return readCookieTheme();
	}
}

export function persistTheme(theme: 'light' | 'dark'): void {
	if (typeof document !== 'undefined') {
		document.documentElement.classList.toggle('dark', theme === 'dark');
	}
	if (typeof localStorage !== 'undefined') {
		try {
			localStorage.setItem(THEME_STORAGE.lsKey, theme);
			localStorage.setItem(THEME_STORAGE.legacyLsKey, theme);
		} catch {
		}
	}
	if (typeof document !== 'undefined') {
		try {
			document.cookie = `${THEME_STORAGE.cookieKey}=${encodeURIComponent(theme)};path=/;max-age=31536000;SameSite=Lax`;
		} catch {
		}
	}
}
export const HEAD_THEME_INLINE = `(function(){var K=${JSON.stringify(THEME_STORAGE.lsKey)};var L=${JSON.stringify(THEME_STORAGE.legacyLsKey)};var C=${JSON.stringify(THEME_STORAGE.cookieKey)};var root=document.documentElement;function norm(v){if(v==null)return null;v=(''+v).trim().toLowerCase();return v==='light'||v==='dark'?v:null;}var stored=null;try{stored=localStorage.getItem(K)||localStorage.getItem(L);}catch(e){}var t=norm(stored);if(!t){try{var r=new RegExp('(?:^|; )'+C+'=([^;]*)');var m=document.cookie.match(r);if(m)t=norm(decodeURIComponent(m[1]));}catch(e2){}}if(t==='light'||t==='dark'){root.classList.toggle('dark',t==='dark');}else{root.classList.toggle('dark',window.matchMedia('(prefers-color-scheme: dark)').matches);}})();`;
