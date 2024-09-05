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
  document.getElementById('add-domain').addEventListener('click', addDomain);
  document.getElementById('refresh-ip').addEventListener('click', refreshAllDomainIps);
  loadDomainIpList();

  // 获取并更新当前域名的 IP 地址
  updateCurrentDomainIp();
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
  const select = document.getElementById('profile-action-select');
  const confirmBtn = document.getElementById('modal-confirm');
  const cancelBtn = document.getElementById('modal-cancel');

  title.textContent = `选择要${action}的 Cookie 保存项`;
  modal.style.display = 'block';

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

  confirmBtn.onclick = () => {
    const selectedProfile = select.value;
    if (selectedProfile) {
      modal.style.display = 'none';
      callback(selectedProfile);
    } else {
      showMessage('请选择一个 Cookie 保存项', 'warning');
    }
  };

  cancelBtn.onclick = () => {
    modal.style.display = 'none';
  };
}

// 新增常量
const DOMAIN_IP_KEY = 'domainIpList';

// 新增函数：加载域名 IP 列表
function loadDomainIpList() {
  chrome.storage.local.get(DOMAIN_IP_KEY, (result) => {
    let domainIpList = result[DOMAIN_IP_KEY] || [];
    if (domainIpList.length === 0) {
      domainIpList = [{ domain: 'kaisouai.com', ip: null }];
      chrome.storage.local.set({ [DOMAIN_IP_KEY]: domainIpList });
    }
    const listElement = document.getElementById('domain-ip-list');
    listElement.innerHTML = '';
    domainIpList.forEach((item) => {
      const li = createDomainIpListItem(item);
      listElement.appendChild(li);
    });
  });
}

// 新增函数：创建域名 IP 列表项
function createDomainIpListItem(item) {
  const li = document.createElement('li');
  li.className = 'domain-ip-item';
  li.innerHTML = `
    <span>${item.domain}</span>
    <span>${item.ip || '正在获取...'}</span>
    <button class="btn-remove">删除</button>
  `;
  li.querySelector('.btn-remove').addEventListener('click', () => removeDomain(item.domain));
  return li;
}

// 新增函数：添加域名
function addDomain() {
  const domainInput = document.getElementById('domain-input');
  const domain = domainInput.value.trim();
  if (domain) {
    chrome.storage.local.get(DOMAIN_IP_KEY, (result) => {
      const domainIpList = result[DOMAIN_IP_KEY] || [];
      if (!domainIpList.some(item => item.domain === domain)) {
        domainIpList.push({ domain, ip: null });
        chrome.storage.local.set({ [DOMAIN_IP_KEY]: domainIpList }, () => {
          domainInput.value = '';
          loadDomainIpList();
          updateDomainIp(domain);
        });
      } else {
        showMessage('该域名已存在', 'warning');
      }
    });
  }
}

// 新增函数：删除域名
function removeDomain(domain) {
  chrome.storage.local.get(DOMAIN_IP_KEY, (result) => {
    const domainIpList = result[DOMAIN_IP_KEY] || [];
    const newList = domainIpList.filter(item => item.domain !== domain);
    chrome.storage.local.set({ [DOMAIN_IP_KEY]: newList }, loadDomainIpList);
  });
}

// 新增函数：获取并更新当前域名的 IP 地址
function updateCurrentDomainIp() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url) {
      const url = new URL(tabs[0].url);
      const domain = url.hostname;
      updateDomainIp(domain);
    }
  });
}

// 新增函数：更新域名的 IP 地址
function updateDomainIp(domain, callback) {
  chrome.tabs.create({ url: `http://${domain}`, active: false }, (tab) => {
    if (chrome.webRequest && chrome.webRequest.onCompleted) {
      chrome.webRequest.onCompleted.addListener(
        function listener(details) {
          chrome.webRequest.onCompleted.removeListener(listener);
          const ip = details.ip;
          updateStoredIp(domain, ip);
          chrome.tabs.remove(tab.id);
          if (callback) callback();
        },
        { urls: [`*://${domain}/*`], types: ['main_frame'] }
      );
    } else {
      console.error('chrome.webRequest.onCompleted 不可用');
      updateStoredIp(domain, '无法获取');
      chrome.tabs.remove(tab.id);
      if (callback) callback();
    }
  });
}

// 新增函数：更新存储的 IP 地址
function updateStoredIp(domain, ip, callback) {
  chrome.storage.local.get(DOMAIN_IP_KEY, (result) => {
    const domainIpList = result[DOMAIN_IP_KEY] || [];
    const existingIndex = domainIpList.findIndex(item => item.domain === domain);
    if (existingIndex !== -1) {
      domainIpList[existingIndex].ip = ip;
    } else {
      domainIpList.push({ domain, ip });
    }
    chrome.storage.local.set({ [DOMAIN_IP_KEY]: domainIpList }, () => {
      loadDomainIpList();
      if (callback) callback();
    });
  });
}

// 新增函数：添加默认域名
function addDefaultDomain(domain) {
  chrome.storage.local.get(DOMAIN_IP_KEY, (result) => {
    const domainIpList = result[DOMAIN_IP_KEY] || [];
    if (!domainIpList.some(item => item.domain === domain)) {
      domainIpList.push({ domain, ip: null });
      chrome.storage.local.set({ [DOMAIN_IP_KEY]: domainIpList }, () => {
        loadDomainIpList();
        updateDomainIp(domain);
      });
    }
  });
}

const DEFAULT_DOMAIN_ADDED_KEY = 'defaultDomainAdded';

// 新增函数：刷新所有域名的 IP 地址
function refreshAllDomainIps() {
  chrome.storage.local.get(DOMAIN_IP_KEY, (result) => {
    const domainIpList = result[DOMAIN_IP_KEY] || [];
    domainIpList.forEach(item => {
      updateDomainIp(item.domain);
    });
    showMessage('正在刷新所有域名的 IP 地址...', 'success');
  });
}
