<script lang="ts">
	import CategoryTab from '$lib/components/CategoryTab.svelte';
	import MapCardNext from '$lib/components/MapCardNext.svelte';
	import MapNo from '$lib/components/MapNo.svelte';
	import MapStage from '$lib/components/MapStage.svelte';
	import MapToolbar from '$lib/components/MapToolbar.svelte';
	import { formatDate } from '$lib/format-date';
	import { SITE_NAME, SITE_ORIGIN } from '$lib/site';

	let { data } = $props();
	const map = $derived(data.map);
	/** Over ca. 90 tegn skaleres H1 ned, så kortscenen bliver over folden. */
	const longTitle = $derived(map.title.length > 90);
</script>

<svelte:head>
	<title>{map.seoTitle ?? map.title} | {SITE_NAME}</title>
	<meta name="description" content={map.seoDescription ?? map.dek} />
	<link rel="canonical" href="{SITE_ORIGIN}/maps/{map.slug}" />
</svelte:head>

<div data-ref="title-block" class="page flex flex-col gap-5 pt-6 pb-7 wide:flex-row wide:items-end wide:justify-between wide:gap-14">
	<div class="min-w-0">
		<div class="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[12px] text-muted">
			<CategoryTab name={map.category.name} href="/category/{map.category.slug}" />
			<span class="text-ink"><MapNo no={map.no} /></span>
			<span>Updated {formatDate(map.contentUpdatedAt)}</span>
		</div>
		<h1 class="display title max-w-[1040px] text-ink" class:title-long={longTitle}>{map.title}</h1>
	</div>
	<p class="max-w-[380px] shrink-0 font-serif text-[19px] leading-[1.45] text-sub">{map.dek}</p>
</div>

<MapStage {map} />

<MapToolbar
	no={map.no}
	centerLabel={map.centerLabel}
	projectionLabel={map.projectionLabel}
	sourceText={map.sourceText}
	sourceUrl={map.sourceUrl}
/>

<div class="page article-grid py-14">
	<aside class="side-left">
		<p data-ref="byline" class="font-mono text-[12px] text-muted">
			{SITE_NAME} · {data.readingMinutes} min read
		</p>
	</aside>

	<article data-ref="article" class="article min-w-0">
		<!-- Sikker: renderArticle escaper rå HTML (markdown-it med html: false). -->
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html data.articleHtml}
	</article>

	<aside class="side-right">
		{#if data.next}
			<MapCardNext card={data.next} />
		{/if}
	</aside>
</div>

<style>
	.title {
		font-size: 68px;
		line-height: 0.95;
		overflow-wrap: break-word;
	}
	.title.title-long {
		font-size: 56px;
	}
	.article-grid {
		display: grid;
		grid-template-columns: 220px minmax(0, 680px) 300px;
		justify-content: center;
		gap: 56px;
	}
	.side-left > :global(*) {
		position: sticky;
		top: 24px;
	}
	@media (max-width: 1100px) {
		.article-grid {
			grid-template-columns: minmax(0, 680px);
		}
		.side-right {
			order: 3;
		}
	}
	@media (max-width: 640px) {
		.title,
		.title.title-long {
			font-size: 38px;
			line-height: 0.98;
		}
		.article-grid {
			gap: 32px;
		}
	}
</style>
