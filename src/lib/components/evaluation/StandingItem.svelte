<script lang="ts">
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
	import TrophyIcon from "@lucide/svelte/icons/trophy";
	import { Badge } from "$lib/components/ui/badge";
	import * as Collapsible from "$lib/components/ui/collapsible";
	import { formatTrophyPoints } from "$lib/format/points";
	import { cn } from "$lib/utils.js";
	import type { Standing } from "$lib/wwk/scoring";
	import TeamBreakdown from "./TeamBreakdown.svelte";

	interface Props {
		standing: Standing;
	}

	let { standing }: Props = $props();

	const FIRST_RANK = 1;
	/** Gold, Silber, Bronze für die Plätze 1 bis 3. */
	const MEDALS: Record<number, string> = {
		1: "border-transparent bg-[#e8b923] text-[#3b2c00]",
		2: "border-transparent bg-[#c4c7cf] text-[#23262d]",
		3: "border-transparent bg-[#c97d3c] text-[#381f05]"
	};

	const winner = $derived(standing.rank === FIRST_RANK);
	const medal = $derived(MEDALS[standing.rank]);
	const teamLabel = $derived(standing.teams.length === 1 ? "1 Mannschaft" : `${standing.teams.length} Mannschaften`);
</script>

<Collapsible.Root class={cn("rounded-lg border", winner && "border-[#e8b923]/50 bg-[#e8b923]/5")}>
	<Collapsible.Trigger
		class="group grid w-full grid-cols-[4rem_1fr_auto_1.5rem] items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
		aria-label="Aufschlüsselung für {standing.organisation} ein- oder ausblenden"
	>
		<Badge variant="outline" class={cn("h-6 min-w-10 tabular-nums", medal)}>
			{#if winner}<TrophyIcon data-icon="inline-start" aria-hidden="true" />{/if}
			{standing.rank}.
		</Badge>
		<span class="flex min-w-0 flex-col">
			<span class={cn("truncate", winner ? "font-semibold" : "font-medium")}>{standing.organisation}</span>
			<span class="text-xs text-muted-foreground">{teamLabel}</span>
		</span>
		<span class={cn("text-right tabular-nums", winner ? "text-lg font-bold" : "font-semibold")}>
			{formatTrophyPoints(standing.trophyPoints)}
		</span>
		<ChevronDownIcon
			class="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
			aria-hidden="true"
		/>
	</Collapsible.Trigger>
	<Collapsible.Content class="border-t px-3 pb-2">
		<TeamBreakdown teams={standing.teams} />
	</Collapsible.Content>
</Collapsible.Root>
