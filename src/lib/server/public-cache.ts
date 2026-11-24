// CDN-cache af de offentlige sider. Siderne er ens for alle besøgende, så
// Vercels CDN kan svare uden at vække funktionen og databasen. Admin-skrivninger
// purger tagget (fase 2), så en udgivelse ses med det samme.

/** Tagget alle offentlige sider caches under (`Vercel-Cache-Tag`). */
export const PUBLIC_CACHE_TAG = 'public-pages';

/**
 * Browseren spørger altid igen (en browsercache kan ikke slettes), mens CDN'et
 * svarer fra cachen til næste midnat UTC og derefter med den gamle udgave,
 * mens en ny hentes i baggrunden (stale-while-revalidate).
 */
export function publicCacheHeaders(now = new Date()) {
	return {
		'cache-control': 'public, max-age=0, must-revalidate',
		'vercel-cdn-cache-control': `max-age=${secondsToMidnightUtc(now)}, stale-while-revalidate=86400`,
		'vercel-cache-tag': PUBLIC_CACHE_TAG
	};
}

/** Sekunder til næste midnat UTC, mindst 1. */
export function secondsToMidnightUtc(now: Date): number {
	const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
	return Math.max(1, Math.ceil((midnight - now.getTime()) / 1000));
}

/**
 * Sæt headerne på et vellykket svar. Kaldes efter data er hentet, så en
 * midlertidig fejl aldrig bliver liggende i cachen.
 */
export function cachePublicPage(setHeaders: (headers: Record<string, string>) => void): void {
	setHeaders(publicCacheHeaders());
}
