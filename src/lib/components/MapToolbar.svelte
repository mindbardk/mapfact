<script lang="ts">
	import { formatMapNo } from '$lib/map-no';

	let {
		no,
		centerLabel,
		projectionLabel,
		sourceText,
		sourceUrl
	}: {
		no: number;
		centerLabel: string | null;
		projectionLabel: string | null;
		sourceText: string | null;
		sourceUrl: string | null;
	} = $props();

	const meta = $derived([formatMapNo(no), centerLabel, projectionLabel].filter(Boolean).join(' · '));
</script>

<div data-ref="map-toolbar" class="border-b-2 border-ink bg-surface">
	<div class="page flex min-h-14 flex-wrap items-center gap-x-2 gap-y-1 py-3 font-mono text-[12px] font-medium text-ink">
		<span>{meta}</span>
		{#if sourceText}
			<span aria-hidden="true">·</span>
			<span class="text-muted">
				Source:
				{#if sourceUrl}
					<a href={sourceUrl} rel="noopener" class="underline underline-offset-2">{sourceText}</a>
				{:else}
					{sourceText}
				{/if}
			</span>
		{/if}
	</div>
</div>
