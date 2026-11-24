/** Zoomtrin for kort, der zoomes med CSS-transform (statiske kort). */
export const ZOOM_STEPS = [1, 1.5, 2.25, 3.375] as const;

/** Næste trin i retningen `dir`. En værdi mellem trin låses til nærmeste trin i retningen. */
export function nextZoom(zoom: number, dir: 1 | -1): number {
	if (dir === 1) return ZOOM_STEPS.find((step) => step > zoom) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
	return [...ZOOM_STEPS].reverse().find((step) => step < zoom) ?? ZOOM_STEPS[0];
}

/**
 * Begrænser panoreringen, så det skalerede billede altid dækker scenen.
 * Ved zoom z kan billedet flyttes (z - 1) * bredde / 2 til hver side.
 */
export function clampPan(
	pan: { x: number; y: number },
	zoom: number,
	box: { w: number; h: number }
): { x: number; y: number } {
	const maxX = ((zoom - 1) * box.w) / 2;
	const maxY = ((zoom - 1) * box.h) / 2;
	const clamp = (value: number, max: number) => Math.min(max, Math.max(-max, value)) + 0;
	return { x: clamp(pan.x, maxX), y: clamp(pan.y, maxY) };
}
