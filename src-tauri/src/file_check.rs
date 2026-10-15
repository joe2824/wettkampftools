// Gemeinsame Prüfungen für Ein- und Ausgabedateien.
use std::path::{Path, PathBuf};

/// Normalisierter Pfad einer vorhandenen Datei oder ein Fehlertext.
pub fn canonical_existing(path: &Path) -> Result<PathBuf, String> {
    std::fs::canonicalize(path).map_err(|_| not_found(path))
}

/// Pfad für Meldungen und die Oberfläche: unter Windows ohne das Präfix `\\?\`.
pub fn user_path(path: &Path) -> String {
    dunce::simplified(path).display().to_string()
}

/// Fehlertext für eine nicht gefundene Datei.
pub fn not_found(path: &Path) -> String {
    format!("Die Datei {} wurde nicht gefunden.", user_path(path))
}

/// Endung aus der Liste, ohne Rücksicht auf Groß- und Kleinschreibung.
pub fn has_extension(path: &Path, extensions: &[&str]) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .is_some_and(|e| extensions.iter().any(|x| e.eq_ignore_ascii_case(x)))
}

#[cfg(test)]
pub mod test_support {
    use std::path::{Path, PathBuf};
    use std::sync::atomic::{AtomicUsize, Ordering};

    /// Legt eine Datei im Temp-Ordner an und räumt sie beim Drop weg.
    pub struct TempFile(pub PathBuf);

    impl TempFile {
        pub fn with_bytes(prefix: &str, file_name: &str, bytes: &[u8]) -> Self {
            static COUNTER: AtomicUsize = AtomicUsize::new(0);
            let unique = format!(
                "wettkampftools-{prefix}-{}-{}-{file_name}",
                std::process::id(),
                COUNTER.fetch_add(1, Ordering::Relaxed)
            );
            let path = std::env::temp_dir().join(unique);
            std::fs::write(&path, bytes).expect("Testdatei anlegen");
            Self(path)
        }

        /// Derselbe Pfad mit `.` dazwischen, also nicht normalisiert.
        pub fn dotted(&self) -> PathBuf {
            self.0
                .parent()
                .unwrap()
                .join(".")
                .join(self.0.file_name().unwrap())
        }
    }

    /// Scope, der alles erlaubt.
    pub fn allow_all(_: &Path) -> bool {
        true
    }

    impl Drop for TempFile {
        fn drop(&mut self) {
            let _ = std::fs::remove_file(&self.0);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::test_support::TempFile;
    use super::*;

    #[test]
    fn extension_check_ignores_case() {
        let list = ["pdf", "json"];
        assert!(has_extension(Path::new("a.PDF"), &list));
        assert!(has_extension(Path::new("b.json"), &list));
        assert!(!has_extension(Path::new("c.pdf.exe"), &list));
        assert!(!has_extension(Path::new("ohne_endung"), &list));
    }

    #[test]
    fn user_path_keeps_normal_paths() {
        let path = std::env::temp_dir().join("Mein Ordner").join("Übung.csv");
        assert_eq!(user_path(&path), path.display().to_string());
    }

    #[cfg(windows)]
    #[test]
    fn user_path_drops_verbatim_prefix() {
        let path = Path::new(r"\\?\C:\Wettkampf\Übung Süd.wwkprojekt");
        assert_eq!(user_path(path), r"C:\Wettkampf\Übung Süd.wwkprojekt");
    }

    #[test]
    fn canonical_existing_normalizes_and_reports_missing() {
        let file = TempFile::with_bytes("check", "a.pdf", b"");
        let canonical = std::fs::canonicalize(&file.0).unwrap();
        assert_eq!(canonical_existing(&file.dotted()).unwrap(), canonical);
        let missing = std::env::temp_dir().join("wettkampftools-check-fehlt.pdf");
        assert!(canonical_existing(&missing)
            .unwrap_err()
            .contains("nicht gefunden"));
    }
}
