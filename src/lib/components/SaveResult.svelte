<script lang="ts">
	import CircleCheckIcon from "@lucide/svelte/icons/circle-check";
	import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
	import FolderOpenIcon from "@lucide/svelte/icons/folder-open";
	import { toast } from "svelte-sonner";
	import * as Alert from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import { openOutputFile, revealOutputFile } from "$lib/platform/output";

	interface Props {
		path: string | null;
		label?: string;
	}

	let { path, label = "Datei gespeichert" }: Props = $props();

	const fileName = $derived(path ? (path.split(/[\\/]/).pop() ?? path) : "");

	// Die Desktop-Hülle liefert bereits deutsche Meldungen.
	async function run(action: (target: string) => Promise<void>) {
		if (!path) return;
		try {
			await action(path);
		} catch (error) {
			toast.error(typeof error === "string" ? error : "Die Datei konnte nicht geöffnet werden.");
		}
	}
</script>

{#if path}
	<Alert.Root>
		<CircleCheckIcon class="text-primary" />
		<Alert.Title>{label}</Alert.Title>
		<Alert.Description>
			<span class="break-all" title={path}>{fileName}</span>
			<div class="mt-2 flex flex-wrap gap-2">
				<Button size="sm" onclick={() => run(openOutputFile)}>
					<ExternalLinkIcon data-icon="inline-start" />
					Datei öffnen
				</Button>
				<Button size="sm" variant="outline" onclick={() => run(revealOutputFile)}>
					<FolderOpenIcon data-icon="inline-start" />
					Im Ordner zeigen
				</Button>
			</div>
		</Alert.Description>
	</Alert.Root>
{/if}
