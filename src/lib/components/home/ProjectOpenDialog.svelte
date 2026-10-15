<script lang="ts">
	import { goto } from "$app/navigation";
	import { toast } from "svelte-sonner";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import { projectOpenRequest as request } from "$lib/workflows/projectOpenRequest.svelte";

	const APPLY_FAILED = "Das Projekt konnte nicht geöffnet werden. Bitte erneut versuchen.";

	function handleOpenChange(open: boolean) {
		if (!open) request.cancel();
	}

	async function apply() {
		try {
			const outcome = await request.confirm();
			if (outcome === null) return;
			if (!outcome.ok) {
				toast.error(outcome.message);
				return;
			}
			const description = outcome.warnings.length > 0 ? outcome.warnings.join(" ") : undefined;
			toast.success(`Projekt „${outcome.headline}“ geöffnet`, { description });
			await goto("/");
		} catch {
			toast.error(APPLY_FAILED);
		}
	}
</script>

<!-- Global eingebunden: Doppelklick auf eine Projektdatei kann auf jeder Seite ankommen. -->
<AlertDialog.Root open={request.pending !== null} onOpenChange={handleOpenChange}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Aktuellen Stand ersetzen?</AlertDialog.Title>
			<AlertDialog.Description>
				Veranstaltung, Einstellungen, Urkunden-Layout, Meldungen und Ergebnisse werden durch das Projekt ersetzt.
				Unterschriften werden nur ersetzt, wenn das Projekt welche enthält.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={request.busy}>Abbrechen</AlertDialog.Cancel>
			<AlertDialog.Action onclick={apply} disabled={request.busy}>Projekt öffnen</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
