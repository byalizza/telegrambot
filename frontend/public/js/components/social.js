async function renderSocialPage(container) {
  container.innerHTML = '<h2 style="margin-bottom:16px;">🏆 Sıralama</h2><p style="text-align:center;color:var(--text-secondary);">Yükleniyor...</p>';

  try {
    const data = await API.getLeaderboard();
    const friendsData = await API.getFriendList();
    const requestsData = await API.getFriendRequests();

    let html = '';

    // ─── FRIEND REQUESTS ───
    if (requestsData.received.length > 0) {
      html += '<div class="card" style="border:2px solid var(--gold);">';
      html += '<h3 style="margin-bottom:8px;color:var(--gold);">📩 Gelen İstekler</h3>';
      requestsData.received.forEach(r => {
        html += `<div class="animal-card">
          <div style="font-size:1.5rem;">👤</div>
          <div class="animal-info"><div class="animal-name">${r.username}</div></div>
          <div style="display:flex;gap:8px;">
            <button class="task-btn do" onclick="handleAcceptRequest(${r.id})">✓ Kabul</button>
            <button class="task-btn" style="background:var(--red);color:#fff;" onclick="handleRejectRequest(${r.id})">✗</button>
          </div>
        </div>`;
      });
      html += '</div>';
    }

    html += '<div style="display:flex;gap:12px;margin-bottom:16px;">';
    html += `<button class="btn btn-outline" style="flex:1;" onclick="showLeaderboard()">🏆 Sıralama</button>`;
    html += `<button class="btn btn-outline" style="flex:1;" onclick="showFriends()">👥 Arkadaşlar (${friendsData.friends.length})</button>`;
    html += `<button class="btn btn-outline" style="flex:1;" onclick="showAddFriend()">➕ Ekle</button>`;
    html += '</div>';

    html += '<div id="socialContent">';
    html += renderLeaderboardList(data);
    html += '</div>';

    container.innerHTML = '<h2 style="margin-bottom:16px;">🏆 Sıralama</h2>' + html;
  } catch (err) {
    container.innerHTML = `<h2 style="margin-bottom:16px;">🏆 Sıralama</h2><p style="color:var(--red);text-align:center;">Hata: ${err.message}</p>`;
  }
}

function renderLeaderboardList(data) {
  let html = '<h3 style="margin-bottom:8px;">En Zengin Çiftlikler</h3>';

  if (data.myPosition) {
    html += `<p style="font-size:.85rem;color:var(--text-secondary);margin-bottom:8px;">Senin sıran: #${data.myPosition}</p>`;
  }

  data.leaderboard.slice(0, 50).forEach(u => {
    const medal = u.rank === 1 ? '🥇' : u.rank === 2 ? '🥈' : u.rank === 3 ? '🥉' : `#${u.rank}`;
    html += '<div class="animal-card" style="cursor:pointer;" onclick="viewFriendFarm('+u.id+')">';
    html += `<div style="font-size:1.2rem;font-weight:700;width:40px;text-align:center;">${medal}</div>`;
    html += '<div class="animal-info">';
    html += `<div class="animal-name">${u.username}</div>`;
    html += `<div class="animal-production">💰 ${formatNumber(u.gold_balance)} Altın</div>`;
    html += '</div>';
    html += `<div style="text-align:right;">
      <div style="color:var(--text-secondary);font-size:.8rem;">${formatNumber(u.total_earned)} kazanç</div>
      <div style="color:var(--text-secondary);font-size:.75rem;">👥 ${u.friend_count}</div>
    </div>`;
    html += '</div>';
  });

  return html;
}

async function showLeaderboard() {
  const data = await API.getLeaderboard();
  document.getElementById('socialContent').innerHTML = renderLeaderboardList(data);
}

