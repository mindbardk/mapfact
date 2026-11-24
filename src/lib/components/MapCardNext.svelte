<script lang="ts">
	import { imageUrl } from '$lib/image-url';
	import { formatMapNo } from '$lib/map-no';
	import type { MapCard } from '$lib/server/maps';

	let { card }: { card: MapCard } = $props();
</script>

<aside data-ref="next-map" class="bg-ink p-5 text-white">
	<p class="label mb-4 text-[12px] text-dark-muted">Next map</p>
	<a href="/maps/{card.slug}" class="group block text-white hover:text-white">
		{#if card.thumb}
			<div class="crop-marks [--crop-color:#fff]">
				<img
					src={imageUrl(card.thumb)}
					alt=""
					loading="lazy"
					decoding="async"
					class="aspect-[10/7] w-full object-cover"
				/>
			</div>
		{/if}
		<p class="mt-3 font-mono text-[12px] font-medium text-dark-muted">
			{formatMapNo(card.no)} · <span class="uppercase">{card.category.name}</span>
		</p>
		<p class="display mt-1 text-[24px] leading-[1.05] group-hover:text-[#9aa0ff]">{card.title}</p>
	</a>
</aside>
