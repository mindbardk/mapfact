/**
 * Beskederne til `/admin/login?error=…` fra Google-callbacket og handoff'en.
 * Bor her, så ruterne, der sender fejlen, og login-siden, der viser den, er enige.
 */
export const LOGIN_ERRORS: Record<string, string> = {
	'not-allowed': "This Google account doesn't have access. Ask the owner to add it.",
	cancelled: 'Google sign-in was cancelled.',
	expired: 'The sign-in took too long or was started in another tab. Try again.',
	failed: "Google sign-in didn't work. Try again.",
	'not-configured': 'Google sign-in is not set up.'
};

/** `/admin/login?error=…` på `origin` (tom = samme host). */
export function loginErrorUrl(origin: string, code: string, email?: string): string {
	const params = new URLSearchParams({ error: code });
	if (email) params.set('email', email);
	return `${origin}/admin/login?${params}`;
}

export function loginErrorMessage(code: string | null, email: string | null): string | null {
	if (!code) return null;
	const message = LOGIN_ERRORS[code] ?? LOGIN_ERRORS.failed;
	return code === 'not-allowed' && email ? `${message} (${email})` : message;
}
