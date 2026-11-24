import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { getDb } from '$lib/server/db';
import { issueHandoff, ownerEmails, passwordLoginEnabled, setAdminSession } from '$lib/server/admin';
import { adminRoleOf } from '$lib/server/admin-users';
import { AppError } from '$lib/server/errors';
import {
	callbackUrl,
	exchangeCodeForEmail,
	googleConfig,
	isAllowedReturnOrigin,
	OAUTH_COOKIE,
	publicOrigin,
	readLoginAttempt
} from '$lib/server/google-oauth';
import { loginErrorUrl } from '$lib/server/login-errors';

export const GET: RequestHandler = async ({ url, cookies, fetch, request }) => {
	const origin = publicOrigin(url, request.headers);
	const attempt = readLoginAttempt(cookies.get(OAUTH_COOKIE), url.searchParams.get('state'));
	cookies.delete(OAUTH_COOKIE, { path: '/admin/login/google' });
	// Fejl vises på den side, login startede fra (fx en preview).
	const returnTo = attempt?.returnTo && isAllowedReturnOrigin(attempt.returnTo) ? attempt.returnTo : null;
	// En deklaration (ikke en arrow), så TypeScript indsnævrer efter kaldene.
	function back(code: string, email?: string): never {
		redirect(303, loginErrorUrl(returnTo ?? '', code, email));
	}

	const config = googleConfig(env);
	if (!config) back('not-configured');
	// Annulleret hos Google (access_denied).
	if (url.searchParams.get('error')) back('cancelled');
	const code = url.searchParams.get('code');
	// Forældet, fra en anden fane eller et fremmed callback (state passer ikke).
	if (!attempt || !code) back('expired');

	let email: string;
	try {
		email = await exchangeCodeForEmail(fetch, config, { code, verifier: attempt.verifier, redirectUri: callbackUrl(origin) });
	} catch (e) {
		console.error('[admin] Google sign-in failed:', e instanceof AppError ? e.message : e);
		back('failed');
	}
	// Login-hostens liste afgør adgangen — også når sessionen laves på en preview.
	const role = await adminRoleOf(email, { ownerEmails: ownerEmails(), passwordLogin: passwordLoginEnabled() }, getDb);
	if (!role) back('not-allowed', email);
	if (returnTo) {
		redirect(303, `${returnTo}/admin/login/handoff?${new URLSearchParams({ token: issueHandoff(email, returnTo) })}`);
	}
	setAdminSession(cookies, email);
	redirect(303, '/admin');
};
