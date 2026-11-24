/** Kortnummeret som "№ 0412" (mindst fire cifre). Figurer i artiklen får et suffiks: "№ 0412-B". */
export function formatMapNo(no: number, suffix?: string): string {
	const digits = String(no).padStart(4, '0');
	return suffix ? `№ ${digits}-${suffix}` : `№ ${digits}`;
}
