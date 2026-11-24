import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { acceptHandoff, ownerEmails, passwordLoginEnabled, setAdminSession } from '$lib/server/admin';
import { adminRoleOf } from '$lib/server/admin-users';
import { publicOrigin } from '$lib/server/google-oauth';
import { loginErrorUrl } from '$lib/server/login-errors';

/**
 * Modtager login-hostens kortlivede nøgle (se google/callback) og laver en
 * session her. Nøglen gælder kun for denne origin og i 60 s. Adgangen tjekkes
 * også mod DENNE hosts liste, så en preview-kopi uden hjælperen siger nej.
 */
export const GET: RequestHandler = async ({ url, cookies, request }) => {
	const email = acceptHandoff(url.searchParams.get('token') ?? '', publicOrigin(url, request.headers));
	if (!email) redirect(303, loginErrorUrl('', 'expired'));
	const role = await adminRoleOf(email, { ownerEmails: ownerEmails(), passwordLogin: passwordLoginEnabled() }, getDb);
	if (!role) redirect(303, loginErrorUrl('', 'not-allowed', email));
	setAdminSession(cookies, email);
	redirect(303, '/admin');
};
