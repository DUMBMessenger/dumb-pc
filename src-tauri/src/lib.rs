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
            commands::update_setting,
            commands::show_notification,
            commands::get_channels,
            commands::create_channel
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