async function showFriends() {
  const data = await API.getFriendList();
  let html = '<h3 style="margin-bottom:8px;">👥 Arkadaşların</h3>';

  if (data.friends.length === 0) {
    html += '<p style="text-align:center;color:var(--text-secondary);">Henüz arkadaşın yok. Arkadaş ekle!</p>';
  } else {
    data.friends.forEach(f => {
      html += '<div class="animal-card" style="cursor:pointer;" onclick="viewFriendFarm('+f.id+')">';
      html += `<div style="font-size:1.5rem;">${f.isOnline ? '🟢' : '⚫'}</div>`;
      html += '<div class="animal-info">';
      html += `<div class="animal-name">${f.username}</div>`;
      html += `<div class="animal-production">💰 ${formatNumber(f.goldBalance)} Altın</div>`;
      html += '</div>';
      html += `<div style="color:var(--text-secondary);font-size:.8rem;">${new Date(f.friendSince).toLocaleDateString('tr-TR')}</div>`;
      html += '</div>';
    });
  }

  document.getElementById('socialContent').innerHTML = html;
}

function showAddFriend() {
  let html = '<h3 style="margin-bottom:8px;">➕ Arkadaş Ekle</h3>';
  html += '<div class="form-group"><input type="text" id="friendSearch" placeholder="Kullanıcı adı ara..." oninput="searchUsers()" style="width:100%;padding:12px;border-radius:8px;border:1px solid rgba(255,215,0,0.2);background:var(--bg-card);color:var(--text-primary);font-size:1rem;" /></div>';
  html += '<div id="searchResults"></div>';
  document.getElementById('socialContent').innerHTML = html;
}

async function searchUsers() {
  const q = document.getElementById('friendSearch').value.trim();
  if (q.length < 2) { document.getElementById('searchResults').innerHTML = ''; return; }

  try {
    const data = await API.searchUsers(q);
    let html = '';
    data.users.forEach(u => {
      html += '<div class="animal-card">';
      html += '<div style="font-size:1.5rem;">👤</div>';
      html += '<div class="animal-info"><div class="animal-name">'+u.username+'</div><div class="animal-production">💰 '+formatNumber(u.goldBalance)+' Altın</div></div>';
      html += `<button class="task-btn do" onclick="handleSendRequest('${u.username}')">➕ Ekle</button>`;
      html += '</div>';
    });
    if (data.users.length === 0) html += '<p style="text-align:center;color:var(--text-secondary);">Sonuç bulunamadı</p>';
    document.getElementById('searchResults').innerHTML = html;
  } catch (err) { document.getElementById('searchResults').innerHTML = '<p style="color:var(--red);">'+err.message+'</p>'; }
}

async function handleSendRequest(username) {
  try {
    const result = await API.sendFriendRequest(username);
    showNotification(result.message, 'success');
  } catch (err) { showNotification(err.message, 'error'); }
}

async function handleAcceptRequest(requestId) {
  try {
    await API.acceptFriendRequest(requestId);
    showNotification('Arkadaş eklendi! 🎉', 'success');
    renderSocialPage(document.getElementById('mainContent'));
  } catch (err) { showNotification(err.message, 'error'); }
}

async function handleRejectRequest(requestId) {
  try {
    await API.rejectFriendRequest(requestId);
    showNotification('İstek reddedildi', 'info');
    renderSocialPage(document.getElementById('mainContent'));
  } catch (err) { showNotification(err.message, 'error'); }
}

async function viewFriendFarm(userId) {
  try {
    const data = await API.visitFriendFarm(userId);
    const content = document.getElementById('socialContent');
    let html = `<button class="btn btn-outline" onclick="showFriends()" style="margin-bottom:12px;">← Geri</button>`;
    html += '<div class="card">';
    html += `<h3>${data.user.username}'ın Çiftliği 🌾</h3>`;
    html += `<p style="color:var(--gold);">💰 ${formatNumber(data.user.goldBalance)} Altın</p>`;
    html += `<p style="color:var(--text-secondary);">⚡ ${formatNumber(Math.round(data.hourlyProduction))} Altın/saat</p>`;
    html += '</div>';

    html += '<h3 style="margin:12px 0;">🐾 Hayvanlar</h3>';
    data.animals.forEach(a => {
      html += '<div class="animal-card">';
      html += `<div style="font-size:2rem;">${a.emoji}</div>`;
      html += '<div class="animal-info">';
      html += `<div class="animal-name">${a.name} x${a.quantity}</div>`;
      html += `<div class="animal-production">⚡ ${formatNumber(Math.round(a.dailyProduction))} Altın/gün</div>`;
      html += '</div></div>';
    });

    content.innerHTML = html;
  } catch (err) { showNotification(err.message, 'error'); }
}
