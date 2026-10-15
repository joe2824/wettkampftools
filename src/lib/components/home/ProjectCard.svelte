<script lang="ts">
	import FolderOpenIcon from "@lucide/svelte/icons/folder-open";
	import Dropzone from "$lib/components/Dropzone.svelte";
	import * as Card from "$lib/components/ui/card";
	import { MAX_PROJECT_BYTES } from "$lib/project/projectFile";
	import { projectOpenRequest } from "$lib/workflows/projectOpenRequest.svelte";
	import SaveProjectDialog from "./SaveProjectDialog.svelte";
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
			disabled={projectOpenRequest.busy}
			title="Projekt öffnen …"
			hint="Projektdatei (.wwkprojekt) hierher ziehen oder auswählen."
			onfile={(file) => projectOpenRequest.request(file.bytes)}
		/>
	</Card.Content>
</Card.Root>
