import type { ImageRef } from '$lib/image-url';
import type { MapKind } from '$lib/server/db/schema';

/** Det kortscenen ved om kortet. Fase 2 og 3 udvider det med data til svg og points. */
export type StageMap = {
	no: number;
	kind: MapKind;
	title: string;
	altText: string;
	staticImage: ImageRef | null;
};

/**
 * En renderer tegner ét kort i kortscenen. Interfacet holdes minimalt og
 * udvides i kortrunden (tooltip, tidsskyder, filtre).
 */
export interface MapRenderer {
	/** Afviser, hvis kortet ikke kan vises. */
	mount(el: HTMLElement): Promise<void>;
	destroy(): void;
	zoomIn(): void;
	zoomOut(): void;
	reset(): void;
}

export type RendererFactory = (map: StageMap) => MapRenderer;

/** Indlæser rendereren for korttypen dynamisk, så kortkoden først hentes efter LCP. */
export async function loadRenderer(kind: MapKind): Promise<RendererFactory> {
	switch (kind) {
		case 'static':
			return (await import('./static-renderer')).createStaticRenderer;
		default:
			throw new Error(`No renderer for map kind "${kind}" yet`);
	}
}
