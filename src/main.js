const { invoke } = window.__TAURI__.core;

const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const twoFactorInput = document.getElementById('twoFactor');
const twoFactorGroup = document.getElementById('twoFactorGroup');
const loginButton = document.getElementById('loginButton');
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
let requiresTwoFactor = false;

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

async function handleLogin() {
  try {
    const loginData = {
      server: currentServerUrl,
      username: usernameInput.value,
      password: passwordInput.value
    };

    if (requiresTwoFactor && twoFactorInput.value.trim()) {
      loginData.two_factor = twoFactorInput.value;
    }

    const response = await invoke('login', loginData);

    if (response.success) {
      const token = response.token;
      localStorage.setItem("token", token);
      localStorage.setItem("server", currentServerUrl);
      return { success: true };
    } else {
      if (response.two_factor_enabled && !requiresTwoFactor) {
        requiresTwoFactor = true;
        twoFactorGroup.style.display = 'block';
        return { success: false, requiresTwoFactor: true };
      }
      return { success: false, message: response.message || 'Ошибка входа' };
    }

  } catch (err) {
    console.error('Ошибка при вызове команды Tauri:', err);
    return { success: false, message: 'Ошибка подключения' };
  }
}

async function handleRegister(username, password) {
  try {
    const response = await invoke('register', {
      server: currentServerUrl,
      username: username,
      password: password,
    });

    if (response.success) {
      return { success: true };
    } else {
      return { success: false, message: response.message || 'Ошибка регистрации' };
    }

  } catch (err) {
    console.error('Ошибка при вызове команды Tauri:', err);
    return { success: false, message: 'Ошибка подключения' };
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

  if (requiresTwoFactor && !twoFactorInput.value.trim()) {
    document.getElementById('twoFactorError').style.display = 'block';
    twoFactorInput.classList.add('error');
    isValid = false;
  }

  return isValid;
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

  loginButton.innerHTML = '<div class="spinner"></div><span>Вход...</span>';
  loginButton.classList.add('loading');
  loginButton.disabled = true;

  const result = await handleLogin();

  if (result.success) {
    window.location.href = "chats.html";
  } else {
    if (result.requiresTwoFactor) {
      twoFactorInput.focus();
      loginButton.innerHTML = '<span>Войти с 2FA</span>';
    } else {
      alert(result.message || 'Ошибка входа: неверные данные или сервер недоступен');
      loginButton.innerHTML = '<span>Войти</span>';
    }
    loginButton.classList.remove('loading');
    loginButton.disabled = false;
  }
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

document.getElementById('registerLink').addEventListener('click', (e) => {
  e.preventDefault();
  window.location.href = "register.html";
});

document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  await checkServerConnection(currentServerUrl);
  usernameInput.focus();
});
