import { signSession } from '../../src/lib/server/admin-session.ts';
import { E2E_OWNER_EMAIL, E2E_SESSION_SECRET } from '../../playwright.config.ts';

/** Værdien af `mapfact_admin` for ejeren, som efter et Google-login. */
export const adminCookie = signSession(E2E_SESSION_SECRET, E2E_OWNER_EMAIL, Date.now());
