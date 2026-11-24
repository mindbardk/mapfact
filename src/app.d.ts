// Se https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** Den indloggede admin (sat af hooks.server.ts for /admin og /api/admin), ellers null. */
			admin: import('$lib/server/admin-users').AdminIdentity | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
