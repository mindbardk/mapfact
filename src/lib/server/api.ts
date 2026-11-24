import { error, json } from '@sveltejs/kit';
import type { ZodType } from 'zod';
import { AppError } from './errors';

/**
 * HTTP-kanten for /api/*: her — og kun her — oversættes domænefejl til svar.
 * Endpoints kalder domænelogik og lader denne fil bestemme formen på svaret.
 */

/** Kør en handler og oversæt AppError til et JSON-fejlsvar. */
export function handle<T>(fn: () => Promise<T>): Promise<Response>;
/**
 * Parse requestens krop mod et skema og kør handleren med resultatet.
 *
 * Skemafejl og malformet JSON giver begge 400 med skemaets egen (engelske)
 * besked (appen er engelsk).
 */
export function handle<T, B>(
	schema: ZodType<B>,
	request: Request,
	fn: (body: B) => Promise<T>
): Promise<Response>;
export async function handle<T, B>(
	fnOrSchema: (() => Promise<T>) | ZodType<B>,
	request?: Request,
	fnWithBody?: (body: B) => Promise<T>
): Promise<Response> {
	try {
		if (typeof fnOrSchema === 'function') {
			return json(await fnOrSchema());
		}
		// En malformet krop skal ikke give zods rå "expected object, received
		// null" — den siger intet brugbart om hvad der er galt.
		let raw: unknown;
		try {
			raw = await request!.json();
		} catch {
			throw new AppError(400, 'Invalid JSON in request body');
		}
		const parsed = fnOrSchema.safeParse(raw);
		if (!parsed.success) {
			throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
		}
		return json(await fnWithBody!(parsed.data));
	} catch (e) {
		if (e instanceof AppError) return json({ error: e.message }, { status: e.status });
		throw e;
	}
}

/**
 * Load-funktionernes pendant til handle(): oversætter AppError til SvelteKits
 * error(), så et manglende kort bliver en 404-side frem for en ubehandlet fejl.
 */
export async function handleLoad<T>(fn: () => Promise<T>): Promise<T> {
	try {
		return await fn();
	} catch (e) {
		if (e instanceof AppError) error(e.status, e.message);
		throw e;
	}
}
