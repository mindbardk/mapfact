import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

// Selvstændig testconfig uden SvelteKit-plugin. Svelte-pluginet er med, så
// runes i .svelte.ts-moduler kompileres — det er sådan spilforløbet testes.
export default defineConfig({
	plugins: [svelte()],
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
			// SvelteKits virtuelle env-modul findes ikke uden for vite-build.
			'$env/dynamic/private': fileURLToPath(
				new URL('./src/lib/server/env-stub.ts', import.meta.url)
			)
		},
		conditions: ['browser']
	},
	test: {
		include: ['src/**/*.test.ts']
	}
});
