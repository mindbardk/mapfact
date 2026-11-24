import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
	authorizationUrl,
	createLoginAttempt,
	emailFromIdToken,
	exchangeCodeForEmail,
	googleConfig,
	isAllowedReturnOrigin,
	publicOrigin,
	readLoginAttempt
} from './google-oauth';

const config = { clientId: 'client-123.apps.googleusercontent.com', clientSecret: 'secret' };
const NOW = 1_800_000_000;

/** Et id_token som Google sender det (signaturen tjekkes ikke, se google-oauth.ts). */
function idToken(claims: Record<string, unknown>) {
	const part = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
	return `${part({ alg: 'RS256' })}.${part({
		iss: 'https://accounts.google.com',
		aud: config.clientId,
		exp: NOW + 3600,
		email: 'Partner@Gmail.com',
		email_verified: true,
		...claims
	})}.signature`;
}

describe('googleConfig', () => {
	it('kræver både id og secret', () => {
		expect(googleConfig({ GOOGLE_CLIENT_ID: 'a' })).toBeNull();
		expect(googleConfig({ GOOGLE_CLIENT_ID: ' a ', GOOGLE_CLIENT_SECRET: 'b' })).toEqual({ clientId: 'a', clientSecret: 'b' });
	});
});

describe('login-forsøget', () => {
	it('sender state og PKCE-challenge (S256 af verifieren) til Google', () => {
		const attempt = createLoginAttempt();
		const url = new URL(authorizationUrl(config, 'https://mapfact.com/admin/login/google/callback', attempt.state, attempt.verifier));
		expect(url.origin).toBe('https://accounts.google.com');
		expect(url.searchParams.get('state')).toBe(attempt.state);
		expect(url.searchParams.get('scope')).toBe('openid email');
		expect(url.searchParams.get('code_challenge')).toBe(createHash('sha256').update(attempt.verifier).digest('base64url'));
		expect(url.searchParams.get('redirect_uri')).toBe('https://mapfact.com/admin/login/google/callback');
	});

	it('giver kun login-forsøget tilbage, når state passer til cookien', () => {
		const attempt = createLoginAttempt();
		expect(readLoginAttempt(attempt.cookie, attempt.state)).toEqual({ verifier: attempt.verifier, returnTo: null });
		expect(readLoginAttempt(attempt.cookie, createLoginAttempt().state)).toBeNull();
		expect(readLoginAttempt(attempt.cookie, null)).toBeNull();
		expect(readLoginAttempt(undefined, attempt.state)).toBeNull();
		expect(readLoginAttempt(attempt.cookie, 'short')).toBeNull();
	});

	it('husker, hvilken host login startede fra', () => {
		const attempt = createLoginAttempt('https://preview.mapfact.com');
		expect(readLoginAttempt(attempt.cookie, attempt.state)?.returnTo).toBe('https://preview.mapfact.com');
	});
});

describe('isAllowedReturnOrigin', () => {

	it('sender kun til mapfact.com, projektets egne previews og lokal dev', () => {
		for (const origin of [
			'https://mapfact.com',
			'https://www.mapfact.com',
			'https://mapfact-ebb7s2s51-mindbardks-projects.vercel.app',
			'https://mapfact-git-fase-1-skelet-mindbardks-projects.vercel.app',
			'http://127.0.0.1:5173'
		]) {
			expect(isAllowedReturnOrigin(origin), origin).toBe(true);
		}
		for (const origin of [
			'http://mapfact.com',
			'https://mapfact.com.evil.com',
			'https://mapfact-x-otherteam-projects.vercel.app',
			'https://quiz-x-mindbardks-projects.vercel.app',
			'https://evil.com/?https://mapfact.com',
			'http://127.0.0.1:5174',
			'https://mapfact.test'
		]) {
			expect(isAllowedReturnOrigin(origin), origin).toBe(false);
		}
	});
});

describe('publicOrigin', () => {
	it('opgraderer kun til https bag en proxy og skifter aldrig host', () => {
		const behindProxy = new Headers({ 'x-forwarded-proto': 'https' });
		expect(publicOrigin(new URL('http://mapfact.test/admin'), behindProxy)).toBe('https://mapfact.test');
		expect(publicOrigin(new URL('http://localhost:5173/admin'), new Headers())).toBe('http://localhost:5173');
		expect(publicOrigin(new URL('https://mapfact.com/admin'), new Headers({ 'x-forwarded-proto': 'http' }))).toBe(
			'https://mapfact.com'
		);
	});
});

describe('emailFromIdToken', () => {
	it('giver den verificerede e-mail med små bogstaver', () => {
		expect(emailFromIdToken(idToken({}), config.clientId, NOW)).toBe('partner@gmail.com');
	});

	it('afviser fremmed app, forkert udsteder, udløbet token og ubekræftet e-mail', () => {
		for (const claims of [
			{ aud: 'another-app' },
			{ iss: 'https://evil.example' },
			{ exp: NOW - 1 },
			{ email_verified: false },
			{ email: undefined }
		]) {
			expect(() => emailFromIdToken(idToken(claims), config.clientId, NOW)).toThrow();
		}
		expect(() => emailFromIdToken('garbage', config.clientId, NOW)).toThrow();
	});
});

describe('exchangeCodeForEmail', () => {
	it('sender kode, verifier og secret til token-endpointet', async () => {
		const fetchFn = vi.fn(async () => Response.json({ id_token: idToken({}) }));
		const email = await exchangeCodeForEmail(
			fetchFn as unknown as typeof fetch,
			config,
			{ code: 'the-code', verifier: 'the-verifier', redirectUri: 'https://mapfact.com/cb' },
			NOW
		);
		expect(email).toBe('partner@gmail.com');
		const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://oauth2.googleapis.com/token');
		const body = new URLSearchParams(init.body as URLSearchParams);
		expect(body.get('code')).toBe('the-code');
		expect(body.get('code_verifier')).toBe('the-verifier');
		expect(body.get('client_secret')).toBe('secret');
		expect(body.get('grant_type')).toBe('authorization_code');
	});

	it('fejler med Googles fejlkode, når byttet afvises', async () => {
		const fetchFn = vi.fn(async () => Response.json({ error: 'invalid_grant' }, { status: 400 }));
		await expect(
			exchangeCodeForEmail(fetchFn as unknown as typeof fetch, config, { code: 'x', verifier: 'y', redirectUri: 'z' }, NOW)
		).rejects.toThrow('invalid_grant');
	});
});
