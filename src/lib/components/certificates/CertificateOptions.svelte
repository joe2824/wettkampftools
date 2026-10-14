<script lang="ts">
	import InfoIcon from "@lucide/svelte/icons/info";
	import { toast } from "svelte-sonner";
	import * as Alert from "$lib/components/ui/alert";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Switch } from "$lib/components/ui/switch";
	import { MAX_COPIES, MIN_COPIES } from "$lib/settings/settings";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";
	import type { CompetitionKind } from "$lib/wwk/results";
	import { clampCopies } from "./certificateSelection";

	interface Props {
		competition: CompetitionKind;
		namesShortfall: number;
	}

	let { competition, namesShortfall }: Props = $props();

	const isTeam = $derived(competition === "team");
	const certificates = $derived(settingsStore.settings.certificates);
	const copies = $derived(isTeam ? certificates.copiesPerTeam : certificates.copiesPerIndividual);

	async function persist() {
		try {
			await settingsStore.save();
		} catch {
			toast.error("Die Einstellung konnte nicht gespeichert werden.");
		}
	}

	function setWithMemberNames(checked: boolean) {
		settingsStore.settings.certificates.withMemberNames = checked;
		void persist();
	}

	function setCopies(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const value = clampCopies(input.valueAsNumber);
		input.value = String(value);
		if (isTeam) settingsStore.settings.certificates.copiesPerTeam = value;
		else settingsStore.settings.certificates.copiesPerIndividual = value;
		void persist();
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap items-end gap-6">
		<div class="flex flex-col gap-2">
			<Label for="certificate-copies">{isTeam ? "Urkunden je Mannschaft" : "Urkunden je Person"}</Label>
			<Input
				id="certificate-copies"
				type="number"
				class="w-24"
				min={MIN_COPIES}
				max={MAX_COPIES}
				step={1}
				value={copies}
				onchange={setCopies}
			/>
		</div>

		{#if isTeam}
			<div class="flex items-center gap-3 pb-2">
				<Switch
					id="certificate-member-names"
					checked={certificates.withMemberNames}
					onCheckedChange={setWithMemberNames}
				/>
				<Label for="certificate-member-names">Mitgliedernamen drucken</Label>
			</div>
		{/if}
	</div>

	{#if isTeam && certificates.withMemberNames}
		<p class="text-sm text-muted-foreground">
			Urkunde 1 erhält den Namen von Mitglied 1, Urkunde 2 von Mitglied 2 usw.
		</p>
		{#if namesShortfall > 0}
			<Alert.Root>
				<InfoIcon />
				<Alert.Title>Nicht alle Mitglieder erhalten eine Urkunde mit Namen</Alert.Title>
				<Alert.Description>
					{namesShortfall === 1 ? "Eine Mannschaft hat" : `${namesShortfall} Mannschaften haben`} mehr Mitglieder
					als Urkunden je Mannschaft eingestellt sind.
				</Alert.Description>
			</Alert.Root>
		{/if}
	{/if}
</div>
