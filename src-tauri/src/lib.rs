mod file_check;
mod input;
mod legacy_settings;
mod logging;
mod output;
mod workbook;

/// Holt das Hauptfenster nach vorn (zweiter Programmstart).
#[cfg(desktop)]
fn focus_main(app: &tauri::AppHandle) {
    use tauri::Manager;

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Single-Instance muss als erstes Plugin registriert werden.
    #[cfg(desktop)]
    {
        builder = builder
            .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
                focus_main(app);
            }))
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_process::init());
    }

    builder
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            // Befehle werden von den Modulen ergänzt.
            legacy_settings::read_legacy_settings,
            workbook::read_workbook,
            workbook::write_workbook,
            output::write_output_file,
            output::open_output_file,
            output::reveal_output_file,
            input::read_input_file,
            input::input_file_info,
        ])
        .on_window_event(|window, event| {
            use tauri::{DragDropEvent, Manager, WindowEvent};
            if let WindowEvent::DragDrop(DragDropEvent::Drop { paths, .. }) = event {
                input::allow_dropped_paths(window.app_handle(), paths);
            }
        })
        .setup(|app| {
            use tauri::Manager;
            if let Ok(dir) = app.path().app_data_dir() {
                logging::init(dir);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Fehler beim Starten von Wettkampftools");
}
