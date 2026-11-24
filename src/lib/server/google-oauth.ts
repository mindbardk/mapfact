import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { AppError } from './errors';

/**
 * Log ind med Google (OAuth 2.0 authorization code + PKCE), skrevet direkte mod
 * Googles endpoints — vi skal kun bruge en verificeret e-mail. Ruterne er
 * `/admin/login/google` (videre til Google) og `…/callback` (tilbage igen).
 * Hosts uden registreret callback (Vercel-previews) sætter
 * `ADMIN_LOGIN_ORIGIN` og logger ind via den host; den sender en kortlivet
 * nøgle tilbage til `…/handoff` (se admin-session.ts).
 *
 * id_tokenets signatur tjekkes ikke: det kommer direkte fra Googles
 * token-endpoint over HTTPS og er hentet med vores client secret, hvilket
 * Google selv beskriver som tilstrækkeligt. iss, aud, exp og email_verified
 * tjekkes stadig.
 */

export const OAUTH_COOKIE = 'mapfact_oauth';
/** Fra klik på "Sign in with Google" til callbacket. */
export const OAUTH_COOKIE_MAX_AGE_SECONDS = 600;

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

export type GoogleConfig = { clientId: string; clientSecret: string };

export function googleConfig(env: Record<string, string | undefined>): GoogleConfig | null {
	const clientId = env.GOOGLE_CLIENT_ID?.trim();
	const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
	return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function callbackUrl(origin: string): string {
	return `${origin}/admin/login/google/callback`;
}

/**
 * Sidens origin, som browseren ser den. Bag en HTTPS-proxy ser Vite selv http; X-Forwarded-Proto må kun opgradere til https, aldrig
 * skifte host.
 */
export function publicOrigin(url: URL, headers: Headers): string {
	return url.protocol === 'http:' && headers.get('x-forwarded-proto') === 'https' ? `https://${url.host}` : url.origin;
}

/**
 * Hvem login-hosten må sende en handoff-nøgle til: mapfact.com, projektets egne
 * Vercel-previews og lokal dev på 127.0.0.1:5173. Alt andet afvises, så nøglen
 * aldrig kan lokkes til en fremmed side.
 */
const ALLOWED_RETURN_ORIGINS = ['https://mapfact.com', 'https://www.mapfact.com', 'http://127.0.0.1:5173'];
const PREVIEW_ORIGIN = /^https:\/\/mapfact-[a-z0-9-]+-mindbardks-projects\.vercel\.app$/;

export function isAllowedReturnOrigin(origin: string): boolean {
	return ALLOWED_RETURN_ORIGINS.includes(origin) || PREVIEW_ORIGIN.test(origin);
}

export type LoginAttempt = { verifier: string; returnTo: string | null };

/** Engangsværdier til ét login: state (mod CSRF), PKCE-verifier og evt. modtageren af handoff. */
export function createLoginAttempt(returnTo: string | null = null): { state: string; verifier: string; cookie: string } {
	const state = randomBytes(24).toString('base64url');
	const verifier = randomBytes(48).toString('base64url');
	const target = returnTo ? `.${Buffer.from(returnTo).toString('base64url')}` : '';
	return { state, verifier, cookie: `${state}.${verifier}${target}` };
}

export function authorizationUrl(config: GoogleConfig, redirectUri: string, state: string, verifier: string): string {
	const challenge = createHash('sha256').update(verifier).digest('base64url');
	const params = new URLSearchParams({
		client_id: config.clientId,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'openid email',
		state,
		code_challenge: challenge,
		code_challenge_method: 'S256',
		// Vis altid kontovælgeren, så en delt computer ikke stille logger forkert ind.
		prompt: 'select_account'
	});
	return `${AUTH_URL}?${params}`;
}

/** Login-forsøget, hvis callbackets state passer til cookien — ellers null. */
export function readLoginAttempt(cookie: string | undefined, state: string | null): LoginAttempt | null {
	if (!cookie || !state) return null;
	const [expected, verifier, target] = cookie.split('.');
	if (!expected || !verifier) return null;
	const a = Buffer.from(state);
	const b = Buffer.from(expected);
	if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
	return { verifier, returnTo: target ? Buffer.from(target, 'base64url').toString() : null };
}

/** Bytter koden til et id_token og returnerer den verificerede e-mail (små bogstaver). */
export async function exchangeCodeForEmail(
	fetchFn: typeof fetch,
	config: GoogleConfig,
	input: { code: string; verifier: string; redirectUri: string },
	nowSeconds = Math.floor(Date.now() / 1000)
): Promise<string> {
	const res = await fetchFn(TOKEN_URL, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			code: input.code,
			client_id: config.clientId,
			client_secret: config.clientSecret,
			redirect_uri: input.redirectUri,
			grant_type: 'authorization_code',
			code_verifier: input.verifier
		})
	});
	const body = (await res.json().catch(() => null)) as { id_token?: unknown; error?: unknown } | null;
	if (!res.ok || typeof body?.id_token !== 'string') {
		throw new AppError(502, `Google sign-in failed${typeof body?.error === 'string' ? ` (${body.error})` : ''}`);
	}
	return emailFromIdToken(body.id_token, config.clientId, nowSeconds);
}

export function emailFromIdToken(idToken: string, clientId: string, nowSeconds: number): string {
	const payload = idToken.split('.')[1];
	let claims: Record<string, unknown>;
	try {
		claims = JSON.parse(Buffer.from(payload ?? '', 'base64url').toString());
	} catch {
		throw new AppError(502, 'Google sent an unreadable sign-in token');
	}
	const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
	if (!ISSUERS.includes(String(claims.iss)) || !audience.includes(clientId)) {
		throw new AppError(502, 'Google sent a sign-in token for another app');
	}
	if (typeof claims.exp !== 'number' || claims.exp < nowSeconds) {
		throw new AppError(401, 'The Google sign-in expired — try again');
	}
	if (typeof claims.email !== 'string' || claims.email_verified !== true) {
		throw new AppError(403, 'Your Google account has no verified email address');
	}
	return claims.email.trim().toLowerCase();
}
