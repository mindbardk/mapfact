<script lang="ts">
	import { enhance } from '$app/forms';
	import Logo from '$lib/components/Logo.svelte';

	let { data, form } = $props();
	const error = $derived(form?.error ?? data.loginError);
</script>

<svelte:head><title>Log in – Mapfact admin</title></svelte:head>

<div class="grid min-h-dvh place-items-center px-4 py-12">
	<div class="flex w-full max-w-md flex-col gap-8 border-2 border-ink bg-surface p-8">
		<div class="flex flex-col gap-5">
			<Logo />
			<h1 class="display text-[38px] leading-none">Mapfact admin</h1>
		</div>
		{#if error}
			<p class="border border-ink bg-paper p-3 text-[15px]" role="alert">{error}</p>
		{/if}
		{#if data.google}
			<!-- Et almindeligt link: ruten sender browseren videre til Google. -->
			<a
				href="/admin/login/google"
				data-sveltekit-reload
				class="inline-flex h-12 items-center justify-center gap-3 border border-ink bg-surface font-semibold text-ink hover:bg-ink hover:text-white"
			>
				<svg viewBox="0 0 24 24" class="size-5" aria-hidden="true">
					<path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
					<path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
					<path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
					<path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
				</svg>
				Sign in with Google
			</a>
		{/if}
		{#if data.passwordLogin}
			<form method="POST" use:enhance class="flex flex-col gap-4">
				<label class="flex flex-col gap-2">
					<span class="label text-[11px] text-muted">{data.google ? 'Or use the owner password' : 'Password'}</span>
					<input
						type="password"
						name="password"
						required
						autocomplete="current-password"
						class="h-11 border border-ink bg-surface px-3"
					/>
				</label>
				<button class="h-11 bg-ink font-semibold text-white hover:bg-accent">Log in</button>
			</form>
		{/if}
		{#if !data.google && !data.passwordLogin}
			<p class="text-[15px] text-sub">No sign-in method is set up. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.</p>
		{/if}
	</div>
</div>
