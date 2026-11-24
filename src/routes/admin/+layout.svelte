<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Logo from '$lib/components/Logo.svelte';

	let { children, data } = $props();
	const isLoginPage = $derived(page.route.id === '/admin/login');

	async function logout() {
		await fetch('/api/admin/logout', { method: 'POST' });
		await goto('/admin/login', { invalidateAll: true });
	}
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-dvh bg-paper text-ink">
	{#if isLoginPage}
		{@render children()}
	{:else}
		<header class="border-b-2 border-ink bg-surface">
			<div class="page flex h-14 items-center gap-6">
				<a href="/admin" aria-label="Mapfact admin" class="hover:opacity-80"><Logo /></a>
				<nav aria-label="Admin" class="flex gap-4 text-[14px] font-semibold">
					<a href="/admin" class="text-ink hover:text-accent">Maps</a>
				</nav>
				<span class="ml-auto hidden font-mono text-[12px] text-muted tablet:inline">{data.admin?.email}</span>
				<button
					type="button"
					onclick={logout}
					class="h-11 border border-ink px-4 font-mono text-[13px] font-medium hover:bg-ink hover:text-white"
					>Log out</button
				>
			</div>
		</header>
		<main class="page py-10">
			{@render children()}
		</main>
	{/if}
</div>
