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
  document.getElementById('clear-all-cookies').addEventListener('click', clearCurrentTabCookies);
  document.getElementById('modal-cancel').addEventListener('click', () => {
    document.getElementById('profile-action-modal').style.display = 'none';
  });
  document.getElementById('refresh-dns-button').addEventListener('click', openDNSCachePage);
}

// 加载 cookie 保存项
function loadCookieProfiles() {
  chrome.storage.local.get(COOKIE_PROFILES_KEY, (result) => {
    const profiles = result[COOKIE_PROFILES_KEY] || [];
    const profileSelect = document.getElementById('profile-select');
    profileSelect.innerHTML = '<option value="">-- 选择你要启用的 Cookie 保存项 --</option>';
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
  showProfileActionModal('创建', (profileName) => {
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
  });
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
            chrome.cookies.set(cookieDetails, (result) => {
              if (chrome.runtime.lastError) {
                console.warn(`无法设置 cookie "${cookie.name}": ${chrome.runtime.lastError.message}`);
              }
            });
          });
          showMessage('切换成功！', 'success');
        });
      }
    });
  }
}

// 更新 cookie 保存项
function updateProfile() {
  showProfileActionModal('更新', (selectedProfile) => {
    chrome.cookies.getAll({}, (cookies) => {
      chrome.storage.local.get(COOKIE_PROFILES_KEY, (result) => {
        const profiles = result[COOKIE_PROFILES_KEY] || [];
        const index = profiles.findIndex(p => p.name === selectedProfile);
        if (index !== -1) {
          profiles[index].cookies = cookies;
          chrome.storage.local.set({ [COOKIE_PROFILES_KEY]: profiles }, () => {
            showMessage('更新成功！', 'success');
            loadCookieProfiles();
          });
        }
      });
    });
  });
}

// 删除 cookie 保存项
function deleteProfile() {
  showProfileActionModal('删除', (selectedProfile) => {
    chrome.storage.local.get(COOKIE_PROFILES_KEY, (result) => {
      const profiles = result[COOKIE_PROFILES_KEY] || [];
      const newProfiles = profiles.filter(p => p.name !== selectedProfile);
      chrome.storage.local.set({ [COOKIE_PROFILES_KEY]: newProfiles }, () => {
        showMessage('删除成功！', 'success');
        loadCookieProfiles();
      });
    });
  });
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

// 清除当前 tab 页面所有 cookies
function clearCurrentTabCookies() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.cookies.getAll({ url: tabs[0].url }, (cookies) => {
      cookies.forEach(cookie => {
        chrome.cookies.remove({ url: getCookieUrl(cookie), name: cookie.name });
      });
      showMessage('已清除当前 tab 页面所有 cookies！', 'success');
      // 刷新页面
      chrome.tabs.reload(tabs[0].id);
    });
  });
}

// 新增函数：显示操作选择框
function showProfileActionModal(action, callback) {
  const modal = document.getElementById('profile-action-modal');
  const title = document.getElementById('modal-title');
  const inputContainer = document.getElementById('modal-input-container');
  const confirmBtn = document.getElementById('modal-confirm');
  const cancelBtn = document.getElementById('modal-cancel');

  title.textContent = `${action} Cookie 保存项`;
  modal.style.display = 'block';

  inputContainer.innerHTML = '';
  if (action === '创建') {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'profile-name-input';
    input.placeholder = '输入配置项名称';
    inputContainer.appendChild(input);
  } else {
    const select = document.createElement('select');
    select.id = 'profile-action-select';
    inputContainer.appendChild(select);

    chrome.storage.local.get(COOKIE_PROFILES_KEY, (result) => {
      const profiles = result[COOKIE_PROFILES_KEY] || [];
      select.innerHTML = '';
      profiles.forEach((profile) => {
        const option = document.createElement('option');
        option.value = profile.name;
        option.textContent = profile.name;
        select.appendChild(option);
      });
    });
  }

  confirmBtn.onclick = () => {
    let selectedValue;
    if (action === '创建') {
      selectedValue = document.getElementById('profile-name-input').value.trim();
    } else {
      selectedValue = document.getElementById('profile-action-select').value;
    }

    if (selectedValue) {
      modal.style.display = 'none';
      callback(selectedValue);
    } else {
      showMessage('请输入或选择一个 Cookie 保存项', 'warning');
    }
  };

  cancelBtn.onclick = () => {
    modal.style.display = 'none';
  };
}

// 新增函数：打开 DNS 缓存清除页面
function openDNSCachePage() {
  chrome.tabs.create({ url: 'chrome://net-internals/#sockets' });
}
