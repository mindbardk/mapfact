import { redirect } from '@sveltejs/kit';
import { ADMIN_HINT_COOKIE } from '$lib/admin-hint';
import { setAdminHint } from '$lib/server/admin';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, route, locals }) => {
	// Login-siden har ingen menu og må ikke kræve et login.
	if (route.id === '/admin/login') return { admin: null };
	const admin = locals.admin;
	if (!admin) redirect(303, '/admin/login');
	if (!cookies.get(ADMIN_HINT_COOKIE)) setAdminHint(cookies);
	return { admin };
};
