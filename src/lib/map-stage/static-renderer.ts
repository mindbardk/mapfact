import { imageUrl } from '$lib/image-url';
import type { MapRenderer, StageMap } from './renderer';
import { clampPan, nextZoom } from './zoom';

/** Statisk kort: et billede, der zoomes og panoreres med CSS-transform. */
export function createStaticRenderer(map: StageMap): MapRenderer {
	let img: HTMLImageElement | null = null;
	let container: HTMLElement | null = null;
	let zoom = 1;
	let pan = { x: 0, y: 0 };
	let drag: { id: number; x: number; y: number; start: { x: number; y: number } } | null = null;

	function apply() {
		if (!img || !container) return;
		pan = clampPan(pan, zoom, { w: container.clientWidth, h: container.clientHeight });
		img.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
		img.style.cursor = zoom > 1 ? 'grab' : '';
	}

	function onPointerDown(event: PointerEvent) {
		if (zoom === 1 || !img) return;
		drag = { id: event.pointerId, x: event.clientX, y: event.clientY, start: { ...pan } };
		img.setPointerCapture(event.pointerId);
	}
	function onPointerMove(event: PointerEvent) {
		if (!drag || event.pointerId !== drag.id) return;
		pan = { x: drag.start.x + event.clientX - drag.x, y: drag.start.y + event.clientY - drag.y };
		apply();
	}
	function onPointerUp(event: PointerEvent) {
		if (drag?.id === event.pointerId) drag = null;
	}

	return {
		async mount(el) {
			if (!map.staticImage) throw new Error('Static map has no image');
			container = el;
			img = document.createElement('img');
			img.dataset.ref = 'map-static';
			img.alt = map.altText;
			img.draggable = false;
			img.src = imageUrl(map.staticImage);
			img.style.cssText =
				'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;touch-action:none;user-select:none;';
			img.addEventListener('pointerdown', onPointerDown);
			img.addEventListener('pointermove', onPointerMove);
			img.addEventListener('pointerup', onPointerUp);
			img.addEventListener('pointercancel', onPointerUp);
			await img.decode();
			el.append(img);
			apply();
		},
		destroy() {
			img?.remove();
			img = null;
			container = null;
		},
		zoomIn() {
			zoom = nextZoom(zoom, 1);
			apply();
		},
		zoomOut() {
			zoom = nextZoom(zoom, -1);
			apply();
		},
		reset() {
			zoom = 1;
			pan = { x: 0, y: 0 };
			apply();
		}
	};
}
