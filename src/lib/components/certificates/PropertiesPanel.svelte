<script lang="ts">
	import AlignCenterIcon from "@lucide/svelte/icons/align-center";
	import AlignLeftIcon from "@lucide/svelte/icons/align-left";
	import AlignRightIcon from "@lucide/svelte/icons/align-right";
	import type { ObjectPatch } from "$lib/certificates/editorOps";
	import { MAX_FONT_PT, MIN_FONT_PT, type LayoutObject, type TextAlign } from "$lib/certificates/layout";
	import { Label } from "$lib/components/ui/label";
	import { Switch } from "$lib/components/ui/switch";
	import * as ToggleGroup from "$lib/components/ui/toggle-group";
	import FontSelect from "$lib/components/layoutEditor/FontSelect.svelte";
	import NumberField from "$lib/components/layoutEditor/NumberField.svelte";
	import TemplateEditor from "$lib/components/layoutEditor/TemplateEditor.svelte";

	interface Props {
		object: LayoutObject | null;
		onchange: (patch: ObjectPatch) => void;
	}

	let { object, onchange }: Props = $props();

	const POSITION_STEP_MM = 0.5;
	const SIZE_STEP_PT = 0.5;
	const ALIGNMENTS: { value: TextAlign; label: string; icon: typeof AlignLeftIcon }[] = [
		{ value: "left", label: "Linksbündig", icon: AlignLeftIcon },
		{ value: "center", label: "Zentriert", icon: AlignCenterIcon },
		{ value: "right", label: "Rechtsbündig", icon: AlignRightIcon }
	];
</script>

<section aria-label="Eigenschaften" class="flex flex-col gap-4">
	{#if object === null}
		<h2 class="text-sm font-semibold text-muted-foreground">Eigenschaften</h2>
		<p class="text-sm text-muted-foreground">
			Ein Element in der Vorschau oder in der Liste anklicken, um es zu bearbeiten.
		</p>
	{:else}
		<div class="flex flex-col gap-0.5">
			<h2 class="font-semibold">{object.label || object.id}</h2>
			<p class="text-xs text-muted-foreground">Maße in Millimetern, Schriftgrößen in Punkt.</p>
		</div>

		<div class="grid grid-cols-2 gap-3">
			<NumberField id="prop-x" label="X" value={object.xMm} step={POSITION_STEP_MM} onvalue={(xMm) => onchange({ xMm })} />
			<NumberField
				id="prop-y"
				label={object.kind === "text" ? "Y (Grundlinie)" : "Y (Oberkante)"}
				value={object.yMm}
				step={POSITION_STEP_MM}
				onvalue={(yMm) => onchange({ yMm })}
			/>
			<NumberField
				id="prop-width"
				label="Breite"
				value={object.widthMm}
				step={POSITION_STEP_MM}
				onvalue={(widthMm) => onchange({ widthMm })}
			/>
			{#if object.kind === "image"}
				<NumberField
					id="prop-height"
					label="Höhe"
					value={object.heightMm}
					step={POSITION_STEP_MM}
					onvalue={(heightMm) => onchange({ heightMm })}
				/>
			{/if}
		</div>

		{#if object.kind === "text"}
			<div class="flex flex-col gap-1.5">
				<span id="prop-align" class="text-sm font-medium">Ausrichtung</span>
				<ToggleGroup.Root
					type="single"
					variant="outline"
					aria-labelledby="prop-align"
					value={object.align}
					onValueChange={(value) => value && onchange({ align: value as TextAlign })}
				>
					{#each ALIGNMENTS as alignment (alignment.value)}
						<ToggleGroup.Item value={alignment.value} aria-label={alignment.label} title={alignment.label}>
							<alignment.icon />
						</ToggleGroup.Item>
					{/each}
				</ToggleGroup.Root>
			</div>

			<div class="grid grid-cols-2 gap-3">
				<FontSelect id="prop-font" label="Schrift" value={object.font} onchange={(font) => onchange({ font })} />
				<FontSelect
					id="prop-bold-font"
					label="Fett-Schrift"
					value={object.boldFont}
					onchange={(boldFont) => onchange({ boldFont })}
				/>
				<NumberField
					id="prop-size"
					label="Größe (pt)"
					value={object.sizePt}
					step={SIZE_STEP_PT}
					min={MIN_FONT_PT}
					max={MAX_FONT_PT}
					onvalue={(sizePt) => onchange({ sizePt })}
				/>
				<NumberField
					id="prop-min-size"
					label="Mindestgröße (pt)"
					value={object.minSizePt}
					step={SIZE_STEP_PT}
					min={MIN_FONT_PT}
					max={object.sizePt}
					onvalue={(minSizePt) => onchange({ minSizePt })}
				/>
			</div>
			<p class="-mt-2 text-xs text-muted-foreground">Zu lange Texte werden bis zur Mindestgröße verkleinert.</p>

			<TemplateEditor template={object.template} onchange={(template) => onchange({ template })} />

			<div class="flex items-center justify-between gap-3">
				<Label for="prop-members">Nur mit Mitgliedernamen anzeigen</Label>
				<Switch
					id="prop-members"
					checked={object.visibleWhen === "withMemberNames"}
					onCheckedChange={(checked) => onchange({ visibleWhen: checked ? "withMemberNames" : "always" })}
				/>
			</div>
		{/if}
	{/if}
</section>
