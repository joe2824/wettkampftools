use super::*;
use std::collections::HashMap;

fn strings(items: &[&str]) -> Vec<String> {
    items.iter().map(|s| s.to_string()).collect()
}

fn lookup_from(values: Vec<(&'static str, RegValue)>) -> impl Fn(&str) -> Option<RegValue> {
    let map: HashMap<&str, RegValue> = values.into_iter().collect();
    move |name| map.get(name).cloned()
}

fn complete_values() -> Vec<(&'static str, RegValue)> {
    vec![
        (
            "age_groups",
            RegValue::MultiSz(strings(&["AK 10", "AK 12"])),
        ),
        (
            "age_groups_senior_team",
            RegValue::MultiSz(strings(&["AK 100"])),
        ),
        (
            "age_groups_senior_individual",
            RegValue::MultiSz(strings(&["AK 25", "AK 30"])),
        ),
        ("start_age_group_wwk", RegValue::Sz("AK 12".into())),
        ("simplify_senior_groups", RegValue::Sz("false".into())),
        ("drop_not_started_teams", RegValue::Sz("true".into())),
        ("gld_data", RegValue::Sz("@Invalid()".into())),
    ]
}

#[test]
fn reads_all_fields() {
    let settings = build_legacy_settings(lookup_from(complete_values()));
    assert_eq!(
        settings,
        LegacySettings {
            age_groups: Some(strings(&["AK 10", "AK 12"])),
            senior_team_age_groups: Some(strings(&["AK 100"])),
            senior_individual_age_groups: Some(strings(&["AK 25", "AK 30"])),
            wave_start_age_group: Some("AK 12".into()),
            simplify_senior_age_groups: Some(false),
            exclude_unplaced_teams: Some(true),
            warnings: vec![],
        }
    );
}

#[test]
fn missing_keys_stay_empty_without_warning() {
    let settings = build_legacy_settings(|_| None);
    assert_eq!(settings, LegacySettings::default());
}

#[test]
fn undecodable_keys_give_one_warning_each() {
    let settings = build_legacy_settings(lookup_from(vec![
        ("age_groups", RegValue::Sz("AK 10".into())),
        ("age_groups_senior_team", RegValue::Sz("@Invalid()".into())),
        (
            "age_groups_senior_individual",
            RegValue::Binary(vec![1, 2, 3]),
        ),
        (
            "start_age_group_wwk",
            RegValue::MultiSz(strings(&["AK 12"])),
        ),
        ("simplify_senior_groups", RegValue::Sz("vielleicht".into())),
        ("drop_not_started_teams", RegValue::Unsupported),
    ]));
    assert_eq!(
        settings.warnings,
        strings(&[
            "age_groups.undecodable",
            "age_groups_senior_team.undecodable",
            "age_groups_senior_individual.undecodable",
            "start_age_group_wwk.undecodable",
            "simplify_senior_groups.undecodable",
            "drop_not_started_teams.undecodable",
        ])
    );
    assert_eq!(
        LegacySettings {
            warnings: vec![],
            ..settings
        },
        LegacySettings::default()
    );
}

#[test]
fn ignores_gld_data() {
    let settings =
        build_legacy_settings(lookup_from(vec![("gld_data", RegValue::Binary(vec![9]))]));
    assert!(settings.warnings.is_empty());
}

#[test]
fn serializes_camel_case_and_omits_missing() {
    let full = serde_json::to_value(build_legacy_settings(lookup_from(complete_values()))).unwrap();
    assert_eq!(
        full,
        serde_json::json!({
            "ageGroups": ["AK 10", "AK 12"],
            "seniorTeamAgeGroups": ["AK 100"],
            "seniorIndividualAgeGroups": ["AK 25", "AK 30"],
            "waveStartAgeGroup": "AK 12",
            "simplifySeniorAgeGroups": false,
            "excludeUnplacedTeams": true,
            "warnings": []
        })
    );
    let empty = serde_json::to_value(LegacySettings::default()).unwrap();
    assert_eq!(empty, serde_json::json!({ "warnings": [] }));
}

#[cfg(not(windows))]
#[test]
fn command_returns_none_outside_windows() {
    assert_eq!(read_legacy_settings(), Ok(None));
}
