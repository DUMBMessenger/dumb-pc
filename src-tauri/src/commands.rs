use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct AuthData {
    username: String,
    password: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    twoFactorToken: Option<String>,
}

#[derive(Deserialize)]
pub struct LoginResponse {
    pub success: bool,
    pub token: Option<String>,
    pub twoFactorEnabled: bool,
}

#[derive(Deserialize)]
pub struct RegisterResponse {
    pub success: bool,
}

/// нормализует ссылку
fn normalize_server_url(server: &str) -> String {
    let server = server.trim_end_matches('/'); // убираем лишний слеш
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
    pub twoFactorEnabled: bool,
    pub message: Option<String>, // сюда кладём ошибку
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
    let client = Client::new();
    let data = AuthData { username, password, twoFactorToken: None };

    match client.post(&url).json(&data).send().await {
        Ok(resp) => match resp.json::<RegisterResponse>().await {
            Ok(json) => RegisterResponseWrapper { success: json.success, message: None },
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
    two_factor: Option<String>,
) -> LoginResponseWrapper {
    let base = normalize_server_url(&server);
    let url = format!("{}/api/login", base);
    let client = Client::new();
    let data = AuthData { username, password, twoFactorToken: two_factor };

    match client.post(&url).json(&data).send().await {
        Ok(resp) => match resp.json::<LoginResponse>().await {
            Ok(json) => LoginResponseWrapper {
                success: json.success,
                token: json.token,
                twoFactorEnabled: json.twoFactorEnabled,
                message: None
            },
            Err(_) => LoginResponseWrapper { success: false, token: None, twoFactorEnabled: false, message: Some("Не удалось разобрать ответ сервера".into()) },
        },
        Err(_) => LoginResponseWrapper { success: false, token: None, twoFactorEnabled: false, message: Some("Не удалось подключиться к серверу".into()) },
    }
}

#[tauri::command]
pub async fn check_dumb(server: String) -> bool {
    let base = normalize_server_url(&server);
    let url = format!("{}/api/ping", base);
    let client = Client::new();

    match client.get(&url).send().await {
        Ok(resp) => resp.status().is_success(),
        Err(_) => false,
    }
}
