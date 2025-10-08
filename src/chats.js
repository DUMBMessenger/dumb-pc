const { invoke } = window.__TAURI__.core;

// Элементы
const settingsButton = document.getElementById('settingsButton');
const logoutButton = document.getElementById('logoutButton');
const chatsList = document.getElementById('chatsList');
const settingsModal = document.getElementById('settingsModal');
const closeModal = document.getElementById('closeModal');
const serverUrlInput = document.getElementById('serverUrlInput');
const themeSelect = document.getElementById('themeSelect');
const saveSettings = document.getElementById('saveSettings');

let currentServerUrl = "0.0.0.0:8000";

// Проверка авторизации
function checkAuth() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "index.html";
        return false;
    }
    return true;
}

// Загрузка настроек
async function loadSettings() {
    try {
        const settings = await invoke('get_settings');
        currentServerUrl = settings.server_url || "0.0.0.0:8000";
        
        if (serverUrlInput) {
            serverUrlInput.value = currentServerUrl;
        }
        if (themeSelect) {
            themeSelect.value = settings.theme === 'Dark' ? 'dark' : 'light';
        }
        
        applyTheme(settings.theme);
    } catch (error) {
        console.error('Ошибка загрузки настроек:', error);
    }
}

// Применение темы
function applyTheme(theme) {
    if (theme === 'Dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

// Загрузка чатов
async function loadChats() {
    if (!checkAuth()) return;

    const token = localStorage.getItem("token");

    try {
        const response = await invoke('get_channels', {
            server: currentServerUrl,
            token
        });

        if (!response.success || !response.channels || response.channels.length === 0) {
            chatsList.innerHTML = `
                <div class="empty-state">
                    <span class="material-icons">chat</span>
                    <p>У вас пока нет чатов</p>
                    <button class="login-button" id="startChatButton" style="margin-top: 16px;">
                        <span>Начать общение</span>
                    </button>
                </div>
            `;
            return;
        }

        chatsList.innerHTML = response.channels.map(chat => `
            <div class="chat-item" data-chat-id="${chat.id}">
                <div class="chat-avatar">
                    <span class="material-icons">person</span>
                </div>
                <div class="chat-content">
                    <div class="chat-header">
                        <span class="chat-name">${chat.name}</span>
                        <span class="chat-time">${new Date(chat.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div class="chat-preview">
                        <span class="last-message">Создано пользователем ${chat.creator}</span>
                    </div>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', () => {
                const chatId = item.getAttribute('data-chat-id');
                openChat(chatId);
            });
        });

    } catch (error) {
        console.error('Ошибка загрузки чатов:', error);
        displayError('Не удалось загрузить чаты');
    }
}

// Отображение ошибки
function displayError(message) {
    chatsList.innerHTML = `
        <div class="empty-state error">
            <span class="material-icons">error</span>
            <p>${message}</p>
            <button class="login-button" id="retryButton" style="margin-top: 16px;">
                <span>Повторить</span>
            </button>
        </div>
    `;
    
    document.getElementById('retryButton')?.addEventListener('click', loadChats);
}

// Открытие чата
function openChat(chatId) {
    // TODO: Реализовать переход в конкретный чат
    console.log('Открываем чат:', chatId);
    alert(`Открываем чат ${chatId}. Эта функция будет реализована позже.`);
}

// Выход из системы
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("server");
    window.location.href = "index.html";
}

// Сохранение настроек
async function saveSettingsHandler() {
    const newServerUrl = serverUrlInput.value.trim();
    const newTheme = themeSelect.value === 'dark' ? 'Dark' : 'Light';

    try {
        await invoke("update_setting", { update: { field: "ServerUrl", value: newServerUrl } })
        await invoke("update_setting", { update: { field: "Theme", value: newTheme } })
        
        currentServerUrl = newServerUrl;
        applyTheme(newTheme);
        
        settingsModal.style.display = 'none';
        
        // Показываем уведомление об успешном сохранении
        showNotification('Настройки сохранены успешно!');
        
    } catch (error) {
        showNotification('Ошибка сохранения настроек: ' + error, true);
    }
}

function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : 'success'}`;
    notification.innerHTML = `
        <span class="material-icons">${isError ? 'error' : 'check_circle'}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

settingsButton.addEventListener('click', () => {
    settingsModal.style.display = 'flex';
});

logoutButton.addEventListener('click', () => {
    if (confirm('Вы уверены, что хотите выйти?')) {
        logout();
    }
});

closeModal.addEventListener('click', () => {
    settingsModal.style.display = 'none';
});

saveSettings.addEventListener('click', saveSettingsHandler);

window.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.style.display = 'none';
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && settingsModal.style.display === 'flex') {
        settingsModal.style.display = 'none';
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    if (!checkAuth()) return;
    
    await loadSettings();
    await loadChats();
});
