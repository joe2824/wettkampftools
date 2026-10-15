// Projektdatei, mit der die Anwendung per Doppelklick gestartet wurde.
use crate::file_check::{has_extension, user_path};
use crate::input::{allow_read_paths, PROJECT_EXTENSION};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

/// Meldet der Oberfläche eine per Doppelklick geöffnete Projektdatei.
const PROJECT_FILE_OPENED: &str = "project-file-opened";

/// Zuletzt übergebene, noch nicht abgeholte Projektdatei.
#[derive(Default)]
pub struct PendingProjectFile(Mutex<Option<String>>);

impl PendingProjectFile {
    fn set(&self, path: String) {
        if let Ok(mut slot) = self.0.lock() {
            *slot = Some(path);
        }
    }

    fn take(&self) -> Option<String> {
        self.0.lock().ok().and_then(|mut slot| slot.take())
    }
}

/// Erstes Argument mit Projektendung; das erste ist das Programm selbst.
fn project_arg(args: &[String]) -> Option<&str> {
    args.iter()
        .skip(1)
        .map(String::as_str)
        .find(|arg| has_extension(Path::new(arg), &[PROJECT_EXTENSION]))
}

/// Relative Pfade gelten ab dem Ordner, aus dem gestartet wurde.
fn resolve(arg: &str, cwd: &Path) -> PathBuf {
    cwd.join(arg)
}

/// Normalisierter Pfad einer vorhandenen Projektdatei, unter Windows ohne Präfix `\\?\`:
/// er wird angezeigt und kommt beim Einlesen zurück, wo er erneut normalisiert wird.
fn checked_project_file(path: &Path) -> Option<PathBuf> {
    let canonical = dunce::canonicalize(path).ok()?;
    let is_project = canonical.is_file() && has_extension(&canonical, &[PROJECT_EXTENSION]);
    is_project.then_some(canonical)
}

/// Gibt die Datei zum Lesen frei, merkt sie vor und meldet sie der Oberfläche.
fn open_path(app: &AppHandle, path: &Path) {
    let Some(canonical) = checked_project_file(path) else {
        return;
    };
    allow_read_paths(app, std::slice::from_ref(&canonical));
    let text = user_path(&canonical);
    if let Some(pending) = app.try_state::<PendingProjectFile>() {
        pending.set(text.clone());
    }
    let _ = app.emit(PROJECT_FILE_OPENED, text);
}

/// Startargumente auswerten (erster Start oder zweiter Start über Single-Instance).
pub fn open_from_args(app: &AppHandle, args: &[String], cwd: &Path) {
    if let Some(arg) = project_arg(args) {
        open_path(app, &resolve(arg, cwd));
    }
}

/// Argumente dieses Prozesses beim Start.
pub fn open_from_startup(app: &AppHandle) {
    let args: Vec<String> = std::env::args_os()
        .map(|arg| arg.to_string_lossy().into_owned())
        .collect();
    let cwd = std::env::current_dir().unwrap_or_default();
    open_from_args(app, &args, &cwd);
}

/// macOS übergibt per Doppelklick geöffnete Dateien als Ereignis.
#[cfg(target_os = "macos")]
pub fn open_from_urls(app: &AppHandle, urls: &[tauri::Url]) {
    let path = urls.iter().find_map(|url| url.to_file_path().ok());
    if let Some(path) = path {
        open_path(app, &path);
    }
}

/// Holt die vorgemerkte Projektdatei genau einmal ab.
#[tauri::command]
pub fn take_pending_project_file(pending: tauri::State<'_, PendingProjectFile>) -> Option<String> {
    pending.take()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::file_check::test_support::TempFile;

    fn args(list: &[&str]) -> Vec<String> {
        list.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn project_arg_takes_first_project_file_after_program() {
        let list = args(&[
            "C:\\Programme\\Wettkampftools.exe",
            "--flag",
            "C:\\Wettkampf\\Mein Projekt.WWKPROJEKT",
            "C:\\Wettkampf\\Zweites.wwkprojekt",
        ]);
        assert_eq!(
            project_arg(&list),
            Some("C:\\Wettkampf\\Mein Projekt.WWKPROJEKT")
        );
    }

    #[test]
    fn project_arg_ignores_program_and_other_files() {
        assert_eq!(project_arg(&args(&["/app/start.wwkprojekt"])), None);
        assert_eq!(
            project_arg(&args(&["app", "a.csv", "b.wwkprojekt.exe"])),
            None
        );
        assert_eq!(project_arg(&[]), None);
    }

    #[test]
    fn resolve_keeps_absolute_and_joins_relative_paths() {
        let cwd = std::env::temp_dir();
        let absolute = cwd.join("a.wwkprojekt");
        assert_eq!(resolve(absolute.to_str().unwrap(), &cwd), absolute);
        assert_eq!(resolve("b.wwkprojekt", &cwd), cwd.join("b.wwkprojekt"));
    }

    #[test]
    fn checked_project_file_accepts_existing_project_file() {
        let file = TempFile::with_bytes("launch", "Wettkampf Übung.wwkprojekt", b"x");
        // Ohne Präfix \\?\ unter Windows: der Pfad geht an die Oberfläche.
        let simplified = dunce::canonicalize(&file.0).unwrap();
        assert_eq!(checked_project_file(&file.dotted()), Some(simplified));
    }

    #[test]
    fn checked_project_file_rejects_other_missing_and_directories() {
        let csv = TempFile::with_bytes("launch", "meldungen.csv", b"x");
        assert_eq!(checked_project_file(&csv.0), None);
        let missing = std::env::temp_dir().join("wettkampftools-launch-fehlt.wwkprojekt");
        assert_eq!(checked_project_file(&missing), None);
        let dir = std::env::temp_dir().join(format!(
            "wettkampftools-launch-ordner-{}.wwkprojekt",
            std::process::id()
        ));
        std::fs::create_dir_all(&dir).unwrap();
        let result = checked_project_file(&dir);
        let _ = std::fs::remove_dir(&dir);
        assert_eq!(result, None);
    }

    #[test]
    fn pending_file_is_taken_once_and_replaced_by_newer() {
        let pending = PendingProjectFile::default();
        assert_eq!(pending.take(), None);
        pending.set("a.wwkprojekt".into());
        pending.set("b.wwkprojekt".into());
        assert_eq!(pending.take(), Some("b.wwkprojekt".into()));
        assert_eq!(pending.take(), None);
    }
}
