<script lang="ts">
	import CheckIcon from "@lucide/svelte/icons/check";
	import MissingDateAlert from "$lib/components/MissingDateAlert.svelte";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { EventAutosave } from "$lib/settings/eventAutosave.svelte";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";
	import SignerCard from "./SignerCard.svelte";

	const event = $derived(settingsStore.settings.event);
	const autosave = new EventAutosave(settingsStore);

	// Beim Verlassen der Seite nichts verlieren.
	$effect(() => () => void autosave.flush());
</script>

<!-- Eingaben melden sich per „input“-Ereignis, gespeichert wird nach einer kurzen Pause. -->
<div class="flex flex-col gap-6" oninput={autosave.schedule}>
	<MissingDateAlert message="Datum fehlt – bitte eintragen, sonst fehlt es auf den Urkunden." />
	<div class="grid gap-4 md:grid-cols-2">
		<div class="flex flex-col gap-2">
			<Label for="event-number">Nr. des Wettkampfs</Label>
			<Input id="event-number" bind:value={event.number} placeholder="z. B. 39" />
		</div>
		<div class="flex flex-col gap-2">
			<Label for="event-title">Titel</Label>
			<Input id="event-title" bind:value={event.title} />
		</div>
		<div class="flex flex-col gap-2">
			<Label for="event-host">Ausrichter</Label>
			<Input id="event-host" bind:value={event.host} />
		</div>
		<div class="flex flex-col gap-2">
			<Label for="event-date">Datum</Label>
			<Input id="event-date" type="date" bind:value={event.date} />
		</div>
		<div class="flex flex-col gap-2 md:col-span-2">
			<Label for="event-venue">Ort</Label>
			<Input id="event-venue" bind:value={event.venue} />
		</div>
	</div>
	<div class="grid gap-4 lg:grid-cols-2">
		<SignerCard index={0} />
		<SignerCard index={1} />
	</div>
	<p class="flex min-h-5 items-center gap-1.5 text-sm text-muted-foreground" role="status" aria-live="polite">
		{#if autosave.status === "pending"}
			Wird gespeichert …
		{:else if autosave.status === "saved"}
			<CheckIcon class="size-4" aria-hidden="true" />
			Gespeichert
		{:else if autosave.status === "failed"}
			<span class="text-destructive">Konnte nicht gespeichert werden. Bitte erneut ändern.</span>
		{:else}
			Änderungen werden automatisch gespeichert.
		{/if}
	</p>
</div>
