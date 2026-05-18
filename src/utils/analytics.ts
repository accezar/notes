/** GA4 measurement ID format (e.g. G-XXXXXXXXXX). */
const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/;

export function getGaMeasurementId(): string | undefined {
	const raw = import.meta.env.PUBLIC_GA_MEASUREMENT_ID;
	if (typeof raw !== 'string') return undefined;

	const id = raw.trim();
	if (!id || !GA_MEASUREMENT_ID_PATTERN.test(id)) return undefined;

	return id;
}

/** Enabled on production builds when a valid measurement ID is set at build time. */
export function isGoogleAnalyticsEnabled(): boolean {
	return import.meta.env.PROD && getGaMeasurementId() !== undefined;
}
