import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cookies } from '@sveltejs/kit';
import { createHmac } from 'node:crypto';
import {
	authenticateAdmin,
	checkPassword,
	isCronAuthorized,
	isOwnerOnlyApiPath,
	isProtectedApiPath,
	setAdminSession
} from './admin';
import { signSession } from './admin-session';
import { API_TOKEN_LOGIN, PASSWORD_LOGIN } from './admin-users';
import type { Db } from './db';
import * as schema from './db/schema';
import { createTestDb } from './db/testing';
import { AppError } from './errors';

const SECRET = 'test-session-secret';
const PASSWORD = 'correct-password';

/** Minimal Cookies-stub: kun get/set/delete bruges af admin.ts. */
function fakeCookies(initial: Record<string, string> = {}) {
	const store = new Map(Object.entries(initial));
	const cookies = {
		get: (name: string) => store.get(name),
		set: (name: string, value: string) => store.set(name, value),
		delete: (name: string) => store.delete(name)
	} as unknown as Cookies;
	return { cookies, store };
}

let db: Db;

beforeAll(async () => {
	db = await createTestDb();
	await db.insert(schema.adminUsers).values({ email: 'helper@example.com', addedBy: 'owner@example.com' });
});

beforeEach(() => {
	process.env.SESSION_SECRET = SECRET;
	process.env.ADMIN_PASSWORD = PASSWORD;
});

afterEach(() => {
	delete process.env.SESSION_SECRET;
	delete process.env.ADMIN_PASSWORD;
});

describe('isProtectedApiPath', () => {
	it('beskytter admin-API-ruterne', () => {
		expect(isProtectedApiPath('/api/admin')).toBe(true);
		expect(isProtectedApiPath('/api/admin/maps')).toBe(true);
		expect(isProtectedApiPath('/api/admin/maps/12')).toBe(true);
		expect(isProtectedApiPath('/api/admin/avatar-entries/12')).toBe(true);
		expect(isProtectedApiPath('/api/admin/ai/questions')).toBe(true);
		expect(isProtectedApiPath('/api/admin/ai/distractor')).toBe(true);
	});

	it('rører ikke spillerens API', () => {
		expect(isProtectedApiPath('/api/maps/world/data')).toBe(false);
		expect(isProtectedApiPath('/api/attempt/abc/next')).toBe(false);
		expect(isProtectedApiPath('/api/attempt/abc/answer')).toBe(false);
	});

	it('matcher på segmentgrænse, ikke på præfiks alene', () => {
		// En fremtidig offentlig rute må ikke fanges ved et uheld.
		expect(isProtectedApiPath('/api/admin-status')).toBe(false);
		expect(isProtectedApiPath('/api/administrator')).toBe(false);
	});

	it('beskytter ikke admin-SIDERNE — de guardes af layoutet', () => {
		expect(isProtectedApiPath('/admin')).toBe(false);
		expect(isProtectedApiPath('/admin/avatar')).toBe(false);
	});
});

