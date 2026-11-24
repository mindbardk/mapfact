<script lang="ts">
	import './layout.css';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import { page } from '$app/state';

	let { data, children } = $props();
	const isAdmin = $derived(page.url.pathname.startsWith('/admin'));
	const activeCategory = $derived(
		(page.data as { map?: { category: { slug: string } } }).map?.category.slug ?? null
	);
</script>

{#if isAdmin}
	{@render children()}
{:else}
	<div class="flex min-h-dvh flex-col">
		<SiteHeader categories={data.categories} {activeCategory} />
		<main class="flex-1">
			{@render children()}
		</main>
		<SiteFooter categories={data.categories} />
	</div>
{/if}
