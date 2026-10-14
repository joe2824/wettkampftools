<script lang="ts">
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";
	import SignerCard from "./SignerCard.svelte";

	const event = $derived(settingsStore.settings.event);
</script>

<div class="flex flex-col gap-6">
	<p class="text-sm text-muted-foreground">Diese Angaben erscheinen auf den Urkunden und in der Auswertung.</p>
	<div class="grid gap-4 md:grid-cols-2">
		<div class="flex flex-col gap-2">
			<Label for="event-number">Nr. des Wettkampfs</Label>
			<Input id="event-number" bind:value={event.number} placeholder="z. B. 25" />
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
</div>
