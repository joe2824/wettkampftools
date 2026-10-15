// Ausgabedateien schreiben, öffnen oder im Ordner zeigen.
use crate::file_check::{canonical_existing, has_extension, user_path};
use crate::grants::{normalized_target, WriteGrants};
use percent_encoding::percent_decode_str;
use std::path::{Path, PathBuf};
use tauri::ipc::{InvokeBody, Request};

/// Nur diese Endungen schreibt die Anwendung selbst.
const OUTPUT_EXTENSIONS: [&str; 8] = [
    "xlsx",
    "pdf",
    "json",
    RULEBOOK_EXTENSION,
    "wwkprojekt",
    "png",
    "def",
    "wk",
];

const RULEBOOK_EXTENSION: &str = "rwm";

/// Strafenkatalog neben dem Regelwerk: so findet JAuswertung ihn beim Anlegen eines Wettkampfs.
const PENALTY_CATALOG_SUFFIX: &str = "m.def";

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
    let (Some(parent), Some(_)) = (path.parent(), path.file_name()) else {
        return Err(not_writable(path));
    };
    if !path.is_absolute() || !has_extension(path, &OUTPUT_EXTENSIONS) {
        return Err(not_writable(path));
    }
    let target = normalized_target(path)
        .ok_or_else(|| format!("Der Ordner {} wurde nicht gefunden.", parent.display()))?;
    let existing = std::fs::symlink_metadata(&target).ok();
    if existing.is_some_and(|m| !m.is_file()) {
        return Err(not_writable(path));
    }
    if !allowed_in_scope(&target) {
        return Err(format!(
            "Die Datei {} wurde nicht in dieser Sitzung gewählt. Bitte erneut speichern.",
            path.display()
        ));
    }
    Ok(target)
}

/// Prüfung gegen die Schreibfreigaben aus dem Speichern-Dialog.
fn write_scope(app: &tauri::AppHandle) -> impl Fn(&Path) -> bool + '_ {
    use tauri::Manager;
    let grants = app.try_state::<WriteGrants>();
    move |p| grants.as_ref().is_some_and(|g| g.0.is_allowed(p))
}

/// Gibt ein im Speichern-Dialog gewähltes Ziel zum Schreiben frei.
pub fn allow_write_path(app: &tauri::AppHandle, path: &Path) {
    use tauri::Manager;
    if let Some(grants) = app.try_state::<WriteGrants>() {
        grants.0.allow(path);
    }
}

/// Zielpfad aus der Kopfzeile und rohe Bytes aus dem Body.
fn raw_request<'a>(request: &'a Request<'_>) -> Result<(String, &'a [u8]), String> {
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err(WRITE_ERROR.to_string());
    };
    let header = request
        .headers()
        .get(PATH_HEADER)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| WRITE_ERROR.to_string())?;
    Ok((decode_path_header(header)?, bytes))
}

/// Schreibt eine Ausgabedatei an das im Speichern-Dialog gewählte Ziel.
#[tauri::command]
pub fn write_output_file(app: tauri::AppHandle, request: Request<'_>) -> Result<(), String> {
    let (path, bytes) = raw_request(&request)?;
    let target = check_write_target(Path::new(&path), write_scope(&app))?;
    std::fs::write(target, bytes).map_err(|_| WRITE_ERROR.to_string())
}

/// Ziel des Strafenkatalogs neben einem gerade gespeicherten Regelwerk.
///
/// Erlaubt nur, wenn das Regelwerk (.rwm) existiert und im Speichern-Dialog
/// gewählt wurde (`allowed_in_scope`). Ziel ist derselbe Ordner, Name
/// `<Name des Regelwerks>m.def`; Ordner und Verknüpfungen werden abgelehnt.
fn check_penalty_catalog_target(
    rulebook: &Path,
    allowed_in_scope: impl Fn(&Path) -> bool,
) -> Result<PathBuf, String> {
    if !rulebook.is_absolute() || !has_extension(rulebook, &[RULEBOOK_EXTENSION]) {
        return Err(not_writable(rulebook));
    }
    let canonical = canonical_existing(rulebook)?;
    if !canonical.is_file() {
        return Err(not_writable(rulebook));
    }
    if !allowed_in_scope(&canonical) {
        return Err(format!(
            "Das Regelwerk {} wurde nicht in dieser Sitzung gespeichert. Bitte erneut speichern.",
            user_path(rulebook)
        ));
    }
    let (Some(parent), Some(stem)) = (canonical.parent(), rulebook.file_stem()) else {
        return Err(not_writable(rulebook));
    };
    let mut name = stem.to_os_string();
    name.push(PENALTY_CATALOG_SUFFIX);
    let target = parent.join(name);
    if std::fs::symlink_metadata(&target).is_ok_and(|m| !m.is_file()) {
        return Err(not_writable(&target));
    }
    Ok(target)
}

