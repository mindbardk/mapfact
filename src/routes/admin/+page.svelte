<script lang="ts">
	import { formatDate } from '$lib/format-date';
	import { formatMapNo } from '$lib/map-no';

	let { data } = $props();
</script>

<svelte:head><title>Maps – Mapfact admin</title></svelte:head>

<h1 class="display text-[48px] leading-none">Maps</h1>

<div class="mt-8 overflow-x-auto">
	<table data-ref="admin-maps" class="w-full min-w-[640px] border-collapse text-left text-[15px]">
		<thead class="label border-b-2 border-ink text-[11px] text-muted">
			<tr>
				<th class="py-2 pr-4 font-medium">No.</th>
				<th class="py-2 pr-4 font-medium">Title</th>
				<th class="py-2 pr-4 font-medium">Category</th>
				<th class="py-2 pr-4 font-medium">Status</th>
				<th class="py-2 font-medium">Updated</th>
			</tr>
		</thead>
		<tbody>
			{#each data.maps as map (map.id)}
				<tr class="border-b border-line">
					<td class="py-3 pr-4 font-mono text-[12px] whitespace-nowrap">{map.no === null ? '–' : formatMapNo(map.no)}</td>
					<td class="py-3 pr-4">
						{#if map.status === 'draft'}
							{map.title}
						{:else}
							<a href="/maps/{map.slug}">{map.title}</a>
						{/if}
					</td>
					<td class="py-3 pr-4">{map.category}</td>
					<td class="py-3 pr-4 font-mono text-[12px]">{map.status}</td>
					<td class="py-3 font-mono text-[12px] whitespace-nowrap">{formatDate(map.updatedAt)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
