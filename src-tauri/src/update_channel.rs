//! Update-Kanal: stabil oder Beta, je nach `betaUpdates` in der settings.json.
//! Die Endpunkte müssen feststehen, bevor das Updater-Plugin seine Konfiguration liest.
#![cfg_attr(not(desktop), allow(dead_code))]

use std::path::{Path, PathBuf};

use serde_json::Value;

/// Manifest des stabilen Kanals; steht auch in tauri.conf.json.
pub const UPDATE_STABLE: &str =
    "https://github.com/joe2824/wettkampftools/releases/latest/download/latest.json";

/// Manifest des Beta-Kanals: festes Release `beta`, das jeder Build überschreibt.
pub const UPDATE_BETA: &str =
    "https://github.com/joe2824/wettkampftools/releases/download/beta/latest.json";

const SETTINGS_FILE: &str = "settings.json";
const BETA_KEY: &str = "betaUpdates";
const ENDPOINTS_KEY: &str = "endpoints";

/// Beta zuerst, stabil als Rückfall.
pub fn endpoints(beta: bool) -> Vec<&'static str> {
    if beta {
        vec![UPDATE_BETA, UPDATE_STABLE]
    } else {
        vec![UPDATE_STABLE]
    }
}

/// Steht `betaUpdates` auf true? Unlesbares zählt als aus.
pub fn beta_enabled_in(settings_json: &str) -> bool {
    serde_json::from_str::<Value>(settings_json)
        .ok()
        .and_then(|v| v.get(BETA_KEY).and_then(Value::as_bool))
        .unwrap_or(false)
}

/// Trägt die Endpunkte in die Updater-Konfiguration ein; false, wenn es keine gibt.
pub fn set_endpoints(updater: &mut Value, beta: bool) -> bool {
    let Some(config) = updater.as_object_mut() else {
        return false;
    };
    config.insert(ENDPOINTS_KEY.into(), serde_json::json!(endpoints(beta)));
    true
}

/// settings.json im App-Datenordner, wie ihn auch das Frontend nutzt.
pub fn settings_path(data_dir: &Path, identifier: &str) -> PathBuf {
    data_dir.join(identifier).join(SETTINGS_FILE)
}

/// Basisordner wie `app_data_dir` von Tauri; der PathResolver steht vor dem Start noch nicht bereit.
fn data_dir() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    let base = std::env::var_os("APPDATA").map(PathBuf::from);
    #[cfg(target_os = "macos")]
    let base =
        std::env::var_os("HOME").map(|h| PathBuf::from(h).join("Library/Application Support"));
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    let base = std::env::var_os("XDG_DATA_HOME")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".local/share")));
    base
}

/// Schaltet auf den Beta-Kanal, wenn er in den Einstellungen gewählt ist; true bei Beta.
pub fn apply(context: &mut tauri::Context) -> bool {
    let Some(base) = data_dir() else {
        return false;
    };
    let path = settings_path(&base, &context.config().identifier);
    let beta = std::fs::read_to_string(path).is_ok_and(|text| beta_enabled_in(&text));
    if !beta {
        return false;
    }
    context
        .config_mut()
        .plugins
        .0
        .get_mut("updater")
        .is_some_and(|updater| set_endpoints(updater, true))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn stable_channel_uses_only_stable_manifest() {
        assert_eq!(endpoints(false), vec![UPDATE_STABLE]);
    }

    #[test]
    fn beta_channel_falls_back_to_stable() {
        assert_eq!(endpoints(true), vec![UPDATE_BETA, UPDATE_STABLE]);
    }

    #[test]
    fn reads_beta_flag_from_settings() {
        assert!(beta_enabled_in(r#"{"betaUpdates": true, "ageGroups": []}"#));
        assert!(!beta_enabled_in(r#"{"betaUpdates": false}"#));
    }

    #[test]
    fn treats_missing_or_invalid_flag_as_off() {
        assert!(!beta_enabled_in("{}"));
        assert!(!beta_enabled_in(r#"{"betaUpdates": "ja"}"#));
        assert!(!beta_enabled_in("[true]"));
        assert!(!beta_enabled_in("kein json"));
        assert!(!beta_enabled_in(""));
    }

    #[test]
    fn replaces_endpoints_and_keeps_pubkey() {
        let mut updater = json!({ "endpoints": [UPDATE_STABLE], "pubkey": "abc" });
        assert!(set_endpoints(&mut updater, true));
        assert_eq!(
            updater,
            json!({ "endpoints": [UPDATE_BETA, UPDATE_STABLE], "pubkey": "abc" })
        );
    }

    #[test]
    fn leaves_non_object_config_alone() {
        let mut updater = json!(null);
        assert!(!set_endpoints(&mut updater, true));
        assert_eq!(updater, json!(null));
    }

    #[test]
    fn settings_file_lies_in_app_data_folder() {
        let path = settings_path(Path::new("/daten"), "de.example.app");
        assert_eq!(
            path,
            Path::new("/daten")
                .join("de.example.app")
                .join("settings.json")
        );
    }

    #[test]
    fn stable_manifest_matches_tauri_config() {
        let config: Value = serde_json::from_str(include_str!("../tauri.conf.json"))
            .expect("tauri.conf.json ist gültiges JSON");
        assert_eq!(
            config["plugins"]["updater"]["endpoints"],
            json!([UPDATE_STABLE])
        );
    }
}
