/**
 * Hint-cookien fortæller den offentlige side, at browseren tilhører en admin,
 * så admin-links kan vises fra frontenden. Den er IKKE httpOnly (klienten skal
 * kunne læse den) og giver ingen adgang i sig selv: selve login er stadig den
 * signerede `mapfact_admin`-cookie.
 *
 * Bevidst en cookie, klienten læser, i stedet for data fra en server-load:
 * de offentlige sider caches på CDN'et, så en admins renderede side ellers
 * kunne blive serveret til alle andre.
 */
export const ADMIN_HINT_COOKIE = 'mapfact_admin_hint';

export function hasAdminHint(cookieHeader: string): boolean {
	return cookieHeader.split(';').some((part) => part.trim().startsWith(`${ADMIN_HINT_COOKIE}=`));
}

/** Klientsiden: fjern et hint, der ikke længere passer (fx udløbet login). */
export function clearAdminHint() {
	document.cookie = `${ADMIN_HINT_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
