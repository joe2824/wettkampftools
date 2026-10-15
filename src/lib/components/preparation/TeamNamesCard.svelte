<script lang="ts">
	import AutosaveStatus from "$lib/components/AutosaveStatus.svelte";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import * as Table from "$lib/components/ui/table";
	import { FieldAutosave } from "$lib/settings/fieldAutosave.svelte";
	import { MAX_TEAM_NAME_LENGTH } from "$lib/settings/settings";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";
	import type { Team } from "$lib/wwk/registrations";
	import { teamNameRows, withTeamNameOverride } from "$lib/wwk/teamNames";

	interface Props {
		teams: Team[];
	}

	let { teams }: Props = $props();

	const autosave = new FieldAutosave(settingsStore, "teamNameOverrides", "settings.teamNamesSaveFailed");
	// Eingabetext je Gliederung, damit Leerzeichen beim Tippen nicht verschwinden.
	let drafts = $state<Record<string, string>>({});

	const rows = $derived(teamNameRows(teams, settingsStore.settings.teamNameOverrides));

	// Beim Verlassen der Seite nichts verlieren.
	$effect(() => () => void autosave.flush());

	function setName(organisation: string, name: string) {
		drafts[organisation] = name;
		const current = settingsStore.settings.teamNameOverrides;
		settingsStore.settings.teamNameOverrides = withTeamNameOverride(current, organisation, name);
		autosave.schedule();
	}
</script>

<div class="flex flex-col gap-2">
	<div>
		<h3 class="text-sm font-medium">Mannschaftsnamen</h3>
		<p class="text-sm text-muted-foreground">
			Gilt für alle Mannschaften der Gliederung und wird für die nächsten Jahre gemerkt. Die Spalte ‚gliederung‘ für
			JAuswertung bleibt unverändert.
		</p>
	</div>
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head>Gliederung</Table.Head>
				<Table.Head>Name in der Meldung</Table.Head>
				<Table.Head>Mannschaftsname</Table.Head>
				<Table.Head><span class="sr-only">Aktionen</span></Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each rows as row (row.organisation)}
				<Table.Row class={row.differs ? "bg-muted/40" : undefined}>
					<Table.Cell class="font-medium">{row.organisation || "(leer)"}</Table.Cell>
					<Table.Cell class={row.differs ? "whitespace-normal" : "whitespace-normal text-muted-foreground"}>
						{row.reportedNames.join(", ") || "–"}
					</Table.Cell>
					<Table.Cell>
						<Input
							class="h-8 min-w-48"
							aria-label={`Mannschaftsname für ${row.organisation}`}
							placeholder={row.organisation}
							maxlength={MAX_TEAM_NAME_LENGTH}
							value={drafts[row.organisation] ?? row.override}
							oninput={(event) => setName(row.organisation, event.currentTarget.value)}
						/>
					</Table.Cell>
					<Table.Cell class="text-right">
						{#if row.suggestion}
							<Button variant="outline" size="sm" onclick={() => setName(row.organisation, row.suggestion ?? "")}>
								Meldename übernehmen
							</Button>
						{/if}
						{#if row.override}
							<Button variant="ghost" size="sm" onclick={() => setName(row.organisation, "")}>Zurücksetzen</Button>
						{/if}
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
	<AutosaveStatus status={autosave.status} />
</div>
