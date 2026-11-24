<script lang="ts">
	/** Ultramarin kvadrat med trådkors og cirkel + "mapfact". `tone` styrer ordmærkets farve. */
	let { tone = 'light' }: { tone?: 'light' | 'dark' } = $props();
</script>

<span class="inline-flex items-center gap-[10px]" class:text-ink={tone === 'light'} class:text-white={tone === 'dark'}>
	<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
		<rect width="26" height="26" fill="var(--color-accent)" />
		<g stroke="#fff" stroke-width="1.5" fill="none">
			<circle cx="13" cy="13" r="6" />
			<path d="M13 3v20M3 13h20" />
		</g>
	</svg>
	<span class="display text-[28px] leading-none">mapfact</span>
</span>
