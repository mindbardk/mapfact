/** "24 Nov 2026" i UTC, så server og klient viser det samme. */
export function formatDate(date: Date): string {
	return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
