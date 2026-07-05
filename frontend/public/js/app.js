let currentPage = 'farm';
let farmData = null;

function showNotification(message, type = 'info') {
  const el = document.getElementById('notification');
  el.textContent = message;
  el.className = `notification ${type} show`;
  setTimeout(() => el.classList.remove('show'), 3000);
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'B';
  return num.toLocaleString('tr-TR');
}

function updateHeader(balance, hourlyProd) {
  document.getElementById('goldBalance').textContent = formatNumber(balance || 0);
  document.getElementById('hourlyProduction').textContent = formatNumber(Math.round(hourlyProd || 0));
}

function coinAnimation(container) {
  for (let i = 0; i < 8; i++) {
    const coin = document.createElement('div');
    coin.className = 'coin-particle';
    coin.textContent = '🪙';
    coin.style.left = (Math.random() * 100) + '%';
    coin.style.top = (Math.random() * 50 + 20) + '%';
    coin.style.fontSize = (1 + Math.random()) + 'rem';
    coin.style.animationDelay = (Math.random() * 0.3) + 's';
    container.appendChild(coin);
    setTimeout(() => coin.remove(), 1300);
  }
}

function showLoginScreen() {
  const app = document.getElementById('app');
  app.style.display = 'flex';
  document.getElementById('loading-screen').style.display = 'none';

  app.innerHTML = `
    <div class="login-container" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;padding:24px;">
      <div style="font-size:4rem;margin-bottom:16px;">🌾</div>
      <h1 style="font-size:1.8rem;margin-bottom:4px;color:var(--gold);">FarmMine</h1>
      <p style="color:var(--text-secondary);margin-bottom:24px;">Altın Çiftliği</p>

      <div id="loginForm" style="width:100%;max-width:320px;">
        <div class="form-group">
          <label>Kullanıcı Adı</label>
          <input type="text" id="loginUsername" placeholder="Kullanıcı adınız" style="width:100%;padding:12px;border-radius:8px;border:1px solid rgba(255,215,0,0.2);background:var(--bg-card);color:var(--text-primary);font-size:1rem;" />
        </div>
        <div class="form-group">
          <label>Şifre (opsiyonel)</label>
          <input type="password" id="loginPassword" placeholder="Boş bırakılırsa şifresiz" style="width:100%;padding:12px;border-radius:8px;border:1px solid rgba(255,215,0,0.2);background:var(--bg-card);color:var(--text-primary);font-size:1rem;" />
        </div>
        <button class="btn btn-gold" onclick="handleLogin()" style="margin-top:8px;">Giriş Yap / Kaydol</button>
        <div style="text-align:center;margin:12px 0;color:var(--text-secondary);">veya</div>
        <button class="btn btn-blue" onclick="handleTelegramLogin()">${tg ? '🛡️ Telegram ile Giriş' : 'Telegram kullanılamıyor'}</button>
      </div>
    </div>
  `;
}

async function handleLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!username) return showNotification('Kullanıcı adı gerekli', 'error');

  try {
    // Önce login dene, olmazsa register
    let data;
    try {
      data = await API.login(username, password);
    } catch {
      data = await API.register(username, password);
    }
    showNotification(`Hoş geldin, ${username}! 🌾`, 'success');
    initApp();
  } catch (err) {
    showNotification('Hata: ' + err.message, 'error');
  }
}

async function handleTelegramLogin() {
  try {
    let data;
    try {
      data = await API.telegramLogin();
    } catch {
      data = await API.telegramAuth();
    }
    showNotification('Telegram ile giriş başarılı! 🌾', 'success');
    initApp();
  } catch (err) {
    showNotification('Telegram girişi başarısız: ' + err.message, 'error');
  }
}

async function initApp() {
  if (!authToken) {
    showLoginScreen();
    return;
  }

  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  // Reset app HTML structure
  const app = document.getElementById('app');
  app.innerHTML = `
    <header class="header">
      <div class="gold-display">
        <span class="gold-icon">🪙</span>
        <span id="goldBalance">0</span>
      </div>
      <div class="production-display">
        <span id="hourlyProduction">0</span>
        <small>Altın/saat</small>
      </div>
    </header>
    <main id="mainContent" class="main-content"></main>
    <nav class="bottom-nav">
      <button class="nav-btn active" data-page="farm"><span class="nav-icon">🌾</span><span class="nav-label">Çiftlik</span></button>
      <button class="nav-btn" data-page="tasks"><span class="nav-icon">📋</span><span class="nav-label">Görevler</span></button>
      <button class="nav-btn" data-page="referral"><span class="nav-icon">👥</span><span class="nav-label">Ortaklık</span></button>
      <button class="nav-btn" data-page="wallet"><span class="nav-icon">👛</span><span class="nav-label">Cüzdan</span></button>
      <button class="nav-btn" data-page="social"><span class="nav-icon">🏆</span><span class="nav-label">Sıralama</span></button>
      <button class="nav-btn" data-page="faq"><span class="nav-icon">❓</span><span class="nav-label">Nasıl?</span></button>
    </nav>
  `;

  setupNavigation();
  showPage('farm');
}

function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showPage(btn.dataset.page));
  });
}

function showPage(page) {
  currentPage = page;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.nav-btn[data-page="${page}"]`)?.classList.add('active');

  const content = document.getElementById('mainContent');
  content.innerHTML = '<div class="fade-in">';

  switch (page) {
    case 'farm': renderFarmPage(content); break;
    case 'tasks': renderTasksPage(content); break;
    case 'referral': renderReferralPage(content); break;
    case 'wallet': renderWalletPage(content); break;
    case 'social': renderSocialPage(content); break;
    case 'faq': renderFAQPage(content); break;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initTelegram();
  initApp();
});
