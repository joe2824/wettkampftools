// Vom Benutzer gewählte oder abgelegte Eingabedateien lesen.
use crate::file_check::{app_scope, canonical_existing, has_extension, not_found, user_path};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

/// Nur diese Endungen liest die Anwendung ein.
const INPUT_EXTENSIONS: [&str; 10] = [
    "csv",
    "xls",
    "xlsx",
    "xlsm",
    "rwm",
    "json",
    "png",
    "jpg",
    "jpeg",
    PROJECT_EXTENSION,
];

/// Projektdatei mit dem ganzen Wettkampfstand; darf größer sein.
pub const PROJECT_EXTENSION: &str = "wwkprojekt";

const BYTES_PER_MB: u64 = 1024 * 1024;
const MAX_INPUT_MB: u64 = 20;
const MAX_PROJECT_MB: u64 = 50;

/// Größte lesbare Dateigröße in MB, je nach Endung; größere Dateien werden nicht gelesen.
fn max_input_mb(path: &Path) -> u64 {
    if has_extension(path, &[PROJECT_EXTENSION]) {
        MAX_PROJECT_MB
    } else {
        MAX_INPUT_MB
    }
}

/// Erstellungs- und Änderungszeit in Millisekunden seit 1970; fehlt, wenn das System sie nicht kennt.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct FileTimes {
    created_ms: Option<i64>,
    modified_ms: Option<i64>,
}

/// Angaben zur Datei für die Oberfläche.
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InputFileInfo {
    name: String,
    size: u64,
    created_ms: Option<i64>,
    modified_ms: Option<i64>,
}

/// Prüft eine Eingabedatei und gibt ihren normalisierten Pfad zurück.
///
/// Erlaubt ist nur eine vorhandene, nicht zu große Datei mit erlaubter Endung,
/// die der Benutzer gewählt oder abgelegt hat (`allowed_in_scope`).
fn check_input_target(
    path: &Path,
    allowed_in_scope: impl Fn(&Path) -> bool,
) -> Result<PathBuf, String> {
    let canonical = canonical_existing(path)?;
    let metadata = std::fs::metadata(&canonical).map_err(|_| not_found(path))?;
    if !metadata.is_file() {
        return Err(format!("{} ist keine Datei.", user_path(&canonical)));
    }
    if !has_extension(&canonical, &INPUT_EXTENSIONS) {
        return Err(format!(
            "Die Datei {} kann hier nicht geöffnet werden.",
            user_path(&canonical)
        ));
    }
    let max_mb = max_input_mb(&canonical);
    if metadata.len() > max_mb * BYTES_PER_MB {
        return Err(format!("Die Datei ist größer als {max_mb} MB."));
    }
    if !allowed_in_scope(&canonical) {
        return Err("Die Datei bitte erneut auswählen oder hierher ziehen.".to_string());
    }
    Ok(canonical)
}

/// Zeitpunkt in Millisekunden seit 1970; unbekannt bei Fehlern oder Zeiten davor.
fn epoch_millis(time: std::io::Result<SystemTime>) -> Option<i64> {
    let since_epoch = time.ok()?.duration_since(UNIX_EPOCH).ok()?;
    i64::try_from(since_epoch.as_millis()).ok()
}

/// Erstellungs- und Änderungszeit aus dem Dateisystem.
fn file_times(path: &Path) -> std::io::Result<FileTimes> {
    let metadata = std::fs::metadata(path)?;
    Ok(FileTimes {
        created_ms: epoch_millis(metadata.created()),
        modified_ms: epoch_millis(metadata.modified()),
    })
}

/// Abgelegte oder per Doppelklick übergebene Dateien: nur lesbar.
///
/// Bewusst getrennt vom Datei-Scope der App, den `write_output_file` als
/// Schreibfreigabe nutzt: eine abgelegte Datei darf nie überschrieben werden.
#[derive(Default)]
pub struct ReadGrants(Mutex<HashSet<PathBuf>>);

impl ReadGrants {
    /// Gibt einlesbare Dateien frei; gemerkt wird der normalisierte Pfad.
    pub fn allow_paths(&self, paths: &[PathBuf]) {
        let Ok(mut granted) = self.0.lock() else {
            return;
        };
        let canonical = paths.iter().filter(|p| is_droppable(p));
        granted.extend(canonical.filter_map(|p| std::fs::canonicalize(p).ok()));
    }

    /// Erwartet den normalisierten Pfad aus `check_input_target`.
    fn is_allowed(&self, canonical: &Path) -> bool {
        self.0
            .lock()
            .is_ok_and(|granted| granted.contains(canonical))
    }
}

