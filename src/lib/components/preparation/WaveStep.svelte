<script lang="ts">
	import RotateCcwIcon from "@lucide/svelte/icons/rotate-ccw";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import { Label } from "$lib/components/ui/label";
	import { ScrollArea } from "$lib/components/ui/scroll-area";
	import { cn } from "$lib/utils.js";
	import type { Team } from "$lib/wwk/registrations";
	import { groupByOrganisation, setTeamsInWave } from "$lib/workflows/preparation";

	interface Props {
		teams: Team[];
		selection: Set<string>;
		onchange: (selection: Set<string>) => void;
		onreset: () => void;
	}

	let { teams, selection, onchange, onreset }: Props = $props();

	let chosen = $state<string | null>(null);

	const groups = $derived(groupByOrganisation(teams, selection));
	const current = $derived(groups.find((group) => group.organisation === chosen) ?? groups[0]);
	const totalSelected = $derived(groups.reduce((sum, group) => sum + group.selected, 0));

	function toggle(teamId: string, inWave: boolean) {
		onchange(setTeamsInWave(selection, [teamId], inWave));
	}

	function setAll(inWave: boolean) {
		if (current) onchange(setTeamsInWave(selection, current.teams.map((team) => team.id), inWave));
	}
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
	<p class="text-sm text-muted-foreground">
		{totalSelected} von {teams.length} Mannschaften starten in der Welle.
	</p>
	<Button variant="outline" size="sm" onclick={onreset}>
		<RotateCcwIcon data-icon="inline-start" />
		Auswahl zurücksetzen
	</Button>
</div>

<div class="grid gap-4 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
	<ScrollArea class="h-80 rounded-lg border">
		<ul class="flex flex-col p-1" aria-label="Gliederungen">
			{#each groups as group (group.organisation)}
				<li>
					<button
						type="button"
						class={cn(
							"flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted",
							group === current && "bg-muted font-medium"
						)}
						aria-current={group === current}
						onclick={() => (chosen = group.organisation)}
					>
						<span class="truncate">{group.organisation || "(ohne Gliederung)"}</span>
						<Badge variant={group.selected > 0 ? "default" : "outline"} class="tabular-nums">
							{group.selected}/{group.teams.length}
						</Badge>
					</button>
				</li>
			{/each}
		</ul>
	</ScrollArea>

	{#if current}
		<div class="flex flex-col gap-3 rounded-lg border p-4">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h3 class="font-medium">{current.organisation || "(ohne Gliederung)"}</h3>
				<div class="flex gap-2">
					<Button variant="ghost" size="sm" onclick={() => setAll(true)}>Alle in der Welle</Button>
					<Button variant="ghost" size="sm" onclick={() => setAll(false)}>Keine</Button>
				</div>
			</div>
			<ul class="flex flex-col gap-3">
				{#each current.teams as team (team.id)}
					{@const id = `wave-${team.id}`}
					<li class="flex items-center gap-3">
						<Checkbox
							{id}
							checked={selection.has(team.id)}
							onCheckedChange={(checked) => toggle(team.id, checked === true)}
						/>
						<Label for={id} class="font-normal">
							{team.name} · {team.ageGroup} · {team.gender}
						</Label>
					</li>
				{/each}
			</ul>
			<p class="text-xs text-muted-foreground">Häkchen = startet in der Welle.</p>
		</div>
	{/if}
</div>
