// src/lib.rs
mod commands;
mod settings;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            commands::check_dumb,
            commands::login,
            commands::register,
            commands::get_settings,
            commands::set_server_url,
            commands::set_theme,
            commands::show_notification,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
