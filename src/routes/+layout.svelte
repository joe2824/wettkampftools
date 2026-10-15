<script lang="ts">
	import "../app.css";
	import { ModeWatcher } from "mode-watcher";
	import ProjectOpenDialog from "$lib/components/home/ProjectOpenDialog.svelte";
	import AppSidebar from "$lib/components/shell/AppSidebar.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar";
	import { Toaster } from "$lib/components/ui/sonner";
	import { onMount } from "svelte";
	import { toast } from "svelte-sonner";
	import { initApp, migrationMessage, setAsideMessage } from "$lib/appInit";
	import { defaultLaunchDeps, startProjectLaunch } from "$lib/workflows/projectLaunch";

	const TOAST_BOTTOM_OFFSET = "5rem";

	let { children } = $props();

	onMount(async () => {
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
<Sidebar.Provider>
	<AppSidebar />
	<Sidebar.Inset>
		<header class="flex h-12 shrink-0 items-center border-b px-2">
			<Sidebar.Trigger />
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
