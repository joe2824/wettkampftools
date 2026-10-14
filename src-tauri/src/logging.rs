//! Protokoll des Rust-Teils: gleicher Ordner (AppData/logs) und gleiches Zeilenformat
//! wie das Frontend. Nur Codes und Fundstellen, keine Inhalte.

use std::io::Write;
use std::panic::Location;
use std::path::PathBuf;
use std::sync::OnceLock;

use chrono::NaiveDateTime;

static LOG_DIR: OnceLock<PathBuf> = OnceLock::new();

/// Eine Protokollzeile ohne Zeilenumbruch.
pub fn format_line(at: NaiveDateTime, level: &str, text: &str) -> String {
    format!(
        "{} rust {:<5} {}",
        at.format("%Y-%m-%d %H:%M:%S%.3f"),
        level,
        text
    )
}

/// Text zu einem Absturz: nur die Fundstelle, nie die Meldung.
pub fn panic_text(location: Option<&Location<'_>>) -> String {
    match location {
        Some(l) => format!("panic location={}:{}", l.file(), l.line()),
        None => "panic location=unknown".into(),
    }
}

/// Hängt eine Zeile an die heutige Datei an. Schluckt Fehler: Protokollieren darf
/// einen Absturz nicht verschlimmern.
fn log_line(level: &str, text: &str) {
    let Some(dir) = LOG_DIR.get() else { return };
    if std::fs::create_dir_all(dir).is_err() {
        return;
    }
    let now = chrono::Local::now().naive_local();
    let path = dir.join(format!("{}.log", now.format("%Y-%m-%d")));
    let line = format_line(now, level, text) + "\n";
    if let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
    {
        let _ = f.write_all(line.as_bytes());
    }
}

fn install_panic_hook() {
    let previous = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        log_line("ERROR", &panic_text(info.location()));
        previous(info);
    }));
}

/// Protokoll einrichten: Ordner merken, Absturz-Hook setzen, Startzeile schreiben.
pub fn init(app_data_dir: PathBuf) {
    if LOG_DIR.set(app_data_dir.join("logs")).is_err() {
        return;
    }
    install_panic_hook();
    log_line(
        "INFO",
        &format!("log_start version={}", env!("CARGO_PKG_VERSION")),
    );
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveDate;

    fn at() -> NaiveDateTime {
        NaiveDate::from_ymd_opt(2026, 10, 14)
            .and_then(|d| d.and_hms_milli_opt(9, 5, 7, 42))
            .expect("gültiges Datum")
    }

    #[test]
    fn formats_line_like_frontend() {
        assert_eq!(
            format_line(at(), "INFO", "log_start"),
            "2026-10-14 09:05:07.042 rust INFO  log_start"
        );
        assert_eq!(
            format_line(at(), "ERROR", "x"),
            "2026-10-14 09:05:07.042 rust ERROR x"
        );
    }

    #[test]
    fn panic_text_has_location_only() {
        let here = Location::caller();
        let text = panic_text(Some(here));
        assert!(text.starts_with("panic location="));
        assert!(text.ends_with(&format!(":{}", here.line())));
        assert_eq!(panic_text(None), "panic location=unknown");
    }
}
