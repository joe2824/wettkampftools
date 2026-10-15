// Strafenkatalog neben ein gerade gespeichertes Regelwerk schreiben.
use crate::file_check::{canonical_existing, has_extension, user_path};
use crate::output::{not_writable, raw_request, write_scope, RULEBOOK_EXTENSION, WRITE_ERROR};
use std::path::{Path, PathBuf};
use tauri::ipc::Request;

/// Strafenkatalog neben dem Regelwerk: so findet JAuswertung ihn beim Anlegen eines Wettkampfs.
const PENALTY_CATALOG_SUFFIX: &str = "m.def";

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::file_check::test_support::{allow_all, TempFile};

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
        let missing = std::env::temp_dir().join("wettkampftools-katalog-fehlt.rwm");
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
}
