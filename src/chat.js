const { invoke } = window.__TAURI__.core;

let currentServerUrl = "0.0.0.0:8000";
let currentToken = "";
let currentChannelId = null;

function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

function checkAuth() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "index.html";
        return false;
    }
    currentToken = token;
    return true;
}

async function loadSettings() {
    try {
        const settings = await invoke('get_settings');
        currentServerUrl = settings.server_url || "0.0.0.0:8000";
    } catch (err) {
        console.error("Ошибка загрузки настроек:", err);
    }
}

async function apiCall(endpoint, options = {}) {
    try {
        const response = await invoke(options.method === 'POST' ? 'api_post' : 'api_get', {
            server: currentServerUrl,
            token: currentToken,
            endpoint,
            data: options.body ? JSON.parse(options.body) : {}
        });
        return response;
    } catch (err) {
        console.error("API ошибка:", err);
        return null;
    }
}

async function loadMessages() {
    const list = document.getElementById("messagesList");
    try {
        const response = await apiCall(`/api/messages?channel=${currentChannelId}`);
        if (response && response.success) {
            displayMessages(response.messages);
        } else {
            list.innerHTML = `<p class="error">Не удалось загрузить сообщения</p>`;
        }
    } catch (err) {
        console.error("Ошибка загрузки сообщений:", err);
        list.innerHTML = `<p class="error">Ошибка загрузки</p>`;
    }
}

function displayMessages(messages) {
    const list = document.getElementById("messagesList");
    list.innerHTML = messages.map(msg => `
        <div class="message ${msg.sender === 'you' ? 'my' : 'other'}">
            <div class="message-sender">${msg.sender}</div>
            <div class="message-text">${escapeHtml(msg.text)}</div>
        </div>
    `).join('');
    list.scrollTop = list.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function sendMessage() {
    const input = document.getElementById("messageInput");
    const text = input.value.trim();
    if (!text) return;

    try {
        const response = await apiCall(`/api/message`, {
            method: "POST",
            body: JSON.stringify({ text })
        });
        if (response && response.success) {
            input.value = "";
            await loadMessages();
        } else {
            alert("Ошибка отправки");
        }
    } catch (err) {
        console.error("Ошибка отправки:", err);
    }
}

document.getElementById("sendButton").addEventListener("click", sendMessage);
document.getElementById("messageInput").addEventListener("keydown", e => {
    if (e.key === "Enter") sendMessage();
});
document.getElementById("backButton").addEventListener("click", () => {
    window.location.href = "chats.html";
});

document.addEventListener("DOMContentLoaded", async () => {
    if (!checkAuth()) return;
    await loadSettings();
    currentChannelId = getQueryParam("channel");
    if (!currentChannelId) {
        alert("Не выбран канал");
        window.location.href = "chats.html";
        return;
    }
    await loadMessages();
    setInterval(loadMessages, 5000); // обновление каждые 5 сек
});
