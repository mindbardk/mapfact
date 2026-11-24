<script lang="ts">
	import Logo from './Logo.svelte';

	let { categories }: { categories: { slug: string; name: string }[] } = $props();
	const year = new Date().getFullYear();
</script>

<footer data-ref="site-footer" class="footer bg-ink text-white">
	<div class="page grid gap-10 py-14 wide:grid-cols-[1fr_2fr]">
		<div>
			<a href="/" aria-label="Mapfact home" class="inline-block hover:opacity-80"><Logo tone="dark" /></a>
			<p class="mt-4 max-w-[34ch] font-serif text-[17px] leading-[1.45] text-dark-muted">
				A new map every day, with the story and the data behind it.
			</p>
		</div>
		<nav aria-label="All categories">
			<p class="label mb-4 text-[12px] text-dark-muted">Categories</p>
			<ul class="grid grid-cols-2 gap-x-8 gap-y-1 tablet:grid-cols-4">
				{#each categories as category (category.slug)}
					<li>
						<a
							href="/category/{category.slug}"
							class="inline-flex h-11 items-center text-[15px] font-medium text-white hover:text-dark-muted"
							>{category.name}</a
						>
					</li>
				{/each}
			</ul>
		</nav>
	</div>
	<div class="border-t border-white/15">
		<div class="page flex flex-wrap items-center gap-x-6 gap-y-2 py-5 font-mono text-[12px] text-dark-muted">
			<span>© {year} Mapfact</span>
			<a href="/plans" class="inline-flex min-h-11 items-center text-dark-muted hover:text-white">Maps for your site</a>
		</div>
	</div>
</footer>

<style>
	/* Gradnet: et gitter på 48 px i hvid med 6 % opacitet. */
	.footer {
		background-image:
			linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
		background-size: 48px 48px;
	}
</style>
