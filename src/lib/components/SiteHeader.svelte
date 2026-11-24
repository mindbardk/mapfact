<script lang="ts">
	import Logo from './Logo.svelte';

	let {
		categories,
		activeCategory = null
	}: { categories: { slug: string; name: string }[]; activeCategory?: string | null } = $props();

	let menuOpen = $state(false);
</script>

<header data-ref="site-header" class="border-b-2 border-ink bg-paper">
	<div class="page flex h-14 items-center gap-8 tablet:h-16">
		<a href="/" aria-label="Mapfact home" class="shrink-0 hover:opacity-80">
			<Logo />
		</a>

		<nav
			aria-label="Categories"
			id="site-categories"
			class="nav {menuOpen ? 'open' : ''} min-w-0 flex-1"
		>
			<ul class="flex">
				{#each categories as category (category.slug)}
					{@const active = category.slug === activeCategory}
					<li>
						<a
							href="/category/{category.slug}"
							aria-current={active ? 'page' : undefined}
							class="nav-link {active ? 'active' : ''}">{category.name}</a
						>
					</li>
				{/each}
			</ul>
		</nav>

		<a
			href="/plans"
			class="ml-auto hidden h-11 shrink-0 items-center bg-ink px-4 text-[14px] font-semibold text-white hover:bg-accent hover:text-white tablet:inline-flex"
			>Maps for your site</a
		>

		<button
			type="button"
			class="ml-auto inline-flex size-11 items-center justify-center text-ink tablet:hidden"
			aria-label="Menu"
			aria-expanded={menuOpen}
			aria-controls="site-categories"
			onclick={() => (menuOpen = !menuOpen)}
		>
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
				{#if menuOpen}
					<path d="M6 6l12 12M18 6L6 18" />
				{:else}
					<path d="M3 6h18M3 12h18M3 18h18" />
				{/if}
			</svg>
		</button>
	</div>
</header>

<style>
	.nav ul {
		overflow-x: auto;
		scrollbar-width: none;
	}
	.nav-link {
		display: inline-flex;
		align-items: center;
		height: 64px;
		padding-inline: 10px;
		font-size: 15px;
		font-weight: 500;
		color: var(--color-ink);
		white-space: nowrap;
		border-bottom: 2px solid transparent;
		margin-bottom: -2px;
	}
	.nav-link:hover,
	.nav-link.active {
		color: var(--color-accent);
	}
	.nav-link.active {
		border-bottom-color: var(--color-accent);
	}

	@media (max-width: 640px) {
		.nav {
			display: none;
		}
		.nav.open {
			display: block;
			position: absolute;
			left: 0;
			right: 0;
			top: 56px;
			z-index: 30;
			background: var(--color-paper);
			border-bottom: 2px solid var(--color-ink);
		}
		.nav.open ul {
			flex-direction: column;
			padding: 8px 16px 16px;
		}
		.nav-link {
			height: 44px;
			padding-inline: 0;
			border-bottom: 0;
			margin: 0;
			font-size: 16px;
		}
		header {
			position: relative;
		}
	}
</style>
