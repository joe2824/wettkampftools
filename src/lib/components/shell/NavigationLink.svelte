<script lang="ts">
	import { page } from "$app/state";
	import * as Sidebar from "$lib/components/ui/sidebar";
	import { isActiveRoute, type NavigationItem } from "$lib/navigation";

	let { item }: { item: NavigationItem } = $props();
</script>

<Sidebar.MenuItem>
	<Sidebar.MenuButton
		isActive={isActiveRoute(page.url.pathname, item.href)}
		tooltipContent={item.label}
		class="h-9 data-active:bg-sidebar-primary/15 data-active:text-sidebar-primary data-active:hover:bg-sidebar-primary/20 data-active:hover:text-sidebar-primary"
	>
		{#snippet child({ props })}
			<a href={item.href} {...props}>
				<item.icon />
				<span>{item.label}</span>
			</a>
		{/snippet}
	</Sidebar.MenuButton>
</Sidebar.MenuItem>
