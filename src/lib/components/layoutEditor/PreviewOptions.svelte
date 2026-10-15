<script lang="ts">
	import type { CanvasZoom } from "$lib/components/certificates/LayoutCanvas.svelte";
	import { Label } from "$lib/components/ui/label";
	import { Switch } from "$lib/components/ui/switch";
	import * as ToggleGroup from "$lib/components/ui/toggle-group";

	interface Props {
		withMemberNames: boolean;
		zoom: CanvasZoom;
		/** Hilfslinien und gleiche Abstände beim Ziehen */
		guides: boolean;
	}

	let { withMemberNames = $bindable(), zoom = $bindable(), guides = $bindable() }: Props = $props();
</script>

<div class="flex flex-col gap-3">
	<div class="flex items-center justify-between gap-3">
		<Label for="preview-members">Mitgliedernamen zeigen</Label>
		<Switch id="preview-members" bind:checked={withMemberNames} />
	</div>
	<div class="flex flex-col gap-1">
		<div class="flex items-center justify-between gap-3">
			<Label for="preview-guides">Hilfslinien</Label>
			<Switch id="preview-guides" bind:checked={guides} />
		</div>
		<p class="text-xs text-muted-foreground">
			Einrasten an Kanten, Mitten und gleichen Abständen. Alt hält sie kurz an.
		</p>
	</div>
	<div class="flex flex-col gap-1.5">
		<span id="preview-zoom" class="text-sm font-medium">Ansicht</span>
		<ToggleGroup.Root
			type="single"
			variant="outline"
			size="sm"
			aria-labelledby="preview-zoom"
			value={zoom}
			onValueChange={(value) => value && (zoom = value as CanvasZoom)}
		>
			<ToggleGroup.Item value="fit" class="px-2">Ganze Seite</ToggleGroup.Item>
			<ToggleGroup.Item value="actual" class="px-2">100 %</ToggleGroup.Item>
		</ToggleGroup.Root>
	</div>
</div>
