<script lang="ts">
	import Dropzone from "$lib/components/Dropzone.svelte";
	import { MAX_PROJECT_BYTES } from "$lib/project/projectFile";
	import { projectOpenRequest } from "$lib/workflows/projectOpenRequest.svelte";
</script>

<Dropzone
	kinds={["project"]}
	compact
	maxBytes={MAX_PROJECT_BYTES}
	disabled={projectOpenRequest.busy}
	title="Projektdatei hierher ziehen"
	hint="Eine Projektdatei (.wwkprojekt) ersetzt nach Rückfrage den aktuellen Stand."
	onfile={(file) => projectOpenRequest.request(file.bytes)}
/>
