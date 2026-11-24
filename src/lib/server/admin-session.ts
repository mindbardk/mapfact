import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Admin-sessionens cookie: `<e-mail i base64url>.<udstedt, ms>.<HMAC>`.
 * Import-fri ud over node:crypto, så e2e-testene kan signere en cookie selv.
 *
 * Cookien beviser kun, hvem der loggede ind og hvornår — om personen STADIG
 * har adgang, afgøres ved hver forespørgsel (`adminRoleOf` i admin-users.ts),
 * så en fjernet hjælper lukkes ude med det samme.
 */

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function mac(secret: string, email: string, issuedAt: number): string {
	return createHmac('sha256', secret).update(`admin-session|${email}|${issuedAt}`).digest('hex');
}

export function signSession(secret: string, email: string, issuedAt: number): string {
	return `${Buffer.from(email).toString('base64url')}.${issuedAt}.${mac(secret, email, issuedAt)}`;
}

/**
 * Login via en anden host (Vercel-preview → mapfact.com): den
 * host, der har Googles callback, udsteder en kortlivet nøgle til én bestemt
 * origin, som bytter den til sin egen session. Kræver samme SESSION_SECRET.
 */
export const HANDOFF_MAX_AGE_MS = 60_000;

function handoffMac(secret: string, email: string, issuedAt: number, audience: string): string {
	return createHmac('sha256', secret).update(`admin-handoff|${email}|${issuedAt}|${audience}`).digest('hex');
}

export function signHandoff(secret: string, email: string, issuedAt: number, audience: string): string {
	return `${Buffer.from(email).toString('base64url')}.${issuedAt}.${handoffMac(secret, email, issuedAt, audience)}`;
}

/** E-mailen i en gyldig handoff-nøgle til netop `audience` (modtagerens origin) — ellers null. */
export function verifyHandoff(secret: string, token: string, audience: string, now: number): string | null {
	const parts = token.split('.');
	if (parts.length !== 3) return null;
	const [encoded, issuedText, signature] = parts;
	if (!/^\d+$/.test(issuedText)) return null;
	const issuedAt = Number(issuedText);
	// Lidt slør for ure, der går forskelligt på de to hosts.
	if (issuedAt > now + 5_000 || now - issuedAt > HANDOFF_MAX_AGE_MS) return null;
	const email = Buffer.from(encoded, 'base64url').toString();
	const a = Buffer.from(signature);
	const b = Buffer.from(handoffMac(secret, email, issuedAt, audience));
	return a.length === b.length && timingSafeEqual(a, b) ? email : null;
}

/** E-mailen i en gyldig, ikke-udløbet cookie — ellers null. */
export function verifySession(secret: string, value: string, now: number): string | null {
	const parts = value.split('.');
	if (parts.length !== 3) return null;
	const [encoded, issuedText, signature] = parts;
	if (!/^\d+$/.test(issuedText)) return null;
	const issuedAt = Number(issuedText);
	if (issuedAt > now || now - issuedAt > SESSION_MAX_AGE_SECONDS * 1000) return null;
	const email = Buffer.from(encoded, 'base64url').toString();
	const a = Buffer.from(signature);
	const b = Buffer.from(mac(secret, email, issuedAt));
	return a.length === b.length && timingSafeEqual(a, b) ? email : null;
}
