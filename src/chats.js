const { invoke } = window.__TAURI__.core;

const settingsButton = document.getElementById('settingsButton');
const logoutButton = document.getElementById('logoutButton');
const chatsList = document.getElementById('chatsList');
const settingsModal = document.getElementById('settingsModal');
const closeModal = document.getElementById('closeModal');
const serverUrlInput = document.getElementById('serverUrlInput');
const themeSelect = document.getElementById('themeSelect');
const saveSettings = document.getElementById('saveSettings');

let currentServerUrl = "0.0.0.0:8000";
let currentToken = "";

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

function applyTheme(theme) {
    if (theme === 'Dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

async function apiCall(endpoint, options = {}) {
    const server = currentServerUrl;
    const token = currentToken;
    
    try {
        if (options.method === 'GET' || !options.method) {
            const response = await invoke('api_get', {
                server,
                token,
                endpoint
            });
            return response;
        }
        
        if (options.method === 'POST') {
            const response = await invoke('api_post', {
                server,
                token,
                endpoint,
                data: options.body ? JSON.parse(options.body) : {}
            });
            return response;
        }
        
    } catch (error) {
        console.error(`API ошибка (${endpoint}):`, error);
        throw error;
    }
}

async function loadChats() {
    if (!checkAuth()) return;

    try {
        const response = await apiCall('/api/channels');
        
        if (response && response.success) {
            displayChats(response.channels);
        } else {
            throw new Error(response?.error || 'Неизвестная ошибка');
        }
        
    } catch (error) {
        console.error('Ошибка загрузки чатов:', error);
        displayError('Не удалось загрузить чаты');
    }
}

function displayChats(channels) {
    if (!channels || channels.length === 0) {
        chatsList.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">chat</span>
                <p>У вас пока нет чатов</p>
                <button class="login-button" id="startChatButton" style="margin-top: 16px;">
                    <span>Начать общение</span>
                </button>
            </div>
        `;
        
        document.getElementById('startChatButton')?.addEventListener('click', showCreateChannelModal);
        return;
    }

    chatsList.innerHTML = channels.map(channel => `
        <div class="chat-item" data-channel-id="${channel.id}">
            <div class="chat-avatar">
                <span class="material-icons">group</span>
            </div>
            <div class="chat-content">
                <div class="chat-header">
                    <span class="chat-name">${escapeHtml(channel.name)}</span>
                    <span class="chat-time">${formatTime(channel.lastActivity)}</span>
                </div>
                <div class="chat-preview">
                    <span class="last-message">${getChannelPreview(channel)}</span>
                    ${channel.unreadCount > 0 ? `<span class="unread-badge">${channel.unreadCount}</span>` : ''}
                </div>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', () => {
            const channelId = item.getAttribute('data-channel-id');
            openChat(channelId);
        });
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 24 * 60 * 60 * 1000) {
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 7 * 24 * 60 * 60 * 1000) {
        return date.toLocaleDateString('ru-RU', { weekday: 'short' });
    } else {
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }
}

function getChannelPreview(channel) {
    if (channel.lastMessage) {
        return escapeHtml(channel.lastMessage.text || '📎 Вложение');
    }
    return 'Нет сообщений';
}

function showCreateChannelModal() {
    const modalHtml = `
        <div id="createChannelModal" class="modal" style="display: flex;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Создать новый чат</h3>
                    <span class="close-modal" id="closeCreateModal">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="input-group">
                        <label for="channelName">Название чата</label>
                        <input type="text" id="channelName" placeholder="Введите название чата" maxlength="50">
                    </div>
                    <div class="input-group">
                        <label for="channelCustomId">ID чата (опционально)</label>
                        <input type="text" id="channelCustomId" placeholder="Уникальный идентификатор" maxlength="20">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="secondary-button" id="cancelCreate">Отмена</button>
                    <button class="login-button" id="createChannelBtn">Создать</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = document.getElementById('createChannelModal');
    const closeBtn = document.getElementById('closeCreateModal');
    const cancelBtn = document.getElementById('cancelCreate');
    const createBtn = document.getElementById('createChannelBtn');
    const channelNameInput = document.getElementById('channelName');
    
    function closeModal() {
        modal.remove();
    }
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    createBtn.addEventListener('click', async () => {
        const name = channelNameInput.value.trim();
        const customId = document.getElementById('channelCustomId').value.trim() || undefined;
        
        if (!name) {
            showNotification('Введите название чата', true);
            return;
        }
        
        if (name.length < 2) {
            showNotification('Название должно быть не менее 2 символов', true);
            return;
        }
        
        try {
            const response = await apiCall('/api/channels/create', {
                method: 'POST',
                body: JSON.stringify({ name, customId })
            });
            
            if (response && response.success) {
                showNotification('Чат успешно создан!');
                closeModal();
                await loadChats(); // Перезагружаем список чатов
            } else {
                throw new Error(response?.error || 'Ошибка создания чата');
            }
        } catch (error) {
            console.error('Ошибка создания чата:', error);
            showNotification(`Ошибка создания чата: ${error.message}`, true);
        }
    });

    document.addEventListener('keydown', function closeOnEscape(e) {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', closeOnEscape);
        }
    });
}

async function searchChannels(query) {
    if (!query.trim()) {
        await loadChats();
        return;
    }
    
    try {
        const response = await apiCall('/api/channels/search', {
            method: 'POST',
            body: JSON.stringify({ query: query.trim() })
        });
        
        if (response && response.success) {
            displayChats(response.channels);
        }
    } catch (error) {
        console.error('Ошибка поиска чатов:', error);
    }
}

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

function openChat(channelId) {
    localStorage.setItem('currentChannel', channelId);
    
    window.location.href = `chat.html?channel=${encodeURIComponent(channelId)}`;
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("server");
    localStorage.removeItem("currentChannel");
    window.location.href = "index.html";
}

async function saveSettingsHandler() {
    const newServerUrl = serverUrlInput.value.trim();
    const newTheme = themeSelect.value === 'dark' ? 'Dark' : 'Light';

    try {
        await invoke('set_server_url', { newUrl: newServerUrl });
        await invoke('set_theme', { newTheme: newTheme });
        
        currentServerUrl = newServerUrl;
        applyTheme(newTheme);
        
        settingsModal.style.display = 'none';
        
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

function initSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchChannels(e.target.value);
            }, 300);
        });
    }
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
    initSearch();
});
