// 存储 cookie 保存项的键名
const COOKIE_PROFILES_KEY = 'cookieProfiles';

// 初始化界面
document.addEventListener('DOMContentLoaded', initializeUI);

// 初始化界面函数
function initializeUI() {
  loadCookieProfiles();
  document.getElementById('create-profile').addEventListener('click', createProfile);
  document.getElementById('update-profile').addEventListener('click', updateProfile);
  document.getElementById('delete-profile').addEventListener('click', deleteProfile);
  document.getElementById('profile-select').addEventListener('change', switchProfile);
}

// 加载 cookie 保存项
function loadCookieProfiles() {
  chrome.storage.local.get(COOKIE_PROFILES_KEY, (result) => {
    const profiles = result[COOKIE_PROFILES_KEY] || [];
    const profileSelect = document.getElementById('profile-select');
    profileSelect.innerHTML = '<option value="">-- 选择 Cookie 保存项 --</option>';
    profiles.forEach((profile) => {
      const option = document.createElement('option');
      option.value = profile.name;
      option.textContent = profile.name;
      profileSelect.appendChild(option);
    });
  });
}

// 创建新的 cookie 保存项
function createProfile() {
  const profileName = prompt('请输入新的 cookie 保存项名称：');
  if (profileName) {
    chrome.cookies.getAll({}, (cookies) => {
      const newProfile = { name: profileName, cookies: cookies };
      chrome.storage.local.get(COOKIE_PROFILES_KEY, (result) => {
        const profiles = result[COOKIE_PROFILES_KEY] || [];
        profiles.push(newProfile);
        chrome.storage.local.set({ [COOKIE_PROFILES_KEY]: profiles }, () => {
          showMessage('创建成功！', 'success');
          loadCookieProfiles();
        });
      });
    });
  }
}

// 切换 cookie 保存项
function switchProfile() {
  const profileSelect = document.getElementById('profile-select');
  const selectedProfile = profileSelect.value;
  if (selectedProfile) {
    chrome.storage.local.get(COOKIE_PROFILES_KEY, (result) => {
      const profiles = result[COOKIE_PROFILES_KEY] || [];
      const profile = profiles.find(p => p.name === selectedProfile);
      if (profile) {
        chrome.cookies.getAll({}, (currentCookies) => {
          currentCookies.forEach(cookie => {
            chrome.cookies.remove({ url: getCookieUrl(cookie), name: cookie.name });
          });
          profile.cookies.forEach(cookie => {
            const cookieDetails = {
              url: getCookieUrl(cookie),
              name: cookie.name,
              value: cookie.value,
              domain: cookie.domain,
              path: cookie.path,
              secure: cookie.secure,
              httpOnly: cookie.httpOnly,
              sameSite: cookie.sameSite,
              expirationDate: cookie.expirationDate
            };
            chrome.cookies.set(cookieDetails);
          });
          showMessage('切换成功！', 'success');
        });
      }
    });
  }
}

// 更新 cookie 保存项
function updateProfile() {
  const profileSelect = document.getElementById('profile-select');
  const selectedProfile = profileSelect.value;
  if (selectedProfile) {
    chrome.cookies.getAll({}, (cookies) => {
      chrome.storage.local.get(COOKIE_PROFILES_KEY, (result) => {
        const profiles = result[COOKIE_PROFILES_KEY] || [];
        const index = profiles.findIndex(p => p.name === selectedProfile);
        if (index !== -1) {
          profiles[index].cookies = cookies;
          chrome.storage.local.set({ [COOKIE_PROFILES_KEY]: profiles }, () => {
            showMessage('更新成功！', 'success');
          });
        }
      });
    });
  } else {
    showMessage('请选择一个 cookie 保存项', 'warning');
  }
}

// 删除 cookie 保存项
function deleteProfile() {
  const profileSelect = document.getElementById('profile-select');
  const selectedProfile = profileSelect.value;
  if (selectedProfile) {
    chrome.storage.local.get(COOKIE_PROFILES_KEY, (result) => {
      const profiles = result[COOKIE_PROFILES_KEY] || [];
      const newProfiles = profiles.filter(p => p.name !== selectedProfile);
      chrome.storage.local.set({ [COOKIE_PROFILES_KEY]: newProfiles }, () => {
        showMessage('删除成功！', 'success');
        loadCookieProfiles();
      });
    });
  } else {
    showMessage('请选择一个 cookie 保存项', 'warning');
  }
}

// 获取 cookie 的 URL
function getCookieUrl(cookie) {
  return `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`;
}

// 显示消息
function showMessage(message, type) {
  const messagesElement = document.getElementById('messages');
  const messageElement = document.createElement('div');
  messageElement.textContent = message;
  messageElement.className = `alert alert-${type}`;
  messagesElement.appendChild(messageElement);
  setTimeout(() => {
    messagesElement.removeChild(messageElement);
  }, 3000);
}
