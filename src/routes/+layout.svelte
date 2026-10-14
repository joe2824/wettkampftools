<script lang="ts">
	import "../app.css";
	import { ModeWatcher } from "mode-watcher";
	import AppSidebar from "$lib/components/shell/AppSidebar.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar";
	import { Toaster } from "$lib/components/ui/sonner";
	import { onMount } from "svelte";
	import { toast } from "svelte-sonner";
	import { initApp, migrationMessage } from "$lib/appInit";

	let { children } = $props();

	onMount(async () => {
		const report = await initApp();
		if (report === null) return;
		const { title, description } = migrationMessage(report);
		toast.success(title, { description });
	});
</script>

<ModeWatcher />
<Toaster richColors closeButton />
<Sidebar.Provider>
	<AppSidebar />
	<Sidebar.Inset>
		<header class="flex h-12 shrink-0 items-center border-b px-2">
			<Sidebar.Trigger />
		</header>
		<main class="flex-1 p-6">
			{@render children()}
		</main>
	</Sidebar.Inset>
</Sidebar.Provider>
