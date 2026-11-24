import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import {
	authorizationUrl,
	callbackUrl,
	createLoginAttempt,
	googleConfig,
	isAllowedReturnOrigin,
	OAUTH_COOKIE,
	OAUTH_COOKIE_MAX_AGE_SECONDS,
	publicOrigin
} from '$lib/server/google-oauth';

/** "Sign in with Google": gem state + PKCE-verifier i en kortlivet cookie og send videre til Google. */
export const GET: RequestHandler = ({ url, cookies, request }) => {
	const origin = publicOrigin(url, request.headers);
	// Previews har ingen registreret callback: log ind via login-hosten.
	const loginOrigin = env.ADMIN_LOGIN_ORIGIN?.trim().replace(/\/$/, '');
	if (loginOrigin && loginOrigin !== origin) {
		redirect(303, `${loginOrigin}/admin/login/google?${new URLSearchParams({ return: origin })}`);
	}

	const config = googleConfig(env);
	if (!config) error(404, 'Google sign-in is not set up');
	const returnTo = url.searchParams.get('return');
	if (returnTo && !isAllowedReturnOrigin(returnTo)) error(400, 'Sign-in from that address is not allowed');
	const attempt = createLoginAttempt(returnTo);
	cookies.set(OAUTH_COOKIE, attempt.cookie, {
		path: '/admin/login/google',
		httpOnly: true,
		// lax: cookien skal med, når Google sender browseren tilbage (top-level GET).
		sameSite: 'lax',
		maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS
	});
	redirect(303, authorizationUrl(config, callbackUrl(origin), attempt.state, attempt.verifier));
};
