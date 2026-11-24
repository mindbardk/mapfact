<script lang="ts">
	import { onMount } from 'svelte';
	import { imageUrl, type ImageRef } from '$lib/image-url';
	import { formatMapNo } from '$lib/map-no';
	import { loadRenderer, type MapRenderer, type StageMap } from '$lib/map-stage/renderer';

	let { map }: { map: StageMap & { fallbackImage: ImageRef | null } } = $props();

	/** Det, der vises først (LCP): fallback-billedet, ellers kortets eget billede. */
	const firstImage = $derived(map.fallbackImage ?? map.staticImage);

	let stage: HTMLElement;
	let layer: HTMLElement;
	let renderer: MapRenderer | null = null;
	let status = $state<'loading' | 'ready' | 'error'>('loading');

	async function start() {
		renderer?.destroy();
		renderer = null;
		status = 'loading';
		try {
			const create = await loadRenderer(map.kind);
			const next = create(map);
			await next.mount(layer);
			renderer = next;
			status = 'ready';
		} catch {
			status = 'error';
		}
	}

	onMount(() => {
		start();
		return () => renderer?.destroy();
	});

	function toggleFullscreen() {
		if (document.fullscreenElement) document.exitFullscreen();
		else stage.requestFullscreen?.();
	}

	/** Uden fallback-billede er der intet at falde tilbage på: vis fejlen. */
	const showError = $derived(status === 'error' && !map.fallbackImage);
</script>

<svelte:head>
	{#if firstImage}
		<link rel="preload" as="image" href={imageUrl(firstImage)} fetchpriority="high" />
	{/if}
</svelte:head>

<section bind:this={stage} id="map" data-ref="map-stage" class="stage" aria-label="Map: {map.title}">
	<p class="stage-message">Loading map {formatMapNo(map.no)}…</p>

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
			class:hidden={status === 'ready' || showError}
		/>
	{/if}

	<div bind:this={layer} class="stage-layer" class:hidden={status !== 'ready'}></div>

	{#if showError}
		<div class="stage-error" role="alert">
			<p>The map could not load</p>
			<button type="button" class="retry" onclick={start}>Try again</button>
		</div>
	{/if}

	<div class="crop-marks stage-crop" aria-hidden="true"></div>

	{#if !showError}
		<div class="tools">
			<button type="button" aria-label="Zoom in" onclick={() => renderer?.zoomIn()}>
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
			</button>
			<button type="button" aria-label="Zoom out" onclick={() => renderer?.zoomOut()}>
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /></svg>
			</button>
			<button type="button" aria-label="Reset view" onclick={() => renderer?.reset()}>
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" /></svg>
			</button>
			<button type="button" aria-label="Full screen" onclick={toggleFullscreen}>
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
			</button>
		</div>
	{/if}
</section>

<style>
	.stage {
		position: relative;
		height: 720px;
		overflow: hidden;
		background: var(--color-sea);
		border-block: 2px solid var(--color-ink);
	}
	.stage:fullscreen {
		height: 100vh;
		border: 0;
	}
	.stage-image,
	.stage-layer {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.stage-image {
		object-fit: cover;
	}
	.stage-layer {
		overflow: hidden;
	}
	.hidden {
		display: none;
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
	.stage-error {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 16px;
		background: var(--color-sea);
		font-family: var(--font-mono);
		font-size: 13px;
		color: var(--color-ink);
	}
	.retry {
		height: 44px;
		padding-inline: 18px;
		border: 1px solid var(--color-ink);
		background: var(--color-surface);
		font-family: var(--font-mono);
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
	}
	.retry:hover {
		background: var(--color-ink);
		color: #fff;
	}
	.tools {
		position: absolute;
		top: 36px;
		right: 36px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.tools button {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border: 1px solid var(--color-ink);
		background: var(--color-surface);
		color: var(--color-ink);
		cursor: pointer;
	}
	.tools button:hover,
	.tools button:active {
		background: var(--color-ink);
		color: #fff;
	}
	.tools svg {
		width: 24px;
		height: 24px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
	}
	@media (max-width: 640px) {
		.stage {
			height: 500px;
		}
		.tools {
			top: 28px;
			right: 28px;
		}
	}
</style>
