import { timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { ADMIN_HINT_COOKIE } from '$lib/admin-hint';
import { AppError } from './errors';
import { SESSION_MAX_AGE_SECONDS, signHandoff, signSession, verifyHandoff, verifySession } from './admin-session';
import {
	adminRoleOf,
	API_TOKEN_LOGIN,
	parseOwnerEmails,
	type AdminIdentity
} from './admin-users';
import type { Db } from './db';

export const ADMIN_COOKIE = 'mapfact_admin';

function sessionSecret(): string {
	if (!env.SESSION_SECRET) throw new AppError(500, 'SESSION_SECRET is not set');
	return env.SESSION_SECRET;
}

function safeEqual(value: string, expected: string): boolean {
	const a = Buffer.from(value);
	const b = Buffer.from(expected);
	return a.length === b.length && timingSafeEqual(a, b);
}

/** Nødadgangen: kun aktiv, så længe ADMIN_PASSWORD er sat. */
export function passwordLoginEnabled(): boolean {
	return Boolean(env.ADMIN_PASSWORD);
}

export function checkPassword(password: string): boolean {
	if (!env.ADMIN_PASSWORD) return false;
	return safeEqual(password, env.ADMIN_PASSWORD);
}

export function ownerEmails(): string[] {
	return parseOwnerEmails(env.ADMIN_OWNER_EMAILS);
}

export function setAdminSession(cookies: Cookies, email: string, now = Date.now()) {
	cookies.set(ADMIN_COOKIE, signSession(sessionSecret(), email, now), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: SESSION_MAX_AGE_SECONDS
	});
	setAdminHint(cookies);
}

/** Nøglen, login-hosten sender videre til `audience` (se admin-session.ts). */
export function issueHandoff(email: string, audience: string, now = Date.now()): string {
	return signHandoff(sessionSecret(), email, now, audience);
}

export function acceptHandoff(token: string, audience: string, now = Date.now()): string | null {
	return verifyHandoff(sessionSecret(), token, audience, now);
}

/** E-mailen i en gyldig session. Om den stadig har adgang, må kalderen selv afgøre. */
export function sessionEmail(cookies: Cookies, now = Date.now()): string | null {
	const value = cookies.get(ADMIN_COOKIE);
	return value ? verifySession(sessionSecret(), value, now) : null;
}

/** Se `admin-hint.ts`. Sættes også af admin-layoutet, så eksisterende logins får den. */
export function setAdminHint(cookies: Cookies) {
	cookies.set(ADMIN_HINT_COOKIE, '1', { path: '/', httpOnly: false, sameSite: 'lax', maxAge: SESSION_MAX_AGE_SECONDS });
}

export function clearAdminCookie(cookies: Cookies) {
	cookies.delete(ADMIN_COOKIE, { path: '/' });
	cookies.delete(ADMIN_HINT_COOKIE, { path: '/', httpOnly: false });
}

/**
 * Hvem forespørgslen kommer fra: en gyldig session-cookie, hvis e-mail stadig
 * har adgang, eller scripts' `Authorization: Bearer $ADMIN_API_TOKEN`. null =
 * ikke logget ind. Kaster (fx manglende SESSION_SECRET) frem for at lukke op.
 */
export async function authenticateAdmin(
	cookies: Cookies,
	authorization: string | null,
	loadDb: () => Promise<Db>,
	now = Date.now()
): Promise<AdminIdentity | null> {
	const token = env.ADMIN_API_TOKEN;
	if (token && authorization && safeEqual(authorization, `Bearer ${token}`)) {
		return { email: API_TOKEN_LOGIN, role: 'owner' };
	}
	const value = cookies.get(ADMIN_COOKIE);
	if (!value) return null;
	const email = verifySession(sessionSecret(), value, now);
	if (!email) return null;
	const role = await adminRoleOf(email, { ownerEmails: ownerEmails(), passwordLogin: passwordLoginEnabled() }, loadDb);
	return role ? { email, role } : null;
}

/**
 * Vercel Cron sender `Authorization: Bearer ${CRON_SECRET}` til /api/cron/*.
 * Uden en secret afvises ALT — en tom secret må aldrig matche en tom eller
 * manglende header.
 */
export function isCronAuthorized(authorization: string | null): boolean {
	const secret = env.CRON_SECRET;
	if (!secret || !authorization) return false;
	return safeEqual(authorization, `Bearer ${secret}`);
}

/**
 * Stier bag admin-login. Matchet sker på segmentgrænse, så en fremtidig
 * offentlig rute som /api/admin-status ikke utilsigtet bliver beskyttet.
 *
 * Der matches på pathname og ikke route.id, fordi route.id først findes efter
 * resolve() — altså efter det tidspunkt, hvor guardet skal træffe sin
 * beslutning. Konsekvensen er, at et fremtidigt reroute-hook eller en
 * rute-alias kan få sti og rute til at pege forskellige steder; sker det,
 * skal dette match følge med.
 *
 * Bemærk at /admin/*-SIDERNE ikke er med her — de guardes af
 * admin/+layout.server.ts, som redirecter til login i stedet for at kaste 401.
 */
export function isProtectedApiPath(pathname: string): boolean {
	return pathname === '/api/admin' || pathname.startsWith('/api/admin/');
}

/** Admin-API'er, som kun ejeren må kalde (brugerstyringen). Samme segmentregel. */
export function isOwnerOnlyApiPath(pathname: string): boolean {
	return pathname === '/api/admin/users' || pathname.startsWith('/api/admin/users/');
}
