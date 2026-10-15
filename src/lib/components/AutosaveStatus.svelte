<script lang="ts">
	import CheckIcon from "@lucide/svelte/icons/check";
	import type { AutosaveStatus } from "$lib/autosave.svelte";

	interface Props {
		status: AutosaveStatus;
		/** Text, solange noch nichts geändert wurde. */
		idleText?: string;
	}

	let { status, idleText = "" }: Props = $props();
</script>

<p class="flex min-h-5 items-center gap-1.5 text-sm text-muted-foreground" role="status" aria-live="polite">
	{#if status === "pending"}
		Wird gespeichert …
	{:else if status === "saved"}
		<CheckIcon class="size-4" aria-hidden="true" />
		Gespeichert
	{:else if status === "failed"}
		<span class="text-destructive">Konnte nicht gespeichert werden. Bitte erneut ändern.</span>
	{:else}
		{idleText}
	{/if}
</p>
