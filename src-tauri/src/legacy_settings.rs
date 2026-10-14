// Übernahme der Einstellungen der alten Version (QSettings in der Windows-Registry, nur lesend).
// Der Decoder wird nur unter Windows aufgerufen, getestet wird er auf allen Systemen.
#![cfg_attr(not(windows), allow(dead_code))]

mod data_stream;
mod qt_value;
#[cfg(windows)]
mod registry;

use qt_value::{decode_value, QValue, RegValue};
use serde::Serialize;

/// Einstellungen der alten Version; fehlende oder unlesbare Felder bleiben leer.
#[derive(Debug, Clone, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacySettings {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub age_groups: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub senior_team_age_groups: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub senior_individual_age_groups: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wave_start_age_group: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub simplify_senior_age_groups: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exclude_unplaced_teams: Option<bool>,
    pub warnings: Vec<String>,
}

const KEY_AGE_GROUPS: &str = "age_groups";
const KEY_SENIOR_TEAM: &str = "age_groups_senior_team";
const KEY_SENIOR_INDIVIDUAL: &str = "age_groups_senior_individual";
const KEY_WAVE_START: &str = "start_age_group_wwk";
const KEY_SIMPLIFY_SENIOR: &str = "simplify_senior_groups";
const KEY_DROP_NOT_STARTED: &str = "drop_not_started_teams";
const UNDECODABLE_SUFFIX: &str = ".undecodable";

/// Liest die bekannten Schlüssel; Unlesbares bleibt leer und erzeugt einen Hinweis-Code.
pub fn build_legacy_settings(lookup: impl Fn(&str) -> Option<RegValue>) -> LegacySettings {
    let mut fields = FieldReader {
        lookup,
        warnings: Vec::new(),
    };
    LegacySettings {
        age_groups: fields.read(KEY_AGE_GROUPS, as_list),
        senior_team_age_groups: fields.read(KEY_SENIOR_TEAM, as_list),
        senior_individual_age_groups: fields.read(KEY_SENIOR_INDIVIDUAL, as_list),
        wave_start_age_group: fields.read(KEY_WAVE_START, as_text),
        simplify_senior_age_groups: fields.read(KEY_SIMPLIFY_SENIOR, as_bool),
        exclude_unplaced_teams: fields.read(KEY_DROP_NOT_STARTED, as_bool),
        warnings: fields.warnings,
    }
}

struct FieldReader<F> {
    lookup: F,
    warnings: Vec<String>,
}

impl<F: Fn(&str) -> Option<RegValue>> FieldReader<F> {
    /// Fehlender Schlüssel → leer; vorhanden, aber unbrauchbar → leer + Hinweis.
    fn read<T>(&mut self, key: &str, extract: fn(QValue) -> Option<T>) -> Option<T> {
        let raw = (self.lookup)(key)?;
        let value = extract(decode_value(raw));
        if value.is_none() {
            self.warnings.push(format!("{key}{UNDECODABLE_SUFFIX}"));
        }
        value
    }
}

fn as_list(value: QValue) -> Option<Vec<String>> {
    match value {
        QValue::List(items) => Some(items),
        _ => None,
    }
}

fn as_text(value: QValue) -> Option<String> {
    match value {
        QValue::Text(text) => Some(text),
        _ => None,
    }
}

fn as_bool(value: QValue) -> Option<bool> {
    match value {
        QValue::Bool(flag) => Some(flag),
        _ => None,
    }
}

/// Liest die Einstellungen der alten Version; ohne Windows oder ohne Eintrag `None`.
#[tauri::command]
pub fn read_legacy_settings() -> Result<Option<LegacySettings>, String> {
    #[cfg(windows)]
    {
        registry::read_current_user(registry::LEGACY_KEY_PATH).map_err(|_| {
            "Die Einstellungen der alten Version konnten nicht gelesen werden.".to_string()
        })
    }
    #[cfg(not(windows))]
    {
        Ok(None)
    }
}

#[cfg(test)]
mod tests;
