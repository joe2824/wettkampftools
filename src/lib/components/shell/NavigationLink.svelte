<script lang="ts">
	import { page } from "$app/state";
	import * as Sidebar from "$lib/components/ui/sidebar";
	import { isActiveRoute, type NavigationItem } from "$lib/navigation";

	let { item }: { item: NavigationItem } = $props();
</script>

<Sidebar.MenuItem>
	<Sidebar.MenuButton isActive={isActiveRoute(page.url.pathname, item.href)} tooltipContent={item.label}>
		{#snippet child({ props })}
			<a href={item.href} {...props}>
				<item.icon />
				<span>{item.label}</span>
			</a>
		{/snippet}
	</Sidebar.MenuButton>
</Sidebar.MenuItem>
