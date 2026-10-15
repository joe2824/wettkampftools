// Ob die Karte unter „Entfernungen“ gezeigt wird.
import { readStoredFlag, writeStoredFlag } from "$lib/components/storedFlag";

export const MAP_VISIBLE_KEY = "distances.mapVisible";

export const readMapVisible = (): boolean => readStoredFlag(MAP_VISIBLE_KEY, true);

export const writeMapVisible = (visible: boolean): void => writeStoredFlag(MAP_VISIBLE_KEY, visible);