/// Schreibt den Strafenkatalog neben das gerade gespeicherte Regelwerk; gibt seinen Pfad zurück.
#[tauri::command]
pub fn write_penalty_catalog(
    app: tauri::AppHandle,
    request: Request<'_>,
) -> Result<String, String> {
    let (path, bytes) = raw_request(&request)?;
    let target = check_penalty_catalog_target(Path::new(&path), write_scope(&app))?;
    std::fs::write(&target, bytes).map_err(|_| WRITE_ERROR.to_string())?;
    Ok(user_path(&target))
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
            user_path(&canonical)
        ));
    }
    if !allowed_in_scope(&canonical) {
        return Err(format!(
            "Die Datei {} wurde nicht in dieser Sitzung gespeichert. Bitte erneut speichern.",
            user_path(&canonical)
        ));
    }
    Ok(canonical)
}

/// Prüfung mit den Schreibfreigaben: die setzt der Speichern-Dialog.
///
/// Geöffnet wird danach der Pfad aus dem Dialog, nicht der normalisierte:
/// unter Windows trägt der normalisierte das Präfix `\\?\`, mit dem
/// manche Programme nicht zurechtkommen.
fn check_write_granted(app: &tauri::AppHandle, path: &str) -> Result<(), String> {
    check_output_target(Path::new(path), write_scope(app)).map(|_| ())
}

/// Öffnet eine gespeicherte Ausgabedatei mit dem Standardprogramm.
#[tauri::command]
pub fn open_output_file(app: tauri::AppHandle, path: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    check_write_granted(&app, &path)?;
    app.opener()
        .open_path(path, None::<&str>)
        .map_err(|e| format!("Die Datei konnte nicht geöffnet werden: {e}"))
}

/// Zeigt eine gespeicherte Ausgabedatei in ihrem Ordner.
#[tauri::command]
pub fn reveal_output_file(app: tauri::AppHandle, path: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    check_write_granted(&app, &path)?;
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
        for name in [
            "a.xlsx",
            "b.pdf",
            "c.json",
            "d.rwm",
            "e.wwkprojekt",
            "f.def",
            "g.wk",
        ] {
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
        for name in [
            "a.xlsx",
            "b.pdf",
            "c.json",
            "d.rwm",
            "E.PDF",
            "f.wwkprojekt",
            "g.png",
            "h.def",
            "i.wk",
        ] {
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
    fn write_requires_grant_from_save_dialog() {
        let path = write_target("a.pdf");
        let err = check_write_target(&path, |_| false).unwrap_err();
        assert!(err.contains("erneut speichern"), "{err}");
        // Der Dialog liefert den Pfad, wie ihn der Benutzer sieht; geprüft wird die normalisierte Form.
        let grants = WriteGrants::default();
        grants.0.allow(&path);
        assert!(check_write_target(&path, |p| grants.0.is_allowed(p)).is_ok());
    }

    #[test]
    fn read_grant_never_allows_writing() {
        let file = temp_file("Ergebnisse.xlsx");
        let read = crate::grants::ReadGrants::default();
        read.0.allow(&file.0);
        let writes = WriteGrants::default();
        let err = check_write_target(&file.0, |p| writes.0.is_allowed(p)).unwrap_err();
        assert!(err.contains("erneut speichern"), "{err}");
        assert!(check_output_target(&file.0, |p| writes.0.is_allowed(p)).is_err());
    }

    #[test]
    fn penalty_catalog_goes_next_to_rulebook() {
        let rulebook = TempFile::with_bytes("output", "Regelwerk_2026.rwm", b"PK");
        let target = check_penalty_catalog_target(&rulebook.0, allow_all).expect("erlaubt");
        let name = target.file_name().unwrap().to_string_lossy().into_owned();
        assert!(name.ends_with("Regelwerk_2026m.def"), "{name}");
        assert_eq!(
            target.parent().unwrap(),
            std::fs::canonicalize(rulebook.0.parent().unwrap()).unwrap()
        );
    }

    #[test]
    fn penalty_catalog_needs_saved_rulebook_in_scope() {
        let rulebook = TempFile::with_bytes("output", "Regelwerk.rwm", b"PK");
        let err = check_penalty_catalog_target(&rulebook.0, |_| false).unwrap_err();
        assert!(err.contains("erneut speichern"), "{err}");
        let other = TempFile::with_bytes("output", "Auswertung.pdf", b"x");
        let err = check_penalty_catalog_target(&other.0, allow_all).unwrap_err();
        assert!(err.contains("darf nicht geschrieben werden"), "{err}");
        let missing = write_target("fehlt.rwm");
        assert!(check_penalty_catalog_target(&missing, allow_all).is_err());
    }

    #[test]
    fn penalty_catalog_does_not_replace_folder() {
        let rulebook = TempFile::with_bytes("output", "Ordner.rwm", b"PK");
        let stem = rulebook
            .0
            .file_stem()
            .unwrap()
            .to_string_lossy()
            .into_owned();
        let dir = rulebook.0.with_file_name(format!("{stem}m.def"));
        std::fs::create_dir_all(&dir).unwrap();
        let err = check_penalty_catalog_target(&rulebook.0, allow_all).unwrap_err();
        let _ = std::fs::remove_dir(&dir);
        assert!(err.contains("darf nicht geschrieben werden"), "{err}");
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
