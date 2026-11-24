<script lang="ts">
	import { imageUrl, type ImageRef } from '$lib/image-url';
	import { formatMapNo } from '$lib/map-no';
	import type { MapKind } from '$lib/server/db/schema';

	type StageProps = {
		map: {
			no: number;
			kind: MapKind;
			title: string;
			altText: string;
			staticImage: ImageRef | null;
			fallbackImage: ImageRef | null;
		};
	};
	let { map }: StageProps = $props();

	/** Det, der vises først (LCP): fallback-billedet, ellers kortets eget billede. */
	const firstImage = $derived(map.fallbackImage ?? map.staticImage);
</script>

<svelte:head>
	{#if firstImage}
		<link rel="preload" as="image" href={imageUrl(firstImage)} fetchpriority="high" />
	{/if}
</svelte:head>

<section id="map" data-ref="map-stage" class="stage" aria-label="Map: {map.title}">
	{#if firstImage}
		<img
			data-ref="map-fallback"
			src={imageUrl(firstImage)}
			alt={map.altText}
			width={firstImage.width}
			height={firstImage.height}
			fetchpriority="high"
			decoding="async"
			class="stage-image"
		/>
	{:else}
		<p class="stage-message">Loading map {formatMapNo(map.no)}…</p>
	{/if}
	<div class="crop-marks stage-crop" aria-hidden="true"></div>
</section>

<style>
	.stage {
		position: relative;
		height: 720px;
		overflow: hidden;
		background: var(--color-sea);
		border-block: 2px solid var(--color-ink);
	}
	.stage-image {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.stage-crop {
		position: absolute;
		inset: 20px;
		padding: 0;
		pointer-events: none;
	}
	.stage-message {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		font-family: var(--font-mono);
		font-size: 13px;
		color: var(--color-muted);
	}
	@media (max-width: 640px) {
		.stage {
			height: 500px;
		}
	}
</style>
