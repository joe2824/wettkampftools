// Fertige Ausgabedateien öffnen oder im Ordner zeigen.
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
    let canonical = std::fs::canonicalize(path)
        .map_err(|_| format!("Die Datei {} wurde nicht gefunden.", path.display()))?;
    let has_allowed_extension = canonical
        .extension()
        .and_then(|e| e.to_str())
        .is_some_and(|e| OUTPUT_EXTENSIONS.iter().any(|x| e.eq_ignore_ascii_case(x)));
    if !has_allowed_extension {
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
    use tauri_plugin_fs::FsExt;
    let scope = app.try_fs_scope();
    check_output_target(Path::new(path), |p| {
        scope.as_ref().is_some_and(|s| s.is_allowed(p))
    })
    .map(|_| ())
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
    use std::sync::atomic::{AtomicUsize, Ordering};

    /// Legt eine leere Datei im Temp-Ordner an und räumt sie beim Drop weg.
    struct TempFile(PathBuf);

    impl TempFile {
        fn new(file_name: &str) -> Self {
            static COUNTER: AtomicUsize = AtomicUsize::new(0);
            let unique = format!(
                "wettkampftools-output-{}-{}-{file_name}",
                std::process::id(),
                COUNTER.fetch_add(1, Ordering::Relaxed)
            );
            let path = std::env::temp_dir().join(unique);
            std::fs::write(&path, b"").expect("Testdatei anlegen");
            Self(path)
        }
    }

    impl Drop for TempFile {
        fn drop(&mut self) {
            let _ = std::fs::remove_file(&self.0);
        }
    }

    fn allow_all(_: &Path) -> bool {
        true
    }

    #[test]
    fn output_accepts_allowed_extensions() {
        for name in ["a.xlsx", "b.pdf", "c.json"] {
            let file = TempFile::new(name);
            let checked = check_output_target(&file.0, allow_all).expect("erlaubt");
            assert_eq!(checked, std::fs::canonicalize(&file.0).unwrap());
        }
    }

    #[test]
    fn output_accepts_uppercase_extension() {
        let file = TempFile::new("Auswertung.PDF");
        assert!(check_output_target(&file.0, allow_all).is_ok());
    }

    #[test]
    fn output_rejects_other_extensions() {
        for name in ["a.exe", "b.bat", "c.lnk", "ohne_endung", "d.xlsx.exe"] {
            let file = TempFile::new(name);
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
        let file = TempFile::new("a.pdf");
        let err = check_output_target(&file.0, |_| false).unwrap_err();
        assert!(err.contains("nicht in dieser Sitzung gespeichert"), "{err}");
    }

    #[test]
    fn output_checks_scope_with_normalized_path() {
        let file = TempFile::new("a.json");
        let dotted = file
            .0
            .parent()
            .unwrap()
            .join(".")
            .join(file.0.file_name().unwrap());
        let canonical = std::fs::canonicalize(&file.0).unwrap();
        let result = check_output_target(&dotted, |p| p == canonical);
        assert_eq!(result.unwrap(), canonical);
    }
}
