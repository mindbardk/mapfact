import { z } from 'zod';
import type { MapKind } from '$lib/server/db/schema';

/**
 * Korttype-specifik konfiguration (maps.config). Fase 1 kender kun statiske
 * kort; svg og points får deres skemaer i fase 2 og 3.
 */
const staticConfig = z.object({}).strict();

export type MapConfig = z.infer<typeof staticConfig>;

export class UnsupportedMapKindError extends Error {
	constructor(public kind: MapKind) {
		super('Map kind not supported yet');
	}
}

export function parseMapConfig(kind: MapKind, value: unknown): MapConfig {
	if (kind === 'static') return staticConfig.parse(value);
	throw new UnsupportedMapKindError(kind);
}
