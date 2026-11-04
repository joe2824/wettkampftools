<script lang="ts">
	import "../app.css";
	import { ModeWatcher } from "mode-watcher";
	import ProjectOpenDialog from "$lib/components/project/ProjectOpenDialog.svelte";
	import AppSidebar from "$lib/components/shell/AppSidebar.svelte";
	import FileMenu from "$lib/components/shell/FileMenu.svelte";
	import FontScaleShortcuts from "$lib/components/shell/FontScaleShortcuts.svelte";
	import { Separator } from "$lib/components/ui/separator";
	import * as Sidebar from "$lib/components/ui/sidebar";
	import { Toaster } from "$lib/components/ui/sonner";
	import { onMount } from "svelte";
	import { afterNavigate } from "$app/navigation";
	import { logError } from "$lib/log";
	import { toast } from "svelte-sonner";
	import { initApp, migrationMessage, setAsideMessage } from "$lib/appInit";
	import { flushPendingSaves } from "$lib/pendingSaves";
	import { beforeWindowClose } from "$lib/platform/windowClose";
	import { saveSettingsOnClose } from "$lib/settings/settingsCloseSave.svelte";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";
	import { competitionStore } from "$lib/workflows/competitionStore.svelte";
	import { saveSettings } from "$lib/workflows/settings";
	import { defaultLaunchDeps, startProjectLaunch } from "$lib/workflows/projectLaunch";

	const TOAST_BOTTOM_OFFSET = "5rem";
	const SAVE_FAILED_TOAST = "competition-save-failed";

	let { children } = $props();

	// Nur der Inhaltsbereich scrollt, nicht das Fenster; neue Seiten beginnen deshalb hier oben.
	let inset = $state<HTMLElement | null>(null);
	afterNavigate(({ type }) => {
		if (type !== "popstate") inset?.scrollTo({ top: 0 });
	});

	// Ungespeicherte Einstellungen gehen beim Schließen des Fensters nicht verloren.
	saveSettingsOnClose(settingsStore, () => saveSettings(settingsStore));

	// Bleibt stehen, bis wieder erfolgreich gesichert wurde.
	$effect(() => {
		if (competitionStore.saveFailed) {
			toast.error("Wettkampfstand konnte nicht gesichert werden", {
				id: SAVE_FAILED_TOAST,
				description:
					"Bitte prüfen, ob auf dem Laufwerk genug Platz ist. Die App versucht es bei der nächsten Änderung erneut.",
				duration: Infinity
			});
		} else {
			toast.dismiss(SAVE_FAILED_TOAST);
		}
	});

	onMount(async () => {
		// Beim Schließen noch ausstehende Änderungen speichern.
		void beforeWindowClose(flushPendingSaves).catch(() => logError("window.closeHandlerFailed"));
		const { migration, setAside } = await initApp();
		for (const notice of setAside) {
			const { title, description } = setAsideMessage(notice);
			toast.warning(title, { description, duration: Infinity });
		}
		if (migration !== null) {
			const { title, description } = migrationMessage(migration);
			toast.success(title, { description });
		}
		// Erst nach dem Laden, sonst überschriebe der gespeicherte Stand das per Doppelklick geöffnete Projekt.
		void startProjectLaunch(defaultLaunchDeps((message) => toast.error(message)));
	});
</script>

<ModeWatcher />
<!-- Abstand unten, damit Meldungen nicht über der Aktionsleiste liegen. -->
<Toaster
	richColors
	closeButton
	offset={{ bottom: TOAST_BOTTOM_OFFSET }}
	mobileOffset={{ bottom: TOAST_BOTTOM_OFFSET }}
/>
<ProjectOpenDialog />
<FontScaleShortcuts />
<Sidebar.Provider class="h-svh overflow-hidden">
	<AppSidebar />
	<Sidebar.Inset bind:ref={inset} class="overflow-y-auto [scrollbar-gutter:stable]">
		<header
			class="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-1 border-b bg-background/95 px-2 backdrop-blur supports-backdrop-filter:bg-background/80"
		>
			<Sidebar.Trigger />
			<Separator orientation="vertical" class="mx-1 data-vertical:h-4 data-vertical:self-center" />
			<FileMenu />
		</header>
		<main class="@container flex flex-1 flex-col p-6">
			{@render children()}
		</main>
	</Sidebar.Inset>
</Sidebar.Provider>

<style>
	/* Seite füllt die Fensterhöhe, damit die Aktionsleiste immer unten steht. */
	main > :global(*) {
		flex: 1 0 auto;
		width: 100%;
	}
</style>
