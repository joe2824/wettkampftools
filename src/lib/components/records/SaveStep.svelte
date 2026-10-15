<script lang="ts">
	import SaveIcon from "@lucide/svelte/icons/save";
	import { toast } from "svelte-sonner";
	import SaveResult from "$lib/components/SaveResult.svelte";
	import { Button } from "$lib/components/ui/button";
	import type { RecChange } from "$lib/records/proposal";
	import { newRulebookFileName, saveNewRulebook, type LoadedRulebook } from "$lib/workflows/records";

	interface Props {
		club: LoadedRulebook | null;
		rows: readonly RecChange[];
		year: number;
		savedPath: string | null;
	}

	let { club, rows, year, savedPath = $bindable() }: Props = $props();

	let saving = $state(false);

	async function save() {
		if (!club) return;
		saving = true;
		try {
			savedPath = (await saveNewRulebook(club, rows, year)) ?? savedPath;
		} catch {
			toast.error("Das Regelwerk konnte nicht gespeichert werden.");
		} finally {
			saving = false;
		}
	}
</script>

<div class="flex flex-col gap-3">
	<Button class="self-start" onclick={save} disabled={!club || saving}>
		<SaveIcon data-icon="inline-start" />
		{newRulebookFileName(year)} speichern
	</Button>
	{#if !club}
		<p class="text-sm text-muted-foreground">Zuerst das Vereins-Regelwerk laden.</p>
	{/if}
	<SaveResult path={savedPath} label="Regelwerk gespeichert" />
</div>