describe('authenticateAdmin', () => {
	const NOW = Date.UTC(2026, 9, 23, 12);
	const OWNER = 'owner@example.com';
	const HELPER = 'helper@example.com';
	/** Hjælperlisten: kun HELPER findes (beforeAll). */
	const loadDb = vi.fn(async () => db);

	beforeEach(() => {
		process.env.ADMIN_OWNER_EMAILS = `Someone@else.com, ${OWNER.toUpperCase()}`;
		loadDb.mockClear();
	});
	afterEach(() => {
		delete process.env.ADMIN_OWNER_EMAILS;
		delete process.env.ADMIN_API_TOKEN;
	});

	function sessionFor(email: string, issuedAt = NOW, secret = SECRET) {
		return fakeCookies({ mapfact_admin: signSession(secret, email, issuedAt) }).cookies;
	}

	it('kender ejeren fra ADMIN_OWNER_EMAILS uden at røre databasen', async () => {
		expect(await authenticateAdmin(sessionFor(OWNER), null, loadDb, NOW)).toEqual({ email: OWNER, role: 'owner' });
		expect(loadDb).not.toHaveBeenCalled();
	});

	it('giver en hjælper fra admin_users rollen helper', async () => {
		expect(await authenticateAdmin(sessionFor(HELPER), null, loadDb, NOW)).toEqual({ email: HELPER, role: 'helper' });
	});

	it('lukker en fjernet hjælper ude, selvom cookien stadig er gyldig', async () => {
		expect(await authenticateAdmin(sessionFor('removed@example.com'), null, loadDb, NOW)).toBeNull();
	});

	it('afviser uden cookie, med forfalsket eller fremmed signatur og med den gamle faste cookie', async () => {
		const forged = signSession(SECRET, HELPER, NOW).replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'));
		for (const cookies of [
			fakeCookies().cookies,
			fakeCookies({ mapfact_admin: forged }).cookies,
			sessionFor(OWNER, NOW, 'another-secret'),
			fakeCookies({ mapfact_admin: createHmac('sha256', SECRET).update('admin').digest('hex') }).cookies,
			fakeCookies({ mapfact_admin: 'too-short' }).cookies
		]) {
			expect(await authenticateAdmin(cookies, null, loadDb, NOW)).toBeNull();
		}
	});

	it('afviser en udløbet session (over 30 dage) og en fra fremtiden', async () => {
		const day = 24 * 60 * 60 * 1000;
		expect(await authenticateAdmin(sessionFor(OWNER, NOW - 29 * day), null, loadDb, NOW)).not.toBeNull();
		expect(await authenticateAdmin(sessionFor(OWNER, NOW - 31 * day), null, loadDb, NOW)).toBeNull();
		expect(await authenticateAdmin(sessionFor(OWNER, NOW + 1000), null, loadDb, NOW)).toBeNull();
	});

	it('godtager adgangskode-sessionen kun, så længe ADMIN_PASSWORD er sat', async () => {
		expect(await authenticateAdmin(sessionFor(PASSWORD_LOGIN), null, loadDb, NOW)).toEqual({
			email: PASSWORD_LOGIN,
			role: 'owner'
		});
		delete process.env.ADMIN_PASSWORD;
		expect(await authenticateAdmin(sessionFor(PASSWORD_LOGIN), null, loadDb, NOW)).toBeNull();
	});


	it('godtager scripts med Bearer ADMIN_API_TOKEN, men aldrig uden en nøgle', async () => {
		const none = fakeCookies().cookies;
		expect(await authenticateAdmin(none, 'Bearer ', loadDb, NOW)).toBeNull();
		process.env.ADMIN_API_TOKEN = 'script-token';
		expect(await authenticateAdmin(none, 'Bearer script-token', loadDb, NOW)).toEqual({
			email: API_TOKEN_LOGIN,
			role: 'owner'
		});
		expect(await authenticateAdmin(none, 'Bearer wrong-token', loadDb, NOW)).toBeNull();
	});

	it('kaster hvis SESSION_SECRET mangler — fejler aldrig åbent', async () => {
		const cookies = sessionFor(OWNER);
		delete process.env.SESSION_SECRET;
		await expect(authenticateAdmin(cookies, null, loadDb, NOW)).rejects.toThrow(AppError);
	});
});

describe('setAdminSession', () => {
	it('sætter en cookie som authenticateAdmin accepterer', async () => {
		process.env.ADMIN_OWNER_EMAILS = 'owner@example.com';
		const { cookies } = fakeCookies();
		setAdminSession(cookies, 'owner@example.com');
		expect(await authenticateAdmin(cookies, null, async () => db)).toEqual({
			email: 'owner@example.com',
			role: 'owner'
		});
		delete process.env.ADMIN_OWNER_EMAILS;
	});
});

describe('isOwnerOnlyApiPath', () => {
	it('gælder brugerstyringen på segmentgrænse', () => {
		expect(isOwnerOnlyApiPath('/api/admin/users')).toBe(true);
		expect(isOwnerOnlyApiPath('/api/admin/users/a%40b.com')).toBe(true);
		expect(isOwnerOnlyApiPath('/api/admin/users-export')).toBe(false);
		expect(isOwnerOnlyApiPath('/api/admin/maps')).toBe(false);
	});
});

describe('checkPassword', () => {
	it('accepterer den korrekte adgangskode', () => {
		expect(checkPassword(PASSWORD)).toBe(true);
	});

	it('afviser forkert adgangskode af samme længde', () => {
		expect(checkPassword('wrong-password')).toBe(false);
	});

	it('afviser adgangskode af anden længde uden at kaste', () => {
		expect(checkPassword('short')).toBe(false);
		expect(checkPassword(`${PASSWORD}-extra`)).toBe(false);
	});

	it('afviser alt når ADMIN_PASSWORD ikke er sat', () => {
		delete process.env.ADMIN_PASSWORD;
		expect(checkPassword('')).toBe(false);
		expect(checkPassword(PASSWORD)).toBe(false);
	});
});

describe('isCronAuthorized', () => {
	afterEach(() => {
		delete process.env.CRON_SECRET;
	});

	it('godtager kun præcis "Bearer <secret>"', () => {
		process.env.CRON_SECRET = 'cron-secret';
		expect(isCronAuthorized('Bearer cron-secret')).toBe(true);
		expect(isCronAuthorized('Bearer wrong')).toBe(false);
		expect(isCronAuthorized('cron-secret')).toBe(false);
		expect(isCronAuthorized('Bearer cron-secret ')).toBe(false);
		expect(isCronAuthorized(null)).toBe(false);
	});

	it('afviser alt, når CRON_SECRET mangler eller er tom', () => {
		for (const secret of [undefined, '']) {
			if (secret === undefined) delete process.env.CRON_SECRET;
			else process.env.CRON_SECRET = secret;
			expect(isCronAuthorized(null)).toBe(false);
			expect(isCronAuthorized('')).toBe(false);
			expect(isCronAuthorized('Bearer ')).toBe(false);
			expect(isCronAuthorized('Bearer undefined')).toBe(false);
		}
	});
});
