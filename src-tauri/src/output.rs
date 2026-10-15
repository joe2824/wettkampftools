// Fertige Ausgabedateien öffnen oder im Ordner zeigen.
use crate::file_check::{app_scope, canonical_existing, has_extension};
use std::path::{Path, PathBuf};

/// Nur diese Endungen schreibt die Anwendung selbst.
const OUTPUT_EXTENSIONS: [&str; 3] = ["xlsx", "pdf", "json"];

/// Prüft eine Ausgabedatei und gibt ihren normalisierten Pfad zurück.
///
/// Erlaubt ist nur eine vorhandene Datei mit erlaubter Endung, die der
/// Benutzer zuvor im Speichern-Dialog gewählt hat (`allowed_in_scope`).
fn check_output_target(
    path: &Path,
    allowed_in_scope: impl Fn(&Path) -> bool,
) -> Result<PathBuf, String> {
    let canonical = canonical_existing(path)?;
    if !has_extension(&canonical, &OUTPUT_EXTENSIONS) {
        return Err(format!(
            "Die Datei {} darf nicht geöffnet werden.",
            canonical.display()
        ));
    }
    if !allowed_in_scope(&canonical) {
        return Err(format!(
            "Die Datei {} wurde nicht in dieser Sitzung gespeichert. Bitte erneut speichern.",
            canonical.display()
        ));
    }
    Ok(canonical)
}

/// Prüfung mit dem Datei-Scope der App: den füllt der Speichern-Dialog.
///
/// Geöffnet wird danach der Pfad aus dem Dialog, nicht der normalisierte:
/// unter Windows trägt der normalisierte das Präfix `\\?\`, mit dem
/// manche Programme nicht zurechtkommen.
fn check_in_app_scope(app: &tauri::AppHandle, path: &str) -> Result<(), String> {
    check_output_target(Path::new(path), app_scope(app)).map(|_| ())
}

/// Öffnet eine gespeicherte Ausgabedatei mit dem Standardprogramm.
#[tauri::command]
pub fn open_output_file(app: tauri::AppHandle, path: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    check_in_app_scope(&app, &path)?;
    app.opener()
        .open_path(path, None::<&str>)
        .map_err(|e| format!("Die Datei konnte nicht geöffnet werden: {e}"))
}

/// Zeigt eine gespeicherte Ausgabedatei in ihrem Ordner.
#[tauri::command]
pub fn reveal_output_file(app: tauri::AppHandle, path: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    check_in_app_scope(&app, &path)?;
    app.opener()
        .reveal_item_in_dir(&path)
        .map_err(|e| format!("Der Ordner konnte nicht angezeigt werden: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::file_check::test_support::{allow_all, TempFile};

    fn temp_file(file_name: &str) -> TempFile {
        TempFile::with_bytes("output", file_name, b"")
    }

    #[test]
    fn output_accepts_allowed_extensions() {
        for name in ["a.xlsx", "b.pdf", "c.json"] {
            let file = temp_file(name);
            let checked = check_output_target(&file.0, allow_all).expect("erlaubt");
            assert_eq!(checked, std::fs::canonicalize(&file.0).unwrap());
        }
    }

    #[test]
    fn output_accepts_uppercase_extension() {
        let file = temp_file("Auswertung.PDF");
        assert!(check_output_target(&file.0, allow_all).is_ok());
    }

    #[test]
    fn output_rejects_other_extensions() {
        for name in ["a.exe", "b.bat", "c.lnk", "ohne_endung", "d.xlsx.exe"] {
            let file = temp_file(name);
            let err = check_output_target(&file.0, allow_all).unwrap_err();
            assert!(err.contains("darf nicht geöffnet werden"), "{name}: {err}");
        }
    }

    #[test]
    fn output_rejects_missing_file() {
        let path = std::env::temp_dir().join("wettkampftools-output-gibt-es-nicht.pdf");
        let err = check_output_target(&path, allow_all).unwrap_err();
        assert!(err.contains("nicht gefunden"), "{err}");
    }

    #[test]
    fn output_rejects_path_outside_scope() {
        let file = temp_file("a.pdf");
        let err = check_output_target(&file.0, |_| false).unwrap_err();
        assert!(err.contains("nicht in dieser Sitzung gespeichert"), "{err}");
    }

    #[test]
    fn output_checks_scope_with_normalized_path() {
        let file = temp_file("a.json");
        let dotted = file.dotted();
        let canonical = std::fs::canonicalize(&file.0).unwrap();
        let result = check_output_target(&dotted, |p| p == canonical);
        assert_eq!(result.unwrap(), canonical);
    }
}
