/**
 * Stand-in for $env/dynamic/private i tests. SvelteKits virtuelle modul
 * findes kun under vite-build, så vitest aliaser hertil (se vitest.config.ts).
 * Læser process.env direkte, hvilket er præcis hvad dynamic/private gør i drift.
 */
export const env = process.env as Record<string, string | undefined>;
