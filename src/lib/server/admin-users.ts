import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from './db';
import * as schema from './db/schema';
import { AppError } from './errors';

/**
 * Hvem må logge ind i admin. Ejeren står i `ADMIN_OWNER_EMAILS` (kommasepareret
 * env), hjælperne i `admin_users`, som kun ejeren kan ændre (`/admin/users`).
 * Hjælpere kan alt i admin undtagen at styre brugerne.
 */

export type AdminRole = 'owner' | 'helper';
export type AdminIdentity = { email: string; role: AdminRole };

/**
 * Sessionens "e-mail" ved login med adgangskode (nødadgangen). Gælder kun, så
 * længe ADMIN_PASSWORD er sat — fjernes den, er alle sådanne sessioner døde.
 */
export const PASSWORD_LOGIN = 'password-login';
/** Scripts med `Authorization: Bearer $ADMIN_API_TOKEN`. */
export const API_TOKEN_LOGIN = 'api-token';

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

export function parseOwnerEmails(value: string | undefined): string[] {
	return (value ?? '').split(',').map(normalizeEmail).filter(Boolean);
}

/**
 * Rollen for en session-e-mail, eller null hvis den ikke (længere) har adgang.
 * Ejeren slås op uden databasen; `loadDb` kaldes kun for hjælpere.
 */
export async function adminRoleOf(
	email: string,
	env: { ownerEmails: string[]; passwordLogin: boolean },
	loadDb: () => Promise<Db>
): Promise<AdminRole | null> {
	if (email === PASSWORD_LOGIN) return env.passwordLogin ? 'owner' : null;
	const normalized = normalizeEmail(email);
	if (env.ownerEmails.includes(normalized)) return 'owner';
	const rows = await (await loadDb())
		.select({ email: schema.adminUsers.email })
		.from(schema.adminUsers)
		.where(eq(schema.adminUsers.email, normalized))
		.limit(1);
	return rows.length > 0 ? 'helper' : null;
}

export type AdminUser = { email: string; addedBy: string; createdAt: string };

export async function listAdminUsers(db: Db): Promise<AdminUser[]> {
	const rows = await db.select().from(schema.adminUsers).orderBy(asc(schema.adminUsers.email));
	return rows.map((r) => ({ email: r.email, addedBy: r.addedBy, createdAt: r.createdAt.toISOString() }));
}

export const adminUserInputSchema = z.object({
	email: z.string().trim().pipe(z.email('Enter a valid email address').max(254))
});

export async function addAdminUser(
	db: Db,
	email: string,
	addedBy: string,
	ownerEmails: string[]
): Promise<AdminUser> {
	const normalized = normalizeEmail(email);
	if (ownerEmails.includes(normalized)) throw new AppError(409, 'That address is already an owner');
	const [row] = await db
		.insert(schema.adminUsers)
		.values({ email: normalized, addedBy })
		.onConflictDoNothing()
		.returning();
	if (!row) throw new AppError(409, 'That address already has access');
	return { email: row.email, addedBy: row.addedBy, createdAt: row.createdAt.toISOString() };
}

export async function removeAdminUser(db: Db, email: string): Promise<void> {
	const deleted = await db
		.delete(schema.adminUsers)
		.where(eq(schema.adminUsers.email, normalizeEmail(email)))
		.returning();
	if (deleted.length === 0) throw new AppError(404, 'No helper with that address');
}
