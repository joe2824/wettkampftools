<script lang="ts">
	import { setMode, userPrefersMode } from "mode-watcher";

	type Mode = "light" | "dark" | "system";
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import MinusIcon from "@lucide/svelte/icons/minus";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import { Button } from "$lib/components/ui/button";
	import { DEFAULT_FONT_SCALE, FONT_SCALES } from "$lib/components/shell/fontScale";
	import { fontScale } from "$lib/components/shell/fontScaleState.svelte";
	import { isApplePlatform } from "$lib/components/shell/fileShortcuts";

	const key = typeof navigator !== "undefined" && isApplePlatform(navigator.userAgent) ? "⌘" : "Strg";

	// Hell, dunkel oder wie das System; gilt sofort und wird auf diesem Rechner gemerkt, nicht in den Einstellungen.
	const OPTIONS: { value: Mode; label: string }[] = [
		{ value: "system", label: "Wie Windows" },
		{ value: "light", label: "Hell" },
		{ value: "dark", label: "Dunkel" }
	];

	const current = $derived(userPrefersMode.current);
	const label = $derived(OPTIONS.find((option) => option.value === current)?.label ?? "Wie Windows");
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-col gap-2 rounded-lg border border-border p-4">
		<Label for="appearance-mode">Farbschema</Label>
		<Select.Root type="single" value={current} onValueChange={(value) => value && setMode(value as Mode)}>
			<Select.Trigger id="appearance-mode" class="w-56" aria-describedby="appearance-mode-hint">{label}</Select.Trigger>
			<Select.Content>
				{#each OPTIONS as option (option.value)}
					<Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
		<p id="appearance-mode-hint" class="text-sm text-muted-foreground">
			Gilt sofort und nur auf diesem Rechner; „Speichern“ ist dafür nicht nötig.
		</p>
	</div>

	<div class="flex flex-col gap-2 rounded-lg border border-border p-4">
		<span id="font-scale-label" class="text-sm leading-none font-medium">Schriftgröße</span>
		<div class="flex items-center gap-2" role="group" aria-labelledby="font-scale-label">
			<Button
				variant="outline"
				size="icon"
				aria-label="Kleiner"
				disabled={fontScale.current === FONT_SCALES[0]}
				onclick={() => fontScale.apply("smaller")}
			>
				<MinusIcon />
			</Button>
			<span class="w-14 text-center tabular-nums" aria-live="polite">{fontScale.current} %</span>
			<Button
				variant="outline"
				size="icon"
				aria-label="Größer"
				disabled={fontScale.current === FONT_SCALES[FONT_SCALES.length - 1]}
				onclick={() => fontScale.apply("larger")}
			>
				<PlusIcon />
			</Button>
			<Button
				variant="ghost"
				size="sm"
				disabled={fontScale.current === DEFAULT_FONT_SCALE}
				onclick={() => fontScale.apply("reset")}
			>
				Zurücksetzen
			</Button>
		</div>
		<p class="text-sm text-muted-foreground">
			Auch überall mit {key} + Plus, {key} + Minus und {key} + 0. Gilt sofort und nur auf diesem Rechner.
		</p>
	</div>
</div>
