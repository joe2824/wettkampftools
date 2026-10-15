<script lang="ts">
	import FolderOpenIcon from "@lucide/svelte/icons/folder-open";
	import { toast } from "svelte-sonner";
	import Dropzone from "$lib/components/Dropzone.svelte";
	import type { CheckedFile } from "$lib/components/fileCheck";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import * as Card from "$lib/components/ui/card";
	import { MAX_PROJECT_BYTES } from "$lib/project/projectFile";
	import { openProject } from "$lib/workflows/project";
	import SaveProjectDialog from "./SaveProjectDialog.svelte";

	let pending = $state<Uint8Array | null>(null);
	let busy = $state(false);

	function confirmOpen(file: CheckedFile) {
		pending = file.bytes;
	}

	function handleOpenChange(open: boolean) {
		if (!open && !busy) pending = null;
	}

	async function apply() {
		if (pending === null) return;
		busy = true;
		try {
			const outcome = await openProject(pending);
			if (!outcome.ok) {
				toast.error(outcome.message);
				return;
			}
			const description = outcome.warnings.length > 0 ? outcome.warnings.join(" ") : undefined;
			toast.success(`Projekt „${outcome.headline}“ geöffnet`, { description });
		} finally {
			busy = false;
			pending = null;
		}
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<FolderOpenIcon class="size-5 text-primary" aria-hidden="true" />
			Projekt
		</Card.Title>
		<Card.Description>
			Den ganzen Wettkampf als eine Datei speichern und auf einem anderen Rechner weiterbearbeiten.
		</Card.Description>
	</Card.Header>
	<Card.Content class="flex flex-col gap-4">
		<div>
			<SaveProjectDialog />
		</div>
		<Dropzone
			kinds={["project"]}
			compact
			maxBytes={MAX_PROJECT_BYTES}
			disabled={busy}
			title="Projekt öffnen …"
			hint="Projektdatei (.wwkprojekt) hierher ziehen oder auswählen."
			onfile={confirmOpen}
		/>
	</Card.Content>
</Card.Root>

<AlertDialog.Root open={pending !== null} onOpenChange={handleOpenChange}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Aktuellen Stand ersetzen?</AlertDialog.Title>
			<AlertDialog.Description>
				Veranstaltung, Einstellungen, Urkunden-Layout, Meldungen und Ergebnisse werden durch das Projekt ersetzt.
				Unterschriften werden nur ersetzt, wenn das Projekt welche enthält.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={busy}>Abbrechen</AlertDialog.Cancel>
			<AlertDialog.Action onclick={apply} disabled={busy}>Projekt öffnen</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
