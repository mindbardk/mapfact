<script lang="ts">
	import { formatMapNo } from '$lib/map-no';

	let { no, suffix }: { no: number; suffix?: string } = $props();
</script>

<span class="font-mono font-medium whitespace-nowrap">{formatMapNo(no, suffix)}</span>
