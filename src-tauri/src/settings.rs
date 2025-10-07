use serde::{Deserialize, Serialize};

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

    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        let config_dir = tauri::api::path::config_dir()
            .ok_or("Не удалось получить папку настроек")?;
        let settings_path = config_dir.join(Self::SETTINGS_FILE);

        if settings_path.exists() {
            let contents = std::fs::read_to_string(settings_path)?;
            Ok(serde_json::from_str(&contents)?)
        } else {
            let default_settings = Self::default();
            default_settings.save()?; // Сохраняем дефолтные настройки при первом запуске
            Ok(default_settings)
        }
    }

    pub fn save(&self) -> Result<(), Box<dyn std::error::Error>> {
        let config_dir = tauri::api::path::config_dir()
            .ok_or("Не удалось получить папку настроек")?;
        let settings_path = config_dir.join(Self::SETTINGS_FILE);
        std::fs::create_dir_all(&config_dir)?;
        let contents = serde_json::to_string_pretty(self)?;
        std::fs::write(settings_path, contents)?;
        Ok(())
    }
}
