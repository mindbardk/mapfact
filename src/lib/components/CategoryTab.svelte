<script lang="ts">
	/** Den ultramarine kategorifane. Med `href` er den et link. */
	let { name, href }: { name: string; href?: string } = $props();
	const classes =
		'inline-block bg-accent px-[9px] py-[5px] font-mono text-[12px] font-medium uppercase leading-none tracking-[0.06em] text-white';
</script>

{#if href}
	<a {href} class="{classes} hover:bg-ink hover:text-white">{name}</a>
{:else}
	<span class={classes}>{name}</span>
{/if}
