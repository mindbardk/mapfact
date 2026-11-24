<script lang="ts">
	import { formatMapNo } from '$lib/map-no';

	let { data } = $props();
</script>

<svelte:head>
	<title>Mapfact</title>
</svelte:head>

<div class="page py-12">
	<h1 class="display text-[52px] leading-[0.95]">Mapfact</h1>
	<ul class="mt-8 max-w-[680px] divide-y divide-line border-y border-line">
		{#each data.maps as map (map.slug)}
			<li>
				<a href="/maps/{map.slug}" class="flex min-h-11 items-baseline gap-4 py-3 text-ink hover:text-accent">
					<span class="font-mono text-[12px] font-medium">{formatMapNo(map.no)}</span>
					<span class="display text-[24px] leading-[1.05]">{map.title}</span>
				</a>
			</li>
		{/each}
	</ul>
</div>
