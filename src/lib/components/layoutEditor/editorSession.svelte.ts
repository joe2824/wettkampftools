// Zustand des Layout-Editors: Variante, Auswahl und Rückgängig-Verlauf über dem Layout-Speicher.
import { canRedo, canUndo, emptyHistory, record, redo, undo, type HistoryStep } from "$lib/certificates/editHistory";
import { moveObjects, replaceObjects, type Axis, type DeltaMm } from "$lib/certificates/editorOps";
import type { Layout, LayoutObject, LayoutSet, LayoutVariant, SignatureSlot } from "$lib/certificates/layout";
import { layoutStore } from "$lib/certificates/layoutStore.svelte";
import {
	addSignature,
	addText,
	duplicateObjects,
	removeObjects,
	type LayoutChange
} from "$lib/certificates/layoutObjects";
import { mapObjectOf, setMapEnabled } from "$lib/certificates/mapObject";
import { alignObjects, distributeObjects, type AlignEdge, type AlignReference } from "$lib/certificates/objectAlign";
import { groupObjects, ungroupObjects } from "$lib/certificates/objectGroups";
import { selectedObjects } from "$lib/certificates/objectSelection";
import { layoutSnapshot } from "$lib/workflows/layoutEditor";

/** Was der Editor vom Layout-Speicher braucht */
export interface LayoutSource {
	layouts: LayoutSet;
	/** Ändert sich, wenn das Layout von außen ersetzt wird. */
	readonly generation: number;
}

export class LayoutEditorSession {
	readonly #store: LayoutSource;
	#variant = $state<LayoutVariant>("team");
	selectedIds = $state.raw<string[]>([]);
	history = $state.raw(emptyHistory());
	readonly selected = $derived(selectedObjects(this.layout, this.selectedIds));
	readonly canUndo = $derived(canUndo(this.history));
	readonly canRedo = $derived(canRedo(this.history));

	// Zuletzt gesehener Stand; Änderungen dagegen landen im Verlauf.
	#current: string;
	#key = "other";
	#applyingHistory = false;
	#actions = 0;
	#generation: number;

	/** Muss beim Anlegen einer Komponente erzeugt werden (nutzt $effect). */
	constructor(store: LayoutSource = layoutStore) {
		this.#store = store;
		this.#current = layoutSnapshot(store.layouts);
		this.#generation = store.generation;
		// Jede Layout-Änderung (Bearbeiten, Import, Zurücksetzen) wird für Rückgängig gemerkt,
		// außer das Layout wurde von außen ersetzt (z. B. Projekt geöffnet): dann beginnt der Verlauf neu.
		$effect(() => {
			const generation = this.#store.generation;
			const snapshot = layoutSnapshot(this.#store.layouts);
			if (generation !== this.#generation) {
				this.#restart(generation, snapshot);
				return;
			}
			if (snapshot === this.#current) return;
			if (!this.#applyingHistory) this.history = record(this.history, this.#current, this.#key, Date.now());
			this.#current = snapshot;
			this.#applyingHistory = false;
			this.#key = "other";
		});
	}

	get layout(): Layout {
		return this.#store.layouts[this.variant];
	}

	get variant(): LayoutVariant {
		return this.#variant;
	}

	/** Beim Wechsel der Variante endet die Auswahl. */
	set variant(variant: LayoutVariant) {
		this.#variant = variant;
		this.selectedIds = [];
	}

	select(ids: string[]): void {
		this.selectedIds = ids;
	}

	/** Übernimmt ein geändertes Layout; ohne Schlüssel ist jede Aktion ein eigener Schritt. */
	apply(layout: Layout, key = `action:${++this.#actions}`): void {
		this.#key = key;
		this.#store.layouts[this.variant] = layout;
	}

	commitObjects(objects: readonly LayoutObject[], key?: string): void {
		this.apply(replaceObjects(this.layout, objects), key);
	}

	#applyChange(change: LayoutChange | null): void {
		if (change === null) return;
		this.apply(change.layout);
		this.selectedIds = change.ids;
	}

	addText(template?: string): void {
		this.#applyChange(addText(this.layout, template));
	}

	addSignature(slot: SignatureSlot): void {
		this.#applyChange(addSignature(this.layout, slot));
	}

	setMap(enabled: boolean): void {
		this.apply(setMapEnabled(this.layout, enabled), "map");
		const map = mapObjectOf(this.layout);
		if (enabled && map) this.selectedIds = [map.id];
		if (!enabled && map) this.selectedIds = this.selectedIds.filter((id) => id !== map.id);
	}

	remove(): void {
		if (this.selectedIds.length === 0) return;
		this.apply(removeObjects(this.layout, this.selectedIds));
		this.selectedIds = [];
	}

	duplicate(): void {
		const change = duplicateObjects(this.layout, this.selectedIds);
		if (change.ids.length > 0) this.#applyChange(change);
	}

	group(): void {
		this.apply(groupObjects(this.layout, this.selectedIds));
	}

	ungroup(): void {
		this.apply(ungroupObjects(this.layout, this.selectedIds));
	}

	align(edge: AlignEdge, reference: AlignReference): void {
		this.commitObjects(alignObjects(this.selected, edge, reference));
	}

	distribute(axis: Axis): void {
		this.commitObjects(distributeObjects(this.selected, axis));
	}

	/** Pfeiltasten: schnelle Folgen an derselben Auswahl sind ein Schritt. */
	nudge(delta: DeltaMm): void {
		this.commitObjects(moveObjects(this.selected, delta, false), `nudge:${this.selectedIds.join(",")}`);
	}

	undo(): void {
		this.#applyStep(undo(this.history, this.#current));
	}

	redo(): void {
		this.#applyStep(redo(this.history, this.#current));
	}

	#restart(generation: number, snapshot: string): void {
		this.#generation = generation;
		this.#current = snapshot;
		this.history = emptyHistory();
		this.selectedIds = [];
		this.#applyingHistory = false;
		this.#key = "other";
	}

	#applyStep(step: HistoryStep): void {
		if (step.snapshot === null) return;
		this.history = step.history;
		this.#applyingHistory = true;
		this.#store.layouts = JSON.parse(step.snapshot);
		const known = new Set(this.#store.layouts[this.variant].objects.map((object) => object.id));
		this.selectedIds = this.selectedIds.filter((id) => known.has(id));
	}
}