/// Lesen erlaubt: im Öffnen-Dialog gewählt (Datei-Scope) oder abgelegt bzw. übergeben.
fn check_readable(app: &tauri::AppHandle, path: &str) -> Result<PathBuf, String> {
    use tauri::Manager;
    let in_scope = app_scope(app);
    let grants = app.try_state::<ReadGrants>();
    check_input_target(Path::new(path), |p| {
        in_scope(p) || grants.as_ref().is_some_and(|g| g.is_allowed(p))
    })
}

/// Liest eine gewählte oder abgelegte Datei als Bytes.
#[tauri::command]
pub fn read_input_file(
    app: tauri::AppHandle,
    path: String,
) -> Result<tauri::ipc::Response, String> {
    let checked = check_readable(&app, &path)?;
    let bytes = std::fs::read(checked).map_err(|_| {
        "Die Datei konnte nicht gelesen werden. Bitte erneut versuchen.".to_string()
    })?;
    Ok(tauri::ipc::Response::new(bytes))
}

/// Name, Größe, Erstellungs- und Änderungszeit einer gewählten oder abgelegten Datei.
#[tauri::command]
pub fn input_file_info(app: tauri::AppHandle, path: String) -> Result<InputFileInfo, String> {
    let checked = check_readable(&app, &path)?;
    let times = file_times(&checked).map_err(|_| {
        "Die Datei konnte nicht gelesen werden. Bitte erneut versuchen.".to_string()
    })?;
    let size = std::fs::metadata(&checked)
        .map(|m| m.len())
        .unwrap_or_default();
    let name = Path::new(&path)
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default();
    Ok(InputFileInfo {
        name,
        size,
        created_ms: times.created_ms,
        modified_ms: times.modified_ms,
    })
}

/// Nur Dateien, die die Anwendung auch einlesen würde.
fn is_droppable(path: &Path) -> bool {
    path.is_file() && has_extension(path, &INPUT_EXTENSIONS)
}

