/**
 * Serverens fælles fejltype. Domænemoduler kaster den, og handle()/handleLoad()
 * i api.ts oversætter `status` til HTTP.
 */
export class AppError extends Error {
	constructor(
		public status: number,
		message: string
	) {
		super(message);
	}
}
