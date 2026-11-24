import { describe, expect, it } from 'vitest';
import { HANDOFF_MAX_AGE_MS, signHandoff, verifyHandoff } from './admin-session';

const SECRET = 'shared-secret';
const NOW = Date.UTC(2026, 9, 23, 12);
const PREVIEW = 'https://mapfact-abc-mindbardks-projects.vercel.app';

describe('handoff-nøglen', () => {
	it('gælder for den origin, den er udstedt til, i 60 s', () => {
		const token = signHandoff(SECRET, 'owner@example.com', NOW, PREVIEW);
		expect(verifyHandoff(SECRET, token, PREVIEW, NOW + 1000)).toBe('owner@example.com');
		expect(verifyHandoff(SECRET, token, PREVIEW, NOW + HANDOFF_MAX_AGE_MS + 1)).toBeNull();
	});

	it('kan ikke bruges på en anden origin, med en anden hemmelighed eller forfalsket', () => {
		const token = signHandoff(SECRET, 'owner@example.com', NOW, PREVIEW);
		expect(verifyHandoff(SECRET, token, 'https://mapfact-x-mindbardks-projects.vercel.app', NOW)).toBeNull();
		expect(verifyHandoff('local-secret', token, PREVIEW, NOW)).toBeNull();
		const otherEmail = `${Buffer.from('attacker@example.com').toString('base64url')}.${token.split('.').slice(1).join('.')}`;
		expect(verifyHandoff(SECRET, otherEmail, PREVIEW, NOW)).toBeNull();
		expect(verifyHandoff(SECRET, 'garbage', PREVIEW, NOW)).toBeNull();
	});
});
