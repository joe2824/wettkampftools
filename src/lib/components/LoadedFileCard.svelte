<script lang="ts">
	import type { Component, Snippet } from "svelte";
	import { Button } from "$lib/components/ui/button";

	interface Props {
		icon: Component<{ class?: string; "aria-hidden"?: "true" }>;
		title: string;
		/** Vollständiger Dateiname als Tooltip. */
		tooltip: string;
		details: Snippet;
		/** Zusätzliche Kennzeichnung vor dem Knopf, z. B. eine Plakette. */
		badge?: Snippet;
		onreplace: () => void;
	}

	let { icon: Icon, title, tooltip, details, badge, onreplace }: Props = $props();
</script>

<div class="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3">
	<Icon class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
	<div class="flex min-w-0 flex-1 flex-col">
		<span class="truncate font-medium" title={tooltip}>{title}</span>
		<span class="text-sm text-muted-foreground">{@render details()}</span>
	</div>
	{@render badge?.()}
	<Button variant="outline" size="sm" onclick={onreplace}>Andere Datei laden</Button>
</div>
