// commands.rs
use crate::settings::{AppSettings, Theme};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::LazyLock;
use tauri_plugin_notification::NotificationExt;

static CLIENT: LazyLock<Client> = LazyLock::new(Client::new);

#[derive(Serialize)]
struct AuthData {
    username: String,
    password: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    two_factor_token: Option<String>,
}

#[derive(Deserialize)]
pub struct LoginResponse {
    pub success: bool,
    pub token: Option<String>,
    pub requires2fa: Option<bool>,
    pub session_id: Option<String>,
    pub message: Option<String>,
}

#[derive(Deserialize)]
pub struct RegisterResponse {
    pub success: bool,
    pub message: Option<String>,
}

#[derive(serde::Deserialize)]
#[serde(tag = "field", content = "value")]
pub enum SettingUpdate {
    ServerUrl(String),
    Theme(Theme),
}

fn normalize_server_url(server: &str) -> String {
    let server = server.trim_end_matches('/');
    if server.starts_with("http://") || server.starts_with("https://") {
        server.to_string()
    } else {
        format!("http://{}", server)
    }
}

#[derive(Serialize)]
pub struct LoginResponseWrapper {
    pub success: bool,
    pub token: Option<String>,
    pub requires2fa: Option<bool>,
    pub session_id: Option<String>,
    pub message: Option<String>,
}

#[derive(Serialize)]
pub struct RegisterResponseWrapper {
    pub success: bool,
    pub message: Option<String>,
}

#[tauri::command]
pub async fn register(server: String, username: String, password: String) -> RegisterResponseWrapper {
    let base = normalize_server_url(&server);
    let url = format!("{}/api/register", base);

    match CLIENT.post(&url).json(&AuthData { username, password, two_factor_token: None }).send().await {
        Ok(resp) => match resp.json::<RegisterResponse>().await {
            Ok(json) => RegisterResponseWrapper { success: json.success, message: json.message },
            Err(_) => RegisterResponseWrapper { success: false, message: Some("Не удалось разобрать ответ сервера".into()) },
        },
        Err(_) => RegisterResponseWrapper { success: false, message: Some("Не удалось подключиться к серверу".into()) },
    }
}

#[tauri::command]
pub async fn login(
    server: String,
    username: String,
    password: String,
    two_factor_token: Option<String>,
    session_id: Option<String>,
) -> LoginResponseWrapper {
    let base = normalize_server_url(&server);
    
    let url = if two_factor_token.is_some() && session_id.is_some() {
        format!("{}/api/2fa/verify-login", base)
    } else {
        format!("{}/api/login", base)
    };

    let payload = if two_factor_token.is_some() && session_id.is_some() {
        serde_json::json!({
            "username": username,
            "sessionId": session_id,
            "twoFactorToken": two_factor_token
        })
    } else {
        serde_json::json!({
            "username": username,
            "password": password,
            "twoFactorToken": two_factor_token
        })
    };

    match CLIENT.post(&url).json(&payload).send().await {
        Ok(resp) => match resp.json::<LoginResponse>().await {
            Ok(json) => LoginResponseWrapper {
                success: json.success,
                token: json.token,
                requires2fa: json.requires2fa,
                session_id: json.session_id,
                message: json.message
            },
            Err(_) => LoginResponseWrapper { 
                success: false, 
                token: None, 
                requires2fa: None,
                session_id: None,
                message: Some("Не удалось разобрать ответ сервера".into()) 
            },
        },
        Err(_) => LoginResponseWrapper { 
            success: false, 
            token: None, 
            requires2fa: None,
            session_id: None,
            message: Some("Не удалось подключиться к серверу".into()) 
        },
    }
}

#[tauri::command]
pub async fn check_dumb(server: String) -> bool {
    let base = normalize_server_url(&server);
    let url = format!("{}/api/ping", base);

    match CLIENT.get(&url).send().await {
        Ok(resp) => resp.status().is_success(),
        Err(_) => false,
    }
}

#[tauri::command]
pub fn get_settings(app_handle: tauri::AppHandle) -> Result<AppSettings, String> {
    AppSettings::load(&app_handle).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_setting(update: SettingUpdate, app_handle: tauri::AppHandle) -> Result<(), String> {
    let mut settings = AppSettings::load(&app_handle).map_err(|e| e.to_string())?;

    match update {
        SettingUpdate::ServerUrl(url) => settings.server_url = url,
        SettingUpdate::Theme(theme) => settings.theme = theme,
    }

    settings.save(&app_handle).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn show_notification(title: String, body: String, app_handle: tauri::AppHandle) {
    app_handle.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .unwrap_or(());
}
