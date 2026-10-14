// Nur lesender Zugriff auf HKEY_CURRENT_USER (Windows).
use std::io;

use winreg::enums::{RegType, HKEY_CURRENT_USER, KEY_READ};
use winreg::RegKey;

use super::qt_value::{split_multi_sz, utf16le_to_string, RegValue};
use super::{build_legacy_settings, LegacySettings};

/// Registry-Pfad der alten Version unter HKEY_CURRENT_USER.
pub const LEGACY_KEY_PATH: &str = r"Software\Joe2824\WettkampfTools";

/// Öffnet den Schlüssel nur lesend; fehlt er, gibt es `None`.
pub fn read_current_user(path: &str) -> io::Result<Option<LegacySettings>> {
    let root = RegKey::predef(HKEY_CURRENT_USER);
    let key = match root.open_subkey_with_flags(path, KEY_READ) {
        Ok(key) => key,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error),
    };
    Ok(Some(build_legacy_settings(|name| {
        key.get_raw_value(name)
            .ok()
            .map(|raw| to_reg_value(raw.vtype, &raw.bytes))
    })))
}

fn to_reg_value(vtype: RegType, bytes: &[u8]) -> RegValue {
    match vtype {
        RegType::REG_SZ | RegType::REG_EXPAND_SZ => RegValue::Sz(utf16le_to_string(bytes)),
        RegType::REG_MULTI_SZ => RegValue::MultiSz(split_multi_sz(bytes)),
        RegType::REG_BINARY | RegType::REG_NONE => RegValue::Binary(bytes.to_vec()),
        _ => RegValue::Unsupported,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::borrow::Cow;
    use std::time::{SystemTime, UNIX_EPOCH};
    use winreg::RegValue as RawValue;

    fn utf16le(s: &str) -> Vec<u8> {
        s.encode_utf16().flat_map(|u| u.to_le_bytes()).collect()
    }

    fn raw(vtype: RegType, text: &str) -> RawValue<'static> {
        RawValue {
            bytes: Cow::Owned(utf16le(text)),
            vtype,
        }
    }

    /// Wegwerf-Schlüssel, der beim Verlassen gelöscht wird.
    struct TestKey(String);

    impl Drop for TestKey {
        fn drop(&mut self) {
            let _ = RegKey::predef(HKEY_CURRENT_USER).delete_subkey_all(&self.0);
        }
    }

    fn unique_test_path() -> String {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        format!(
            r"Software\Joe2824-WettkampfToolsTest-{}-{nanos}",
            std::process::id()
        )
    }

    #[test]
    fn missing_key_is_none() {
        assert_eq!(read_current_user(&unique_test_path()).unwrap(), None);
    }

    #[test]
    fn reads_values_from_throwaway_key() {
        let test_key = TestKey(unique_test_path());
        let (key, _) = RegKey::predef(HKEY_CURRENT_USER)
            .create_subkey(&test_key.0)
            .unwrap();
        key.set_raw_value(
            "age_groups",
            &raw(RegType::REG_MULTI_SZ, "AK 10\0AK 12\0\0"),
        )
        .unwrap();
        key.set_raw_value(
            "age_groups_senior_team",
            &raw(RegType::REG_MULTI_SZ, "\0\0"),
        )
        .unwrap();
        key.set_raw_value("start_age_group_wwk", &raw(RegType::REG_SZ, "@@AK 12\0"))
            .unwrap();
        key.set_raw_value("simplify_senior_groups", &raw(RegType::REG_SZ, "false\0"))
            .unwrap();
        key.set_raw_value("drop_not_started_teams", &raw(RegType::REG_DWORD, "xx"))
            .unwrap();

        let settings = read_current_user(&test_key.0).unwrap().unwrap();

        assert_eq!(
            settings.age_groups,
            Some(vec!["AK 10".to_string(), "AK 12".to_string()])
        );
        assert_eq!(settings.senior_team_age_groups, Some(vec![]));
        assert_eq!(settings.senior_individual_age_groups, None);
        assert_eq!(settings.wave_start_age_group, Some("@AK 12".to_string()));
        assert_eq!(settings.simplify_senior_age_groups, Some(false));
        assert_eq!(settings.exclude_unplaced_teams, None);
        assert_eq!(
            settings.warnings,
            vec!["drop_not_started_teams.undecodable".to_string()]
        );
    }
}
