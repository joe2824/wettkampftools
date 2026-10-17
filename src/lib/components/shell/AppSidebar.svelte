<script lang="ts">
	import * as Sidebar from "$lib/components/ui/sidebar";
	import { FOOTER_ITEMS, HOME_ITEM, NAVIGATION_GROUPS } from "$lib/navigation";
	import InfoIcon from "@lucide/svelte/icons/info";
	import { onMount } from "svelte";
	import InfoDialog from "$lib/components/InfoDialog.svelte";
	import UpdateDialog from "$lib/components/UpdateDialog.svelte";
	import { updater } from "$lib/release/updater.svelte";
	import { APP_VERSION } from "$lib/version";
	import NavigationLink from "./NavigationLink.svelte";

	let infoOpen = $state(false);

	onMount(() => {
		void updater.checkOnStart();
	});
</script>

<Sidebar.Root collapsible="icon" variant="inset">
	<Sidebar.Header class="border-b border-sidebar-border">
		<Sidebar.Menu>
			<NavigationLink item={HOME_ITEM} />
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		{#each NAVIGATION_GROUPS as group (group.label)}
			<Sidebar.Group>
				<Sidebar.GroupLabel>{group.label}</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each group.items as item (item.href)}
							<NavigationLink {item} />
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		{/each}
	</Sidebar.Content>
	<Sidebar.Footer class="border-t border-sidebar-border">
		<Sidebar.Menu>
			{#each FOOTER_ITEMS as item (item.href)}
				<NavigationLink {item} />
			{/each}
			<Sidebar.MenuItem>
				<Sidebar.MenuButton tooltipContent="Info" class="h-9" onclick={() => (infoOpen = true)}>
					<InfoIcon />
					<span>Info</span>
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
		<p class="px-2 text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">Version {APP_VERSION}</p>
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>

<InfoDialog bind:open={infoOpen} />
<UpdateDialog />