/// Abgelegte Dateien nur zum Einlesen freigeben (der Öffnen-Dialog nutzt den Datei-Scope).
pub fn allow_dropped_paths(app: &tauri::AppHandle, paths: &[PathBuf]) {
    use tauri::Manager;
    if let Some(grants) = app.try_state::<ReadGrants>() {
        grants.allow_paths(paths);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::file_check::test_support::{allow_all, TempFile};

    fn temp_file(file_name: &str) -> TempFile {
        TempFile::with_bytes("input", file_name, b"x")
    }

    #[test]
    fn input_accepts_allowed_extensions() {
        for name in [
            "a.csv",
            "b.xls",
            "c.xlsx",
            "d.xlsm",
            "e.rwm",
            "f.json",
            "g.png",
            "h.jpg",
            "i.jpeg",
            "j.wwkprojekt",
        ] {
            let file = temp_file(name);
            let checked = check_input_target(&file.0, allow_all).expect("erlaubt");
            assert_eq!(checked, std::fs::canonicalize(&file.0).unwrap());
        }
    }

    #[test]
    fn input_accepts_uppercase_extension() {
        let file = temp_file("Ergebnisse.XLS");
        assert!(check_input_target(&file.0, allow_all).is_ok());
    }

    #[test]
    fn input_rejects_other_extensions() {
        for name in ["a.exe", "b.txt", "c.lnk", "ohne_endung", "d.xls.exe"] {
            let file = temp_file(name);
            let err = check_input_target(&file.0, allow_all).unwrap_err();
            assert!(
                err.contains("kann hier nicht geöffnet werden"),
                "{name}: {err}"
            );
        }
    }

    #[test]
    fn input_rejects_missing_file() {
        let path = std::env::temp_dir().join("wettkampftools-input-gibt-es-nicht.csv");
        let err = check_input_target(&path, allow_all).unwrap_err();
        assert!(err.contains("nicht gefunden"), "{err}");
    }

    #[test]
    fn input_rejects_directory() {
        let dir = std::env::temp_dir().join(format!(
            "wettkampftools-input-ordner-{}.csv",
            std::process::id()
        ));
        std::fs::create_dir_all(&dir).unwrap();
        let err = check_input_target(&dir, allow_all).unwrap_err();
        let _ = std::fs::remove_dir(&dir);
        assert!(err.contains("keine Datei"), "{err}");
    }

    #[test]
    fn input_rejects_too_large_file() {
        let file = temp_file("gross.csv");
        let handle = std::fs::OpenOptions::new()
            .write(true)
            .open(&file.0)
            .unwrap();
        handle.set_len(MAX_INPUT_MB * BYTES_PER_MB + 1).unwrap();
        let err = check_input_target(&file.0, allow_all).unwrap_err();
        assert!(err.contains("größer als 20 MB"), "{err}");
    }

    #[test]
    fn project_files_may_be_larger() {
        let file = temp_file("gross.wwkprojekt");
        let handle = std::fs::OpenOptions::new()
            .write(true)
            .open(&file.0)
            .unwrap();
        handle.set_len(MAX_INPUT_MB * BYTES_PER_MB + 1).unwrap();
        assert!(check_input_target(&file.0, allow_all).is_ok());
        handle.set_len(MAX_PROJECT_MB * BYTES_PER_MB + 1).unwrap();
        let err = check_input_target(&file.0, allow_all).unwrap_err();
        assert!(err.contains("größer als 50 MB"), "{err}");
    }

    #[test]
    fn input_rejects_path_outside_scope() {
        let file = temp_file("a.csv");
        let err = check_input_target(&file.0, |_| false).unwrap_err();
        assert!(err.contains("erneut auswählen"), "{err}");
    }

    #[test]
    fn input_checks_scope_with_normalized_path() {
        let file = temp_file("a.json");
        let dotted = file.dotted();
        let canonical = std::fs::canonicalize(&file.0).unwrap();
        let result = check_input_target(&dotted, |p| p == canonical);
        assert_eq!(result.unwrap(), canonical);
    }

    #[test]
    fn file_times_reports_modification_time() {
        let file = temp_file("zeit.csv");
        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as i64;
        let times = file_times(&file.0).expect("Zeiten lesbar");
        let modified = times.modified_ms.expect("Änderungszeit vorhanden");
        assert!((now_ms - modified).abs() < 60_000, "{modified} vs {now_ms}");
        // macOS und Windows kennen das Erstellungsdatum.
        #[cfg(any(target_os = "macos", target_os = "windows"))]
        assert!(times.created_ms.is_some());
    }

    #[test]
    fn file_times_fails_for_missing_file() {
        let path = std::env::temp_dir().join("wettkampftools-input-fehlt.csv");
        assert!(file_times(&path).is_err());
    }

    #[test]
    fn epoch_millis_converts_and_drops_errors() {
        let time = std::time::UNIX_EPOCH + std::time::Duration::from_millis(1_234);
        assert_eq!(epoch_millis(Ok(time)), Some(1_234));
        let failed: std::io::Result<std::time::SystemTime> =
            Err(std::io::Error::other("nicht unterstützt"));
        assert_eq!(epoch_millis(failed), None);
    }

    #[test]
    fn only_readable_files_are_droppable() {
        let csv = temp_file("meldungen.csv");
        let exe = temp_file("programm.exe");
        assert!(is_droppable(&csv.0));
        assert!(!is_droppable(&exe.0));
        assert!(!is_droppable(&std::env::temp_dir()));
        let missing = std::env::temp_dir().join("wettkampftools-input-fehlt.csv");
        assert!(!is_droppable(&missing));
    }

    #[test]
    fn read_grants_allow_only_droppable_files() {
        let csv = temp_file("meldungen.csv");
        let exe = temp_file("programm.exe");
        let grants = ReadGrants::default();
        grants.allow_paths(&[csv.0.clone(), exe.0.clone()]);
        let canonical = |file: &TempFile| std::fs::canonicalize(&file.0).unwrap();
        assert!(grants.is_allowed(&canonical(&csv)));
        assert!(!grants.is_allowed(&canonical(&exe)));
    }

    #[test]
    fn read_grants_work_with_any_spelling_of_the_path() {
        let file = temp_file("Übung Süd.wwkprojekt");
        let grants = ReadGrants::default();
        grants.allow_paths(std::slice::from_ref(&file.dotted()));
        let allowed = |p: &Path| grants.is_allowed(p);
        let simplified = dunce::canonicalize(&file.0).unwrap();
        assert!(check_input_target(&file.0, allowed).is_ok());
        assert!(check_input_target(&simplified, allowed).is_ok());
        let other = temp_file("andere.csv");
        assert!(check_input_target(&other.0, allowed).is_err());
    }

    #[test]
    fn input_errors_show_path_without_prefix() {
        let file = temp_file("programm.exe");
        let err = check_input_target(&file.0, allow_all).unwrap_err();
        let shown = crate::file_check::user_path(&std::fs::canonicalize(&file.0).unwrap());
        assert!(err.contains(&shown), "{err}");
        assert!(!err.contains(r"\\?\"), "{err}");
    }

    #[test]
    fn input_info_serializes_camel_case() {
        let info = InputFileInfo {
            name: "Ergebnisse.xls".into(),
            size: 3,
            created_ms: Some(1),
            modified_ms: None,
        };
        let json = serde_json::to_value(&info).unwrap();
        assert_eq!(
            json,
            serde_json::json!({ "name": "Ergebnisse.xls", "size": 3, "createdMs": 1, "modifiedMs": null })
        );
    }
}
