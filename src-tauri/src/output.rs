// Ausgabedateien schreiben, öffnen oder im Ordner zeigen.
use crate::file_check::{app_scope, canonical_existing, has_extension};
use percent_encoding::percent_decode_str;
use std::path::{Path, PathBuf};
use tauri::ipc::{InvokeBody, Request};

/// Nur diese Endungen schreibt die Anwendung selbst.
const OUTPUT_EXTENSIONS: [&str; 4] = ["xlsx", "pdf", "json", "rwm"];

/// Kopfzeile mit dem URL-kodierten Zielpfad; die Bytes kommen roh im Body.
const PATH_HEADER: &str = "x-output-path";

const WRITE_ERROR: &str = "Die Datei konnte nicht gespeichert werden. Bitte erneut versuchen.";

fn not_writable(path: &Path) -> String {
    format!(
        "Die Datei {} darf nicht geschrieben werden.",
        path.display()
    )
}

/// Zielpfad aus der Kopfzeile.
fn decode_path_header(raw: &str) -> Result<String, String> {
    percent_decode_str(raw)
        .decode_utf8()
        .map(|path| path.into_owned())
        .map_err(|_| WRITE_ERROR.to_string())
}

/// Prüft ein Schreibziel und gibt den Pfad mit normalisiertem Ordner zurück.
///
/// Erlaubt ist nur ein absoluter Pfad mit erlaubter Endung in einem vorhandenen
/// Ordner, den der Benutzer im Speichern-Dialog gewählt hat (`allowed_in_scope`).
/// Die Datei selbst darf noch fehlen; Ordner und Verknüpfungen werden abgelehnt.
fn check_write_target(
    path: &Path,
    allowed_in_scope: impl Fn(&Path) -> bool,
) -> Result<PathBuf, String> {
    let (Some(parent), Some(name)) = (path.parent(), path.file_name()) else {
        return Err(not_writable(path));
    };
    if !path.is_absolute() || !has_extension(path, &OUTPUT_EXTENSIONS) {
        return Err(not_writable(path));
    }
    let target = std::fs::canonicalize(parent)
        .map_err(|_| format!("Der Ordner {} wurde nicht gefunden.", parent.display()))?
        .join(name);
    let existing = std::fs::symlink_metadata(&target).ok();
    if existing.is_some_and(|m| !m.is_file()) {
        return Err(not_writable(path));
    }
    if !allowed_in_scope(path) && !allowed_in_scope(&target) {
        return Err(format!(
            "Die Datei {} wurde nicht in dieser Sitzung gewählt. Bitte erneut speichern.",
            path.display()
        ));
    }
    Ok(target)
}

/// Schreibt eine Ausgabedatei an das im Speichern-Dialog gewählte Ziel.
#[tauri::command]
pub fn write_output_file(app: tauri::AppHandle, request: Request<'_>) -> Result<(), String> {
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err(WRITE_ERROR.to_string());
    };
    let header = request
        .headers()
        .get(PATH_HEADER)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| WRITE_ERROR.to_string())?;
    let path = decode_path_header(header)?;
    let target = check_write_target(Path::new(&path), app_scope(&app))?;
    std::fs::write(target, bytes).map_err(|_| WRITE_ERROR.to_string())
}

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
        for name in ["a.xlsx", "b.pdf", "c.json", "d.rwm"] {
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

    fn write_target(file_name: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "wettkampftools-write-{}-{file_name}",
            std::process::id()
        ))
    }

    #[test]
    fn write_accepts_new_file_with_allowed_extension() {
        for name in ["a.xlsx", "b.pdf", "c.json", "d.rwm", "E.PDF"] {
            let path = write_target(name);
            let checked = check_write_target(&path, allow_all).expect("erlaubt");
            assert_eq!(checked.file_name(), path.file_name());
        }
    }

    #[test]
    fn write_rejects_other_extensions_and_relative_paths() {
        for path in [
            write_target("a.exe"),
            write_target("b.bat"),
            write_target("ohne_endung"),
            PathBuf::from("relativ.pdf"),
        ] {
            let err = check_write_target(&path, allow_all).unwrap_err();
            assert!(err.contains("darf nicht geschrieben werden"), "{err}");
        }
    }

    #[test]
    fn write_rejects_directory_and_missing_folder() {
        let dir = write_target("ordner.pdf");
        std::fs::create_dir_all(&dir).unwrap();
        let err = check_write_target(&dir, allow_all).unwrap_err();
        let _ = std::fs::remove_dir(&dir);
        assert!(err.contains("darf nicht geschrieben werden"), "{err}");
        let missing = std::env::temp_dir()
            .join("wettkampftools-ordner-fehlt")
            .join("a.pdf");
        let err = check_write_target(&missing, allow_all).unwrap_err();
        assert!(err.contains("nicht gefunden"), "{err}");
    }

    #[test]
    fn write_requires_scope_from_save_dialog() {
        let path = write_target("a.pdf");
        let err = check_write_target(&path, |_| false).unwrap_err();
        assert!(err.contains("erneut speichern"), "{err}");
        // Der Dialog gibt den Pfad so frei, wie er ihn liefert; normalisiert genügt auch.
        let raw = path.clone();
        assert!(check_write_target(&path, |p| p == raw).is_ok());
        let canonical = std::fs::canonicalize(std::env::temp_dir())
            .unwrap()
            .join(path.file_name().unwrap());
        assert!(check_write_target(&path, |p| p == canonical).is_ok());
    }

    #[test]
    fn path_header_is_url_decoded() {
        assert_eq!(
            decode_path_header("C%3A%5CUrkunden%5CM%C3%BCller.pdf").unwrap(),
            "C:\\Urkunden\\Müller.pdf"
        );
        assert!(decode_path_header("%FF").is_err());
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
