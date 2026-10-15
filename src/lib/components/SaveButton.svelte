<script lang="ts">
	import SaveIcon from "@lucide/svelte/icons/save";
	import { toast } from "svelte-sonner";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";

	interface Props {
		dirty: boolean;
		onsave: () => Promise<unknown>;
		successMessage: string;
		errorMessage: string;
	}

	let { dirty, onsave, successMessage, errorMessage }: Props = $props();

	let saving = $state(false);

	async function save() {
		saving = true;
		try {
			await onsave();
			toast.success(successMessage);
		} catch {
			toast.error(errorMessage);
		} finally {
			saving = false;
		}
	}
</script>

<Button onclick={save} disabled={!dirty || saving}>
	<SaveIcon data-icon="inline-start" />
	{saving ? "Wird gespeichert …" : "Speichern"}
</Button>
{#if dirty}
	<Badge variant="secondary" role="status">Nicht gespeichert</Badge>
{/if}
