use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppSettings {
    pub server_url: String,
    pub theme: Theme,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Theme {
    Light,
    Dark,
}

impl Default for Theme {
    fn default() -> Self {
        Theme::Light
    }
}

impl AppSettings {
    const SETTINGS_FILE: &'static str = "settings.json";

    pub fn load(app_handle: &tauri::AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let config_dir = app_handle.path().app_config_dir()
            .map_err(|_| "Не удалось получить папку настроек")?;
        let settings_path = config_dir.join(Self::SETTINGS_FILE);

        if settings_path.exists() {
            let contents = std::fs::read_to_string(settings_path)?;
            Ok(serde_json::from_str(&contents)?)
        } else {
            let default_settings = Self::default();
            default_settings.save(app_handle)?;
            Ok(default_settings)
        }
    }

    pub fn save(&self, app_handle: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
        let config_dir = app_handle.path().app_config_dir()
            .map_err(|_| "Не удалось получить папку настроек")?;
        let settings_path = config_dir.join(Self::SETTINGS_FILE);
        std::fs::create_dir_all(&config_dir)?;
        let contents = serde_json::to_string_pretty(self)?;
        std::fs::write(settings_path, contents)?;
        Ok(())
    }
}
