// Freigaben für Dateien, die der Benutzer selbst gewählt hat, getrennt nach Lesen und Schreiben.
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// Normalisierter Pfad: Ordner aufgelöst, Dateiname unverändert; die Datei selbst darf fehlen.
pub fn normalized_target(path: &Path) -> Option<PathBuf> {
    let (parent, name) = (path.parent()?, path.file_name()?);
    std::fs::canonicalize(parent).ok().map(|dir| dir.join(name))
}

/// Gemerkte, normalisierte Pfade.
#[derive(Default)]
pub struct PathGrants(Mutex<HashSet<PathBuf>>);

impl PathGrants {
    /// Gibt einen Pfad frei; gemerkt wird die normalisierte Form.
    pub fn allow(&self, path: &Path) {
        let (Some(target), Ok(mut granted)) = (normalized_target(path), self.0.lock()) else {
            return;
        };
        granted.insert(target);
    }

    /// Erwartet einen normalisierten Pfad (`normalized_target` oder `canonicalize`).
    pub fn is_allowed(&self, normalized: &Path) -> bool {
        self.0
            .lock()
            .is_ok_and(|granted| granted.contains(normalized))
    }
}

/// Im Öffnen-Dialog gewählt, abgelegt oder per Doppelklick übergeben: nur lesen.
#[derive(Default)]
pub struct ReadGrants(pub PathGrants);

/// Im Speichern-Dialog gewählt: nur schreiben, öffnen und im Ordner zeigen.
#[derive(Default)]
pub struct WriteGrants(pub PathGrants);

#[cfg(test)]
mod tests {
    use super::*;
    use crate::file_check::test_support::TempFile;

    #[test]
    fn grant_matches_any_spelling_of_the_path() {
        let file = TempFile::with_bytes("grants", "a.xlsx", b"");
        let grants = PathGrants::default();
        grants.allow(&file.dotted());
        assert!(grants.is_allowed(&std::fs::canonicalize(&file.0).unwrap()));
    }

    #[test]
    fn grant_works_for_a_file_that_does_not_exist_yet() {
        let path = std::env::temp_dir().join("wettkampftools-grants-neu.xlsx");
        let grants = PathGrants::default();
        grants.allow(&path);
        assert!(grants.is_allowed(&normalized_target(&path).unwrap()));
    }

    #[test]
    fn other_files_stay_locked() {
        let granted = TempFile::with_bytes("grants", "b.xlsx", b"");
        let other = TempFile::with_bytes("grants", "c.xlsx", b"");
        let grants = PathGrants::default();
        grants.allow(&granted.0);
        assert!(!grants.is_allowed(&std::fs::canonicalize(&other.0).unwrap()));
    }
}
