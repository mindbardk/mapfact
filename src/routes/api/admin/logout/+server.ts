import type { RequestHandler } from './$types';
import { handle } from '$lib/server/api';
import { clearAdminCookie } from '$lib/server/admin';

// Adgangskontrol sker i hooks.server.ts for hele /api/admin/.

export const POST: RequestHandler = ({ cookies }) =>
	handle(async () => {
		clearAdminCookie(cookies);
		return { ok: true };
	});
