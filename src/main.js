const { invoke } = window.__TAURI__.core;

// Элементы формы
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('loginButton');
const serverStatus = document.getElementById('serverStatus');
const statusDot = document.getElementById('statusDot');
const twoFactorInput = document.getElementById('twoFactor');
const serverUrl = "0.0.0.0:8000";

async function checkServerConnection(server) {
  const isSuccessfulConnection = await invoke('check_dumb', { server: server });
  console.log(isSuccessfulConnection)
  if (isSuccessfulConnection === true) {
    serverStatus.textContent = 'Сервер подключен';
    statusDot.classList.remove('offline');
  } else {
    serverStatus.textContent = 'Сервер недоступен';
    statusDot.classList.add('offline');
  }
}


async function handleLogin() {
  try {
    const response = await invoke('login', {
      server: serverUrl,
      username: usernameInput?.value,
      password: passwordInput?.value,
      two_factor: twoFactorInput?.value || null,
    });

    if (response.success) {
      const token = response.token;
      localStorage.setItem("token", token);
    } else {
      console.error('Ошибка логина:', response.message);
    }

  } catch (err) {
    console.error('Ошибка при вызове команды Tauri:', err);
  }
}

async function handleRegister(username, password) {
  try {
    const response = await invoke('register', {
      server: serverUrl,
      username: username,
      password: password,
    });

    if (response.success) {
      return true;
    } else {
      console.error('Ошибка логина:', response.message);
      return false;
    }

  } catch (err) {
    console.error('Ошибка при вызове команды Tauri:', err);
    return false;
  }
}

function validateForm() {
  let isValid = true;

// Сброс ошибок
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

  // Проверка пароля
  if (!passwordInput.value.trim()) {
    document.getElementById('passwordError').style.display = 'block';
    passwordInput.classList.add('error');
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

  await handleLogin()

  if (localStorage.getItem("token") != null) {
      window.location.href = "chats.html"
  } else {
    console.error('Ошибка входа:', error);
    alert('Ошибка входа: неверные данные или сервер недоступен');
  }

  loginButton.innerHTML = '<span>Войти</span>';
  loginButton.classList.remove('loading');
  loginButton.disabled = false;
});

document.getElementById('registerLink').addEventListener('click', (e) => {
  e.preventDefault();
  alert('Регистрация будет доступна позже!');
});

document.addEventListener("DOMContentLoaded", async () => {
  const serverAddress = document.getElementById("serverAddress");

  serverAddress.textContent = `Сервер: ${serverUrl}`;

  await checkServerConnection(serverUrl);
  usernameInput.focus();
});
