<script lang="ts">
	import RotateCcwIcon from "@lucide/svelte/icons/rotate-ccw";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import { Label } from "$lib/components/ui/label";
	import { cn } from "$lib/utils.js";
	import type { Team } from "$lib/wwk/registrations";
	import { groupByOrganisation, setTeamsInRescue, setTeamsInWave } from "$lib/workflows/preparation";

	interface Props {
		teams: Team[];
		selection: Set<string>;
		/** Teams, deren Altersklasse laut Einstellungen in der Welle starten darf. */
		eligible: ReadonlySet<string>;
		/** Teams, die nicht in der Rettung starten. */
		rescueExcluded: Set<string>;
		onchange: (selection: Set<string>) => void;
		onrescuechange: (rescueExcluded: Set<string>) => void;
		onreset: () => void;
	}

	let { teams, selection, eligible, rescueExcluded, onchange, onrescuechange, onreset }: Props = $props();

	let chosen = $state<string | null>(null);

	const groups = $derived(groupByOrganisation(teams, selection, rescueExcluded));
	const current = $derived(groups.find((group) => group.organisation === chosen) ?? groups[0]);
	const totalSelected = $derived(groups.reduce((sum, group) => sum + group.selected, 0));
	const totalRescue = $derived(teams.length - rescueExcluded.size);
	const totalNotStarting = $derived(groups.reduce((sum, group) => sum + group.notStarting, 0));

	function toggleRescue(teamId: string, inRescue: boolean) {
		onrescuechange(setTeamsInRescue(rescueExcluded, [teamId], inRescue));
	}

	function toggle(teamId: string, inWave: boolean) {
		onchange(setTeamsInWave(selection, [teamId], inWave, eligible));
	}

	function setAll(inWave: boolean) {
		if (current)
			onchange(
				setTeamsInWave(
					selection,
					current.teams.map((team) => team.id),
					inWave,
					eligible
				)
			);
	}
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
	<p class="text-sm text-muted-foreground">
		{totalRescue} von {teams.length} Mannschaften starten in der Rettung, {totalSelected} in der Welle: zusammen
		{totalRescue + totalSelected} Meldungen.
		{#if totalNotStarting > 0}
			<span class="text-destructive">{totalNotStarting} starten gar nicht.</span>
		{/if}
	</p>
	<Button variant="outline" size="sm" onclick={onreset}>
		<RotateCcwIcon data-icon="inline-start" />
		Auswahl zurücksetzen
	</Button>
</div>

<div class="grid gap-4 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
	<div class="self-start rounded-lg border">
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
						<span class="flex shrink-0 gap-1">
							<Badge
								variant={group.notStarting > 0 ? "destructive" : "outline"}
								class="tabular-nums"
								title="Starts in der Rettung"
							>
								R {group.rescue}/{group.teams.length}
							</Badge>
							<Badge
								variant={group.selected > 0 ? "default" : "outline"}
								class="tabular-nums"
								title="Starts in der Welle"
							>
								W {group.selected}/{group.teams.length}
							</Badge>
						</span>
					</button>
				</li>
			{/each}
		</ul>
	</div>

	{#if current}
		<div class="flex flex-col gap-3 self-start rounded-lg border p-4 md:sticky md:top-16">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h3 class="font-medium">{current.organisation || "(ohne Gliederung)"}</h3>
				<div class="flex gap-2">
					<Button variant="ghost" size="sm" onclick={() => setAll(true)}>Alle in der Welle</Button>
					<Button variant="ghost" size="sm" onclick={() => setAll(false)}>Keine in der Welle</Button>
				</div>
			</div>
			<div class="grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3">
				<span class="text-xs text-muted-foreground">Rettung</span>
				<span class="text-xs text-muted-foreground">Welle</span>
				<span></span>
				{#each current.teams as team (team.id)}
					{@const rescueId = `rescue-${team.id}`}
					{@const waveId = `wave-${team.id}`}
					{@const allowed = eligible.has(team.id)}
					{@const inRescue = !rescueExcluded.has(team.id)}
					{@const inWave = selection.has(team.id)}
					<Checkbox
						id={rescueId}
						class="justify-self-center"
						checked={inRescue}
						aria-label={`${team.name} startet in der Rettung`}
						onCheckedChange={(checked) => toggleRescue(team.id, checked === true)}
					/>
					<Checkbox
						id={waveId}
						class="justify-self-center"
						checked={inWave}
						disabled={!allowed && !inWave}
						aria-label={`${team.name} startet in der Welle`}
						onCheckedChange={(checked) => toggle(team.id, checked === true)}
					/>
					<Label for={rescueId} class={cn("font-normal", !inRescue && !inWave && "text-muted-foreground")}>
						{team.name} · {team.ageGroup} · {team.gender}
						{#if !allowed}
							<span class="text-xs text-muted-foreground">(nicht startberechtigt in der Welle)</span>
						{/if}
						{#if !inRescue && !inWave}
							<span class="text-xs text-destructive">(startet nicht)</span>
						{:else if !inRescue}
							<span class="text-xs text-muted-foreground">(nur Welle)</span>
						{/if}
					</Label>
				{/each}
			</div>
			<p class="text-xs text-muted-foreground">
				Häkchen bei „Rettung“ oder „Welle“ = startet dort. In der Welle startberechtigt sind die Altersklassen ab der
				Einstellung „Wellen-Starterlaubnis ab“.
			</p>
		</div>
	{/if}
</div>
