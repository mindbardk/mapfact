import { json, redirect, type Handle } from '@sveltejs/kit';
import { authenticateAdmin, isOwnerOnlyApiPath, isProtectedApiPath } from '$lib/server/admin';
import { getDb } from '$lib/server/db';
import { AppError } from '$lib/server/errors';

export const handle: Handle = async ({ event, resolve }) => {
	// Hvem der er logget ind, slås op for hele admin-området. Uden cookie/token
	// rører det ikke databasen. Stien dekodes som SvelteKits router gør det,
	// ellers kunne /api/%61dmin/… ramme en admin-rute uden om guarden.
	const path = decodePathname(event.url.pathname);
	event.locals.admin = null;
	const protectedApi = isProtectedApiPath(path);
	const adminPage = path === '/admin' || path.startsWith('/admin/');
	if (protectedApi || adminPage) {
		try {
			event.locals.admin = await authenticateAdmin(
				event.cookies,
				event.request.headers.get('authorization'),
				getDb
			);
		} catch (e) {
			// Fx manglende SESSION_SECRET. Requesten må aldrig slippe igennem,
			// og svaret skal være JSON som resten af /api/*.
			if (!protectedApi) throw e;
			const status = e instanceof AppError ? e.status : 500;
			const message = e instanceof Error ? e.message : 'Server error';
			return json({ error: message }, { status });
		}
	}

	// Admin-API'et lukkes her frem for i hver handler, så en ny rute under
	// /api/admin/ er beskyttet som udgangspunkt. Det ENESTE håndhævelsespunkt.
	if (protectedApi) {
		if (!event.locals.admin) return json({ error: 'Not authorized' }, { status: 401 });
		if (isOwnerOnlyApiPath(path) && event.locals.admin.role !== 'owner') {
			return json({ error: 'Only the owner can do that' }, { status: 403 });
		}
	}

	// Admin-siderne guardes også her og ikke kun i admin/+layout.server.ts:
	// SvelteKit springer layoutets load over, når klienten sender
	// x-sveltekit-invalidated, og så ville sidens egen load svare uden login.
	if (adminPage && !event.locals.admin && !isLoginPath(path)) redirect(303, '/admin/login');

	// Purge af CDN-cachen efter admin-skrivninger kommer i fase 2.
	return resolve(event);
};

/** Samme dekodning som SvelteKits router: alt undtagen %25 (et bogstaveligt %). */
function decodePathname(pathname: string): string {
	try {
		return pathname.split('%25').map(decodeURI).join('%25');
	} catch {
		return pathname;
	}
}

/** Login-siden og dens Google-/handoff-ruter skal kunne nås uden login. */
function isLoginPath(path: string): boolean {
	return path === '/admin/login' || path.startsWith('/admin/login/');
}
