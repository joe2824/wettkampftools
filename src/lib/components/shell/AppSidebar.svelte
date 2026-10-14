<script lang="ts">
	import * as Sidebar from "$lib/components/ui/sidebar";
	import { FOOTER_ITEMS, NAVIGATION_GROUPS } from "$lib/navigation";
	import InfoIcon from "@lucide/svelte/icons/info";
	import { onMount } from "svelte";
	import InfoDialog from "$lib/components/InfoDialog.svelte";
	import UpdateDialog from "$lib/components/UpdateDialog.svelte";
	import { updater } from "$lib/release/updater.svelte";
	import NavigationLink from "./NavigationLink.svelte";

	let infoOpen = $state(false);

	onMount(() => {
		void updater.checkOnStart();
	});
</script>

<Sidebar.Root collapsible="icon">
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton size="lg">
					{#snippet child({ props })}
						<a href="/" {...props}>
							<img src="/logo.png" alt="" class="size-8 shrink-0" />
							<span class="font-bold">Wettkampftools</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
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
	<Sidebar.Footer>
		<Sidebar.Menu>
			{#each FOOTER_ITEMS as item (item.href)}
				<NavigationLink {item} />
			{/each}
			<Sidebar.MenuItem>
				<Sidebar.MenuButton tooltipContent="Info" onclick={() => (infoOpen = true)}>
					<InfoIcon />
					<span>Info</span>
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>

<InfoDialog bind:open={infoOpen} />
<UpdateDialog />
