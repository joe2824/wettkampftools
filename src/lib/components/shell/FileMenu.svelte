<script lang="ts">
	import FileIcon from "@lucide/svelte/icons/file";
	import FilePlusIcon from "@lucide/svelte/icons/file-plus";
	import FolderOpenIcon from "@lucide/svelte/icons/folder-open";
	import SaveIcon from "@lucide/svelte/icons/save";
	import { toast } from "svelte-sonner";
	import { acceptAttribute, readCheckedFile, takeInputFile, type FileKind } from "$lib/components/fileCheck";
	import { chooseNativeFile, loadNativeFile } from "$lib/components/nativeFile";
	import NewCompetitionDialog from "$lib/components/project/NewCompetitionDialog.svelte";
	import SaveProjectDialog from "$lib/components/project/SaveProjectDialog.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
	import { formatGermanDateTime } from "$lib/format/date";
	import { isTauri } from "$lib/platform/env";
	import { MAX_PROJECT_BYTES } from "$lib/project/projectFile";
	import { session } from "$lib/session.svelte";
	import { competitionStore } from "$lib/workflows/competitionStore.svelte";
	import { projectOpenRequest } from "$lib/workflows/projectOpenRequest.svelte";
	import { FileMenuController } from "./fileMenuController.svelte";
	import { fileShortcut, hasOpenDialog, isApplePlatform, shortcutLabel } from "./fileShortcuts";

	const PROJECT_KINDS: FileKind[] = ["project"];

	const apple = typeof navigator !== "undefined" && isApplePlatform(navigator.userAgent);
	const hasData = $derived(session.hasRegistration || session.hasResults);
	const savedAt = $derived(competitionStore.savedAt);

	let input = $state<HTMLInputElement | null>(null);

	const menu = new FileMenuController({
		native: isTauri,
		pickNative: async () => {
			const path = await chooseNativeFile(PROJECT_KINDS);
			return path === null ? null : loadNativeFile(path, PROJECT_KINDS, MAX_PROJECT_BYTES);
		},
		pickInBrowser: () => input?.click(),
		requestOpen: (bytes) => projectOpenRequest.request(bytes),
		openBusy: () => projectOpenRequest.busy,
		canStartNew: () => hasData,
		onerror: (message) => toast.error(message)
	});

	/** Kürzel gelten überall, nur nicht über einem offenen Dialog. */
	function handleKeydown(event: KeyboardEvent) {
		const action = fileShortcut(event, apple);
		if (action === null) return;
		event.preventDefault();
		if (!hasOpenDialog(document)) void menu.run(action);
	}

	async function handleInput(event: Event) {
		const file = takeInputFile(event);
		if (file) menu.take(await readCheckedFile(file, PROJECT_KINDS, MAX_PROJECT_BYTES));
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="ghost" size="sm">
				<FileIcon data-icon="inline-start" />
				Datei
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="start" class="w-64">
		<DropdownMenu.Item disabled={!hasData} onSelect={() => menu.run("new")}>
			<FilePlusIcon />
			Neuer Wettkampf …
			<DropdownMenu.Shortcut>{shortcutLabel("new", apple)}</DropdownMenu.Shortcut>
		</DropdownMenu.Item>
		<DropdownMenu.Item disabled={projectOpenRequest.busy} onSelect={() => menu.run("open")}>
			<FolderOpenIcon />
			Projekt öffnen …
			<DropdownMenu.Shortcut>{shortcutLabel("open", apple)}</DropdownMenu.Shortcut>
		</DropdownMenu.Item>
		<DropdownMenu.Item onSelect={() => menu.run("save")}>
			<SaveIcon />
			Projekt speichern …
			<DropdownMenu.Shortcut>{shortcutLabel("save", apple)}</DropdownMenu.Shortcut>
		</DropdownMenu.Item>
		{#if savedAt}
			<DropdownMenu.Separator />
			<DropdownMenu.Label class="text-xs font-normal text-muted-foreground">
				Stand automatisch gesichert: {formatGermanDateTime(savedAt)}
			</DropdownMenu.Label>
		{/if}
	</DropdownMenu.Content>
</DropdownMenu.Root>
<input
	bind:this={input}
	type="file"
	class="hidden"
	accept={acceptAttribute(PROJECT_KINDS)}
	aria-label="Projektdatei auswählen"
	onchange={handleInput}
/>

<NewCompetitionDialog bind:open={menu.newOpen} />
<SaveProjectDialog bind:open={menu.saveOpen} />
