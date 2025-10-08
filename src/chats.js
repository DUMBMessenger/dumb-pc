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
        // TODO: Реализовать вызов Tauri команды для получения чатов
        
        // Временно отображаем заглушку
        displayMockChats();
        
    } catch (error) {
        console.error('Ошибка загрузки чатов:', error);
        displayError('Не удалось загрузить чаты');
    }
}

// Отображение mock-чатов (временное решение)
function displayMockChats() {
    const mockChats = [
        { id: 1, name: "Общий чат", lastMessage: "Добро пожаловать!", unread: 0, time: "12:30" },
        { id: 2, name: "Алексей", lastMessage: "Привет! Как дела?", unread: 2, time: "12:25" },
        { id: 3, name: "Мария", lastMessage: "Жду тебя на встрече", unread: 0, time: "11:45" },
        { id: 4, name: "Рабочая группа", lastMessage: "Новый проект запущен", unread: 5, time: "10:15" }
    ];

    if (mockChats.length === 0) {
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

    chatsList.innerHTML = mockChats.map(chat => `
        <div class="chat-item" data-chat-id="${chat.id}">
            <div class="chat-avatar">
                <span class="material-icons">person</span>
            </div>
            <div class="chat-content">
                <div class="chat-header">
                    <span class="chat-name">${chat.name}</span>
                    <span class="chat-time">${chat.time}</span>
                </div>
                <div class="chat-preview">
                    <span class="last-message">${chat.lastMessage}</span>
                    ${chat.unread > 0 ? `<span class="unread-badge">${chat.unread}</span>` : ''}
                </div>
            </div>
        </div>
    `).join('');

    // Добавляем обработчики клика по чатам
    document.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', () => {
            const chatId = item.getAttribute('data-chat-id');
            openChat(chatId);
        });
    });
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
        await invoke('set_server_url', { newUrl: newServerUrl });
        await invoke('set_theme', { newTheme: newTheme });
        
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
