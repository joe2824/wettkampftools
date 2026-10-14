// Einstellungen der alten Version aus der Windows-Registry lesen (nur lesend).
import { invoke } from "@tauri-apps/api/core";
import type { LegacySettings } from "$lib/settings/settings";

/** Liefert die alten Einstellungen; null, wenn es keine gibt oder nicht Windows. */
export function readLegacySettings(): Promise<LegacySettings | null> {
  return invoke<LegacySettings | null>("read_legacy_settings");
}
