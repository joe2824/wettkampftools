<script lang="ts">
	import type { LeaveChoice } from "$lib/leaveGuard.svelte";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import { Button } from "$lib/components/ui/button";

	interface Props {
		open: boolean;
		onchoose: (choice: LeaveChoice) => Promise<void>;
	}

	let { open, onchoose }: Props = $props();

	let busy = $state(false);

	async function choose(choice: LeaveChoice) {
		busy = true;
		try {
			await onchoose(choice);
		} finally {
			busy = false;
		}
	}
</script>

<AlertDialog.Root bind:open={() => open, (next) => !next && !busy && void choose("cancel")}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Ungespeicherte Änderungen</AlertDialog.Title>
			<AlertDialog.Description>
				Die Änderungen auf dieser Seite sind noch nicht gespeichert. Was soll mit ihnen passieren?
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<Button variant="outline" disabled={busy} onclick={() => choose("cancel")}>Abbrechen</Button>
			<Button variant="outline" disabled={busy} onclick={() => choose("discard")}>Verwerfen</Button>
			<Button disabled={busy} onclick={() => choose("save")}>Speichern und weiter</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
