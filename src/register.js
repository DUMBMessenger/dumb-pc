import {monitorServer} from "./utils.js";

const { invoke } = window.__TAURI__.core;

const registerForm = document.getElementById('registerForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const registerButton = document.getElementById('registerButton');
const serverStatus = document.getElementById('serverStatus');
const statusDot = document.getElementById('statusDot');
const serverAddress = document.getElementById('serverAddress');
const settingsButton = document.getElementById('settingsButton');
const settingsModal = document.getElementById('settingsModal');
const closeModal = document.getElementById('closeModal');
const serverUrlInput = document.getElementById('serverUrlInput');
const themeSelect = document.getElementById('themeSelect');
const saveSettings = document.getElementById('saveSettings');

let currentServerUrl = "0.0.0.0:8000";

async function loadSettings() {
  try {
    const settings = await invoke('get_settings');
    currentServerUrl = settings.server_url || "0.0.0.0:8000";
    serverAddress.textContent = `Сервер: ${currentServerUrl}`;
    serverUrlInput.value = currentServerUrl;
    themeSelect.value = settings.theme === 'Dark' ? 'dark' : 'light';
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

async function checkServerConnection(server) {
  const isSuccessfulConnection = await invoke('check_dumb', { server: server });
  if (isSuccessfulConnection === true) {
    serverStatus.textContent = 'Сервер подключен';
    statusDot.classList.remove('offline');
    return true;
  } else {
    serverStatus.textContent = 'Сервер недоступен';
    statusDot.classList.add('offline');
    return false;
  }
}

function validateForm() {
  let isValid = true;

  document.querySelectorAll('.error-message').forEach(el => {
    el.style.display = 'none';
  });
  document.querySelectorAll('.text-field').forEach(el => {
    el.classList.remove('error');
  });

  if (!usernameInput.value.trim()) {
    document.getElementById('usernameError').style.display = 'block';
    usernameInput.classList.add('error');
    isValid = false;
  }

  if (!passwordInput.value.trim()) {
    document.getElementById('passwordError').style.display = 'block';
    passwordInput.classList.add('error');
    isValid = false;
  }

  if (passwordInput.value !== confirmPasswordInput.value) {
    document.getElementById('confirmPasswordError').style.display = 'block';
    confirmPasswordInput.classList.add('error');
    isValid = false;
  }

  return isValid;
}

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

  registerButton.innerHTML = '<div class="spinner"></div><span>Регистрация...</span>';
  registerButton.classList.add('loading');
  registerButton.disabled = true;

  try {
    const result = await invoke('register', {
      server: currentServerUrl,
      username: usernameInput.value,
      password: passwordInput.value
    });

    if (result.success) {
      alert('Регистрация успешна! Теперь вы можете войти в систему.');
      window.location.href = "index.html";
    } else {
      alert(result.message || 'Ошибка регистрации');
    }
  } catch (error) {
    alert('Ошибка при регистрации: ' + error);
  }

  registerButton.innerHTML = '<span>Зарегистрироваться</span>';
  registerButton.classList.remove('loading');
  registerButton.disabled = false;
});

settingsButton.addEventListener('click', () => {
  settingsModal.style.display = 'flex';
});

closeModal.addEventListener('click', () => {
  settingsModal.style.display = 'none';
});

saveSettings.addEventListener('click', async () => {
  const newServerUrl = serverUrlInput.value.trim();
  const newTheme = themeSelect.value === 'dark' ? 'Dark' : 'Light';

  try {
    await invoke("update_setting", { update: { field: "ServerUrl", value: newServerUrl } })
    await invoke("update_setting", { update: { field: "Theme", value: newTheme } })
    
    currentServerUrl = newServerUrl;
    serverAddress.textContent = `Сервер: ${currentServerUrl}`;
    applyTheme(newTheme);
    
    await checkServerConnection(currentServerUrl);
    
    settingsModal.style.display = 'none';
    await loadSettings()
    alert('Настройки сохранены!');
  } catch (error) {
    alert('Ошибка сохранения настроек: ' + error);
  }
});

window.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    settingsModal.style.display = 'none';
  }
});

document.getElementById('loginLink').addEventListener('click', (e) => {
  e.preventDefault();
  window.location.href = "index.html";
});

document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  await monitorServer(checkServerConnection, currentServerUrl);
  usernameInput.focus();
});
