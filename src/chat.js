const { invoke } = window.__TAURI__.core;

let currentServerUrl = "0.0.0.0:8000";
let currentToken = "";
let currentChannelId = null;
let currentChannelName = "Чат";

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
        
        if (settings.theme === 'Dark') {
            document.body.setAttribute('data-theme', 'dark');
        } else {
            document.body.removeAttribute('data-theme');
        }
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

async function loadChannelInfo() {
    if (!currentChannelId) return;
    
    try {
        const channels = await apiCall('/api/channels');
        if (channels && channels.success) {
            const channel = channels.channels.find(c => c.id === currentChannelId || c.name === currentChannelId);
            if (channel) {
                currentChannelName = channel.name;
                document.getElementById("chatTitle").textContent = channel.name;
            }
        }
    } catch (err) {
        console.error("Ошибка загрузки информации о канале:", err);
    }
}

async function loadMessages() {
    const list = document.getElementById("messagesList");
    try {
        const response = await apiCall(`/api/messages?channel=${currentChannelId}`);
        if (response && response.success) {
            displayMessages(response.messages);
        } else {
            list.innerHTML = `<div class="error-state">
                <span class="material-icons">error</span>
                <p>Не удалось загрузить сообщения</p>
            </div>`;
        }
    } catch (err) {
        console.error("Ошибка загрузки сообщений:", err);
        list.innerHTML = `<div class="error-state">
            <span class="material-icons">wifi_off</span>
            <p>Ошибка подключения</p>
        </div>`;
    }
}

function displayMessages(messages) {
    const list = document.getElementById("messagesList");
    
    if (messages.length === 0) {
        list.innerHTML = `<div class="empty-state">
            <span class="material-icons">chat</span>
            <p>Нет сообщений</p>
            <p class="input-hint">Начните общение первым!</p>
        </div>`;
        return;
    }
    
    list.innerHTML = messages.map(msg => `
        <div class="message ${msg.from === 'you' ? 'my' : 'other'}">
            <div class="message-header">
                <span class="message-sender">${escapeHtml(msg.from)}</span>
                <span class="message-time">${formatTime(msg.ts)}</span>
            </div>
            <div class="message-content">
                ${msg.encrypted ? '<span class="encrypted-badge">🔒</span>' : ''}
                <div class="message-text">${escapeHtml(msg.text)}</div>
                ${msg.file ? `
                    <div class="message-file">
                        <span class="material-icons">attach_file</span>
                        <a href="/api/download/${msg.file.filename}" download="${msg.file.originalName}">
                            ${msg.file.originalName}
                        </a>
                        <span class="file-size">(${formatFileSize(msg.file.size)})</span>
                    </div>
                ` : ''}
                ${msg.voice ? `
                    <div class="message-voice">
                        <span class="material-icons">mic</span>
                        <span>Голосовое сообщение</span>
                        <span class="voice-duration">${formatDuration(msg.voice.duration)}</span>
                        <audio controls>
                            <source src="/api/download/${msg.voice.filename}" type="audio/ogg">
                        </audio>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    list.scrollTop = list.scrollHeight;
}

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

    const sendButton = document.getElementById("sendButton");
    const originalHTML = sendButton.innerHTML;
    sendButton.innerHTML = '<div class="spinner small"></div>';
    sendButton.disabled = true;

    try {
        const response = await apiCall('/api/message', {
            method: "POST",
            body: JSON.stringify({ 
                channel: currentChannelId, 
                text: text 
            })
        });
        
        if (response && response.success) {
            input.value = "";
            await loadMessages();
        } else {
            showError("Ошибка отправки сообщения");
        }
    } catch (err) {
        console.error("Ошибка отправки:", err);
        showError("Ошибка подключения");
    } finally {
        sendButton.innerHTML = originalHTML;
        sendButton.disabled = false;
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-toast';
    errorDiv.innerHTML = `
        <span class="material-icons">error</span>
        <span>${message}</span>
    `;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

document.getElementById("sendButton").addEventListener("click", sendMessage);

document.getElementById("messageInput").addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

document.getElementById("backButton").addEventListener("click", () => {
    window.location.href = "chats.html";
});

document.addEventListener("DOMContentLoaded", async () => {
    if (!checkAuth()) return;
    
    await loadSettings();
    
    currentChannelId = getQueryParam("channel");
    if (!currentChannelId) {
        showError("Не выбран канал");
        setTimeout(() => {
            window.location.href = "chats.html";
        }, 2000);
        return;
    }
    
    await loadChannelInfo();
    await loadMessages();
    
    setInterval(loadMessages, 5000);
    
    document.getElementById("messageInput").focus();
});
