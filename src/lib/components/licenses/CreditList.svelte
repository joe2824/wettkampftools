<script lang="ts">
	import ExternalLink from "$lib/components/ExternalLink.svelte";
	import { Badge } from "$lib/components/ui/badge";
	import { CREDITS } from "$lib/release/credits";
</script>

<ul class="grid gap-3 sm:grid-cols-2">
	{#each CREDITS as credit (credit.title)}
		<li class="flex flex-col gap-1.5 rounded-lg border p-3">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h3 class="font-medium">{credit.title}</h3>
				<Badge variant="outline">{credit.license}</Badge>
			</div>
			<p class="text-muted-foreground">{credit.text}</p>
			{#if credit.copyright}
				<p class="text-xs text-muted-foreground">{credit.copyright}</p>
			{/if}
			{#if credit.links.length > 0}
				<p class="flex flex-wrap gap-x-3 gap-y-1 text-sm">
					{#each credit.links as link (link.url)}
						<ExternalLink url={link.url}>{link.label}</ExternalLink>
					{/each}
				</p>
			{/if}
		</li>
	{/each}
</ul>
