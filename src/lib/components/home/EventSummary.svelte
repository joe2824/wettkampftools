<script lang="ts">
	import CalendarIcon from "@lucide/svelte/icons/calendar";
	import PencilIcon from "@lucide/svelte/icons/pencil";
	import { Badge } from "$lib/components/ui/badge";
	import { buttonVariants } from "$lib/components/ui/button";
	import { formatGermanDate } from "$lib/format/date";
	import { eventHeadline } from "$lib/settings/eventInfo";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";

	const event = $derived(settingsStore.settings.event);
	const date = $derived(formatGermanDate(event.date));
</script>

<section aria-label="Aktuelle Veranstaltung" class="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
	<span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
		<CalendarIcon class="size-5" aria-hidden="true" />
	</span>
	<div class="flex min-w-0 flex-1 flex-col gap-1">
		<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Aktuelle Veranstaltung</p>
		<p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-lg font-semibold">
			<span>{eventHeadline(event)}</span>
			{#if date}
				<span class="text-muted-foreground" aria-hidden="true">·</span>
				<span>{date}</span>
			{:else}
				<Badge variant="destructive">Datum fehlt</Badge>
			{/if}
		</p>
	</div>
	<a href="/preparation" class={buttonVariants({ variant: "outline", size: "sm" })}>
		<PencilIcon data-icon="inline-start" />
		Bearbeiten
	</a>
</section>
