import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { isHttpError } from '@sveltejs/kit';
import { handle, handleLoad } from './api';
import { AppError } from './errors';

/** Request med JSON-krop, som handle() kan parse. */
function jsonRequest(body: unknown) {
	return new Request('http://localhost/api/test', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

/** Request hvis krop ikke er gyldig JSON. */
function brokenRequest() {
	return new Request('http://localhost/api/test', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: '{ not valid json'
	});
}

const schema = z.object({
	name: z.string().trim().min(1, 'Name is required'),
	count: z.number().int().min(1).max(10).default(1)
});

describe('handle uden skema', () => {
	it('pakker returværdien som JSON med status 200', async () => {
		const res = await handle(async () => ({ ok: true }));

		expect(res.status).toBe(200);
		await expect(res.json()).resolves.toEqual({ ok: true });
	});

	it('oversætter AppError til status og { error }', async () => {
		const res = await handle(async () => {
			throw new AppError(404, 'Map not found');
		});

		expect(res.status).toBe(404);
		await expect(res.json()).resolves.toEqual({ error: 'Map not found' });
	});

	it('lader andre fejl boble, så de ikke skjules som 200', async () => {
		await expect(
			handle(async () => {
				throw new TypeError('programming error');
			})
		).rejects.toThrow(TypeError);
	});
});

describe('handle med skema', () => {
	it('giver den parsede krop videre til handleren', async () => {
		const res = await handle(schema, jsonRequest({ name: '  Jesper  ' }), async (body) => body);

		// Skemaets trim og default slår igennem.
		await expect(res.json()).resolves.toEqual({ name: 'Jesper', count: 1 });
	});

	it('afviser en krop der ikke matcher skemaet med 400', async () => {
		const res = await handle(schema, jsonRequest({ name: '' }), async () => ({ ok: true }));

		expect(res.status).toBe(400);
		await expect(res.json()).resolves.toEqual({ error: 'Name is required' });
	});

	it('afviser malformet JSON med en forståelig besked, ikke zods rå tekst', async () => {
		const res = await handle(schema, brokenRequest(), async () => ({ ok: true }));

		expect(res.status).toBe(400);
		await expect(res.json()).resolves.toEqual({ error: 'Invalid JSON in request body' });
	});

	it('kalder ikke handleren når body er ugyldig', async () => {
		let kaldt = false;
		await handle(schema, jsonRequest({ name: '' }), async () => {
			kaldt = true;
			return { ok: true };
		});

		expect(kaldt).toBe(false);
	});

	it('oversætter AppError fra handleren som uden skema', async () => {
		const res = await handle(schema, jsonRequest({ name: 'x' }), async () => {
			throw new AppError(409, 'Attempt is finished');
		});

		expect(res.status).toBe(409);
		await expect(res.json()).resolves.toEqual({ error: 'Attempt is finished' });
	});
});

describe('handleLoad', () => {
	it('giver returværdien uændret igennem', async () => {
		await expect(handleLoad(async () => ({ map: 'demo' }))).resolves.toEqual({ map: 'demo' });
	});

	it('oversætter AppError til SvelteKits error()', async () => {
		try {
			await handleLoad(async () => {
				throw new AppError(404, 'Map not found');
			});
			expect.unreachable('handleLoad skulle have kastet');
		} catch (e) {
			// SvelteKits error() kaster et HttpError-objekt, ikke en AppError.
			expect(isHttpError(e)).toBe(true);
			expect((e as { status: number }).status).toBe(404);
			expect((e as { body: { message: string } }).body.message).toBe('Map not found');
		}
	});

	it('lader andre fejl boble uændret', async () => {
		await expect(
			handleLoad(async () => {
				throw new TypeError('programming error');
			})
		).rejects.toThrow(TypeError);
	});
});
