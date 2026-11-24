import { defineConfig } from '@playwright/test';

const PORT = 5174;
/** Kun til e2e: overstyrer `.env`, så admin-specs selv kan signere cookien. */
export const E2E_SESSION_SECRET = 'e2e-session-secret';
/** Ejeren i e2e (ADMIN_OWNER_EMAILS). `tests/e2e/admin-auth.ts` signerer en session for den. */
export const E2E_OWNER_EMAIL = 'owner@e2e.test';
/** Scripts' `Authorization: Bearer $ADMIN_API_TOKEN` i e2e. */
export const E2E_API_TOKEN = 'e2e-api-token';
/** Vercel-cronens `Authorization: Bearer $CRON_SECRET` i e2e. */
export const E2E_CRON_SECRET = 'e2e-cron-secret';

export default defineConfig({
	testDir: './tests/e2e',
	globalSetup: './tests/e2e/global-setup.ts',
	fullyParallel: false,
	retries: 0,
	reporter: 'list',
	use: {
		baseURL: `http://127.0.0.1:${PORT}`,
		trace: 'retain-on-failure'
	},
	webServer: {
		command: 'npm run dev -- --port ' + PORT,
		port: PORT,
		reuseExistingServer: false,
		env: {
			PGLITE_DIR: './.data/e2e',
			DATABASE_URL: '',
			SESSION_SECRET: E2E_SESSION_SECRET,
			ADMIN_OWNER_EMAILS: E2E_OWNER_EMAIL,
			ADMIN_API_TOKEN: E2E_API_TOKEN,
			CRON_SECRET: E2E_CRON_SECRET
		}
	}
});
