<script lang="ts">
	import DownloadIcon from "@lucide/svelte/icons/download";
	import FileWarningIcon from "@lucide/svelte/icons/file-warning";
	import InfoIcon from "@lucide/svelte/icons/info";
	import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";
	import ScaleIcon from "@lucide/svelte/icons/scale";
	import { toast } from "svelte-sonner";
	import Dropzone from "$lib/components/Dropzone.svelte";
	import LoadedFileCard from "$lib/components/LoadedFileCard.svelte";
	import type { CheckedFile } from "$lib/components/fileCheck";
	import * as Alert from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import {
		downloadOfficialPenalties,
		preparePenalties,
		type LoadedPenalties,
		type PenaltyOutcome
	} from "$lib/workflows/penalties";
	import PenaltyChangesTable from "./PenaltyChangesTable.svelte";

	interface Props {
		penalties: LoadedPenalties | null;
	}

	let { penalties = $bindable() }: Props = $props();

	let replacing = $state(false);
	let downloading = $state(false);
	let error = $state<string | null>(null);

	function take(outcome: PenaltyOutcome): boolean {
		error = outcome.ok ? null : outcome.message;
		if (!outcome.ok) return false;
		penalties = outcome.penalties;
		replacing = false;
		return true;
	}

	function handleFile(file: CheckedFile) {
		take(preparePenalties(file.name, file.bytes));
	}

	async function download() {
		downloading = true;
		const outcome = await downloadOfficialPenalties();
		downloading = false;
		if (take(outcome)) toast.success("Offizieller Strafenkatalog geladen");
	}
</script>

<div class="flex flex-col gap-4">
	{#if penalties && !replacing}
		{@const changeCount = penalties.changes.length}
		<LoadedFileCard
			icon={ScaleIcon}
			title={penalties.name}
			tooltip={penalties.name}
			onreplace={() => (replacing = true)}
		>
			{#snippet details()}{changeCount} Änderungen nach den Vereinsregeln{/snippet}
		</LoadedFileCard>
	{:else}
		<Dropzone
			kinds={["penalties"]}
			title="Strafenkatalog (.def)"
			hint="Offizieller Mannschafts-Katalog aus JAuswertung, „defaultm.def“."
			compact={penalties !== null}
			onfile={handleFile}
		/>
	{/if}

	<Button variant="outline" class="self-start" onclick={download} disabled={downloading}>
		{#if downloading}
			<LoaderCircleIcon class="animate-spin" data-icon="inline-start" />
		{:else}
			<DownloadIcon data-icon="inline-start" />
		{/if}
		Von JAuswertung laden
	</Button>

	{#if error}
		<Alert.Root variant="destructive">
			<Alert.Title>Strafenkatalog nicht übernommen</Alert.Title>
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	{#if penalties}
		{#if penalties.changes.length > 0}
			<PenaltyChangesTable changes={penalties.changes} />
		{:else}
			<p class="text-sm text-muted-foreground">Der Katalog entspricht bereits den Vereinsregeln.</p>
		{/if}
		{#if penalties.issues.length > 0}
			<Alert.Root variant="destructive">
				<FileWarningIcon aria-hidden="true" />
				<Alert.Title>Der Katalog hat noch Mängel</Alert.Title>
				<Alert.Description>
					<ul class="list-disc pl-4">
						{#each penalties.issues as issue (issue)}<li>{issue}</li>{/each}
					</ul>
				</Alert.Description>
			</Alert.Root>
		{/if}
	{/if}

	<Alert.Root>
		<InfoIcon aria-hidden="true" />
		<Alert.Title>So kommt der Katalog in JAuswertung</Alert.Title>
		<Alert.Description>
			<p>
				In JAuswertung einen <strong>neuen</strong> Wettkampf anlegen und dabei dieses Regelwerk wählen – der Strafenkatalog
				wird dann automatisch übernommen. Bestehende Wettkämpfe (.wk) behalten ihren alten Katalog; für sie gibt es unten
				„Wettkampfdatei fürs neue Jahr aktualisieren“.
			</p>
			<p>
				Gut zu wissen: Die Wettkampfdateien der letzten Jahre enthielten einen veralteten Katalog (Fehlstart als
				Disqualifikation, kein Eintrag für das Herausbringen beim Retten in der Welle).
			</p>
		</Alert.Description>
	</Alert.Root>
</div>
