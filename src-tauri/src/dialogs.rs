// Öffnen- und Speichern-Dialog: die Wahl gibt genau diese Datei frei, zum Lesen oder zum Schreiben.
use crate::{input, output};
use tauri_plugin_dialog::{DialogExt, FileDialogBuilder};

/// Dateityp im Dialog, z. B. „Excel“ mit `["xlsx"]`.
#[derive(Debug, serde::Deserialize)]
pub struct DialogFilter {
    name: String,
    extensions: Vec<String>,
}

fn dialog(
    window: &tauri::WebviewWindow,
    filters: &[DialogFilter],
) -> FileDialogBuilder<tauri::Wry> {
    filters.iter().fold(
        window.dialog().file().set_parent(window),
        |builder, filter| {
            let extensions: Vec<&str> = filter.extensions.iter().map(String::as_str).collect();
            builder.add_filter(&filter.name, &extensions)
        },
    )
}

/// Fragt nach einer Eingabedatei; sie ist danach nur lesbar. Bei Abbruch `None`.
#[tauri::command]
pub async fn pick_open_path(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    filters: Vec<DialogFilter>,
) -> Option<String> {
    let path = dialog(&window, &filters)
        .blocking_pick_file()?
        .into_path()
        .ok()?;
    input::allow_read_paths(&app, std::slice::from_ref(&path));
    Some(path.to_string_lossy().into_owned())
}

/// Fragt nach einem Speicherziel; es ist danach nur beschreibbar. Bei Abbruch `None`.
#[tauri::command]
pub async fn pick_save_path(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    default_name: String,
    filters: Vec<DialogFilter>,
) -> Option<String> {
    let path = dialog(&window, &filters)
        .set_file_name(default_name)
        .blocking_save_file()?
        .into_path()
        .ok()?;
    output::allow_write_path(&app, &path);
    Some(path.to_string_lossy().into_owned())
}
