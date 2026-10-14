<script lang="ts">
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import { toast } from "svelte-sonner";
	import Dropzone from "$lib/components/Dropzone.svelte";
	import type { CheckedFile } from "$lib/components/fileCheck";
	import { Button } from "$lib/components/ui/button";
	import * as Table from "$lib/components/ui/table";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";
	import { readRulebook } from "$lib/workflows/settings";

	const rulebook = $derived(settingsStore.settings.rulebook);
	let error = $state<string | null>(null);

	function handleFile(file: CheckedFile) {
		const outcome = readRulebook(file.bytes);
		if (!outcome.ok) {
			error = outcome.message;
			return;
		}
		error = null;
		settingsStore.settings.rulebook = outcome.rulebook;
		toast.success("Regelwerk geladen", { description: "Zum Übernehmen bitte speichern." });
	}
</script>

<div class="flex flex-col gap-4">
	<p class="text-sm text-muted-foreground">
		Optional. Das Regelwerk aus JAuswertung dient nur zur Prüfung vor dem Export: Passen Altersklassen und
		Mitgliederzahlen? Es ändert keine Einstellung.
	</p>
	{#if rulebook}
		<div class="flex flex-col gap-3 rounded-lg border border-border p-4">
			<div class="flex items-center justify-between gap-4">
				<p class="font-medium">{rulebook.name}</p>
				<Button variant="outline" size="sm" onclick={() => (settingsStore.settings.rulebook = null)}>
					<Trash2Icon data-icon="inline-start" />
					Entfernen
				</Button>
			</div>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Altersklasse</Table.Head>
						<Table.Head class="text-right">Mitglieder mindestens</Table.Head>
						<Table.Head class="text-right">Mitglieder höchstens</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each rulebook.ageGroups as ageGroup (ageGroup.name)}
						<Table.Row>
							<Table.Cell>{ageGroup.name}</Table.Cell>
							<Table.Cell class="text-right tabular-nums">{ageGroup.minMembers}</Table.Cell>
							<Table.Cell class="text-right tabular-nums">{ageGroup.maxMembers}</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{/if}
	<Dropzone
		kinds={["rulebook"]}
		compact={rulebook !== null}
		title={rulebook ? "Anderes Regelwerk laden" : "Regelwerk laden"}
		hint="Datei mit der Endung .rwm aus JAuswertung."
		onfile={handleFile}
	/>
	{#if error}
		<p class="text-sm text-destructive" role="alert">{error}</p>
	{/if}
</div>
