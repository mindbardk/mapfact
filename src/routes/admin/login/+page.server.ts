import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';
import { checkPassword, passwordLoginEnabled, setAdminSession } from '$lib/server/admin';
import { PASSWORD_LOGIN } from '$lib/server/admin-users';
import { googleConfig } from '$lib/server/google-oauth';
import { loginErrorMessage } from '$lib/server/login-errors';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.admin) redirect(303, '/admin');
	return {
		// Previews logger ind via ADMIN_LOGIN_ORIGIN uden egne Google-nøgler.
		google: googleConfig(env) !== null || Boolean(env.ADMIN_LOGIN_ORIGIN?.trim()),
		passwordLogin: passwordLoginEnabled(),
		loginError: loginErrorMessage(url.searchParams.get('error'), url.searchParams.get('email'))
	};
};

export const actions: Actions = {
	// Nødadgangen: virker kun, så længe ADMIN_PASSWORD er sat.
	default: async ({ request, cookies }) => {
		if (!passwordLoginEnabled()) return fail(404, { error: 'Password sign-in is turned off' });
		const data = await request.formData();
		const password = String(data.get('password') ?? '');
		if (!checkPassword(password)) {
			return fail(400, { error: 'Wrong password' });
		}
		setAdminSession(cookies, PASSWORD_LOGIN);
		redirect(303, '/admin');
	}
};
