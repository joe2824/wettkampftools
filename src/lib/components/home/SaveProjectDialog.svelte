<script lang="ts">
	import SaveIcon from "@lucide/svelte/icons/save";
	import ShieldAlertIcon from "@lucide/svelte/icons/shield-alert";
	import { toast } from "svelte-sonner";
	import * as Alert from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Label } from "$lib/components/ui/label";
	import { Switch } from "$lib/components/ui/switch";
	import { saveProject } from "$lib/workflows/project";

	let open = $state(false);
	let includeSignatures = $state(true);
	let saving = $state(false);

	async function save() {
		saving = true;
		try {
			const path = await saveProject({ includeSignatures });
			if (path === null) return;
			open = false;
			toast.success("Projekt gespeichert");
		} catch {
			toast.error("Das Projekt konnte nicht gespeichert werden. Bitte erneut versuchen.");
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger>
		{#snippet child({ props })}
			<Button {...props}>
				<SaveIcon data-icon="inline-start" />
				Projekt speichern …
			</Button>
		{/snippet}
	</Dialog.Trigger>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Projekt speichern</Dialog.Title>
			<Dialog.Description>
				Veranstaltung, Einstellungen, Urkunden-Layout, Meldungen und Ergebnisse kommen in eine Datei.
			</Dialog.Description>
		</Dialog.Header>
		<div class="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
			<div class="flex flex-col gap-1">
				<Label for="project-signatures">Unterschriften mitnehmen</Label>
				<p id="project-signatures-hint" class="text-sm text-muted-foreground">
					Die eingescannten Unterschriften für die Urkunden.
				</p>
			</div>
			<Switch id="project-signatures" bind:checked={includeSignatures} aria-describedby="project-signatures-hint" />
		</div>
		<Alert.Root>
			<ShieldAlertIcon />
			<Alert.Description>
				Die Datei enthält Namen und Jahrgänge der Teilnehmenden – nur an Berechtigte weitergeben.
			</Alert.Description>
		</Alert.Root>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Abbrechen</Button>
			<Button onclick={save} disabled={saving}>
				<SaveIcon data-icon="inline-start" />
				{saving ? "Wird gespeichert …" : "Speichern …"}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
