<script lang="ts">
	import CircleAlertIcon from "@lucide/svelte/icons/circle-alert";
	import * as Alert from "$lib/components/ui/alert";
	import { Badge } from "$lib/components/ui/badge";
	import Dropzone from "$lib/components/Dropzone.svelte";
	import type { CheckedFile } from "$lib/components/fileCheck";
	import type { SessionRegistration } from "$lib/session.svelte";
	import { summarizeRegistration } from "$lib/workflows/preparation";

	interface Props {
		registration: SessionRegistration | null;
		error: string | null;
		onfile: (file: CheckedFile) => void;
	}

	let { registration, error, onfile }: Props = $props();

	const summary = $derived(registration ? summarizeRegistration(registration) : null);
</script>

<Dropzone
	kinds={["csv"]}
	title={registration ? "Andere Meldedatei laden" : "Meldedatei laden"}
	hint="CSV-Datei hierher ziehen oder auswählen."
	compact={registration !== null}
	onfile={onfile}
/>

{#if error}
	<Alert.Root variant="destructive">
		<CircleAlertIcon />
		<Alert.Title>Meldedatei nicht geladen</Alert.Title>
		<Alert.Description>{error}</Alert.Description>
	</Alert.Root>
{/if}

{#if registration && summary}
	<div class="flex flex-col gap-2">
		<p class="text-sm break-all">
			<span class="text-muted-foreground">Geladen:</span>
			<span class="font-medium">{registration.fileName}</span>
		</p>
		<div class="flex flex-wrap gap-2">
			<Badge variant="secondary">{summary.teams} Mannschaften</Badge>
			<Badge variant="secondary">{summary.organisations} Gliederungen</Badge>
			<Badge variant="outline">Zeichenkodierung: {summary.encodingLabel}</Badge>
		</div>
	</div>
{/if}
