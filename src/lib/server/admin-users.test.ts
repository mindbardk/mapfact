import { beforeAll, describe, expect, it } from 'vitest';
import type { Db } from './db';
import { createTestDb } from './db/testing';
import { AppError } from './errors';
import { addAdminUser, adminRoleOf, listAdminUsers, parseOwnerEmails, removeAdminUser } from './admin-users';

let db: Db;

beforeAll(async () => {
	db = await createTestDb();
});

const env = { ownerEmails: ['owner@example.com'], passwordLogin: false };

describe('parseOwnerEmails', () => {
	it('splitter på komma, trimmer og laver små bogstaver', () => {
		expect(parseOwnerEmails(' Owner@Example.com, ,second@x.dk ')).toEqual(['owner@example.com', 'second@x.dk']);
		expect(parseOwnerEmails(undefined)).toEqual([]);
	});
});

describe('hjælperlisten', () => {
	it('tilføjer med små bogstaver, giver rollen helper og fjerner igen', async () => {
		const added = await addAdminUser(db, '  Partner@Gmail.com ', 'owner@example.com', env.ownerEmails);
		expect(added.email).toBe('partner@gmail.com');
		expect(await adminRoleOf('PARTNER@gmail.com', env, async () => db)).toBe('helper');
		expect((await listAdminUsers(db)).map((u) => u.email)).toContain('partner@gmail.com');

		await removeAdminUser(db, 'partner@GMAIL.com');
		expect(await adminRoleOf('partner@gmail.com', env, async () => db)).toBeNull();
	});

	it('afviser en dublet, en ejer og fjernelse af en ukendt', async () => {
		await addAdminUser(db, 'friend@example.com', 'owner@example.com', env.ownerEmails);
		await expect(addAdminUser(db, 'FRIEND@example.com', 'owner@example.com', env.ownerEmails)).rejects.toMatchObject({
			status: 409
		});
		await expect(addAdminUser(db, 'owner@example.com', 'owner@example.com', env.ownerEmails)).rejects.toBeInstanceOf(
			AppError
		);
		await expect(removeAdminUser(db, 'nobody@example.com')).rejects.toMatchObject({ status: 404 });
	});

	it('ejeren slås op uden databasen', async () => {
		const role = await adminRoleOf('Owner@Example.com', env, async () => {
			throw new Error('must not load the database');
		});
		expect(role).toBe('owner');
	});
});
