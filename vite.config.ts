import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// `src/lib/server/db` læser process.env (den deles med tsx-scripts, hvor
// SvelteKits $env ikke findes), og Vite lægger ikke selv `.env` i process.env.
// Allerede satte variabler overskrives ikke; på Vercel findes filen ikke.
try {
	process.loadEnvFile();
} catch {
	// Ingen .env: miljøet leverer selv variablerne (Vercel, CI).
}

export default defineConfig({
	server: {
		host: '127.0.0.1',
		port: 5173,
		strictPort: true
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Runes-tilstand i hele projektet, undtagen biblioteker. Kan fjernes i Svelte 6.
				runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
			},
			adapter: adapter(),
			typescript: {
				config: (config) => {
					config.include.push('../drizzle.config.ts');
				}
			}
		})
	]
});
