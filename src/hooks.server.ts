import { json, type Handle } from '@sveltejs/kit';
import { authenticateAdmin, isOwnerOnlyApiPath, isProtectedApiPath } from '$lib/server/admin';
import { getDb } from '$lib/server/db';
import { AppError } from '$lib/server/errors';

export const handle: Handle = async ({ event, resolve }) => {
	// Hvem der er logget ind, slås op for hele admin-området (siderne bruger
	// det i admin/+layout.server.ts). Uden cookie/token rører det ikke databasen.
	const path = event.url.pathname;
	event.locals.admin = null;
	const protectedApi = isProtectedApiPath(path);
	if (protectedApi || path === '/admin' || path.startsWith('/admin/')) {
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

	// Purge af CDN-cachen efter admin-skrivninger kommer i fase 2.
	return resolve(event);
};
