let walletData = null;

async function renderWalletPage(container) {
  let html = '';
  html += '<div class="wallet-card">';
  html += '<div style="font-size:0.9rem;color:var(--text-secondary);">Bakiyen</div>';
  html += '<div class="wallet-balance" id="walletGoldBalance">0</div>';
  html += '<div class="wallet-usd" id="walletUsdBalance">$0.00</div>';
  html += '</div>';

  html += '<div class="card">';
  html += '<h3 style="margin-bottom:8px;">📊 İstatistikler</h3>';
  html += '<div id="walletStats"></div>';
  html += '</div>';

  html += '<div style="display:flex;gap:8px;margin-bottom:16px;">';
  html += '<button class="btn" id="tabDeposit" onclick="switchWalletTab(\'deposit\')" style="flex:1;background:var(--bg-card);">⬇️ Yatırım</button>';
  html += '<button class="btn" id="tabWithdraw" onclick="switchWalletTab(\'withdraw\')" style="flex:1;background:var(--bg-card);">⬆️ Çekim</button>';
  html += '</div>';

  html += '<div id="walletTabContent"></div>';

  container.innerHTML = '<h2 style="margin-bottom:16px;">👛 Cüzdan</h2>' + html;
  await loadWalletData();
  switchWalletTab('deposit');
}

async function loadWalletData() {
  try {
    walletData = await API.getBalance();
    document.getElementById('walletGoldBalance').textContent = formatNumber(walletData.goldBalance);
    document.getElementById('walletUsdBalance').textContent = '$' + walletData.usdBalance;

    let statsHtml = `
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="color:var(--text-secondary);">Toplam Kazanç</span>
        <span style="color:var(--gold);">${formatNumber(walletData.totalEarned)} Altın</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="color:var(--text-secondary);">Toplam Çekim</span>
        <span style="color:var(--green);">${formatNumber(walletData.totalWithdrawn)} Altın</span>
      </div>`;
    if (walletData.pendingDepositGold > 0) {
      statsHtml += `<div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="color:var(--text-secondary);">Bekleyen Yatırım</span>
        <span style="color:var(--warning);">${formatNumber(walletData.pendingDepositGold)} Altın</span>
      </div>`;
    }
    if (walletData.pendingWithdrawGold > 0) {
      statsHtml += `<div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="color:var(--text-secondary);">Bekleyen Çekim</span>
        <span style="color:var(--warning);">${formatNumber(walletData.pendingWithdrawGold)} Altın</span>
      </div>`;
    }
    document.getElementById('walletStats').innerHTML = statsHtml;
  } catch (err) {
    showNotification('Cüzdan verisi yüklenemedi: ' + err.message, 'error');
  }
}

function switchWalletTab(tab) {
  document.getElementById('tabDeposit').style.background = tab === 'deposit' ? 'var(--gold)' : 'var(--bg-card)';
  document.getElementById('tabDeposit').style.color = tab === 'deposit' ? '#000' : 'var(--text-primary)';
  document.getElementById('tabWithdraw').style.background = tab === 'withdraw' ? 'var(--gold)' : 'var(--bg-card)';
  document.getElementById('tabWithdraw').style.color = tab === 'withdraw' ? '#000' : 'var(--text-primary)';

  const el = document.getElementById('walletTabContent');
  if (tab === 'deposit') renderDepositTab(el);
  else renderWithdrawTab(el);
}

function renderDepositTab(el) {
  const info = walletData.depositInfo || { tokens: [], goldPerUsd: 10000 };

  let html = '<div class="card" style="margin-bottom:12px;">';
  html += '<h3 style="margin-bottom:12px;">🏦 Yatırım Yap</h3>';
  html += '<p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:12px;">Aşağıdaki cüzdan adreslerine istediğiniz tokeni gönderin, ardından bildirim formunu doldurun. Admin onaylayınca altın bakiyenize eklenir.</p>';

  html += '<table style="width:100%;font-size:0.8rem;">';
  html += '<tr><th style="text-align:left;color:var(--gold);">Token</th><th style="text-align:left;color:var(--gold);">Ağ</th><th style="text-align:left;color:var(--gold);">Adres</th><th style="text-align:left;color:var(--gold);">Min</th></tr>';
  (info.tokens || []).forEach(t => {
    html += `<tr><td>${t.symbol}</td><td>${t.network}</td><td style="font-size:0.7rem;word-break:break-all;max-width:100px;">${t.address}</td><td>$${t.minDeposit}</td></tr>`;
  });
  html += '</table>';
  html += '<p style="font-size:0.7rem;color:var(--text-secondary);margin-top:8px;">Kur: 10.000 Altın = $1 USD</p>';
  html += '</div>';

  html += '<div class="card">';
  html += '<h3 style="margin-bottom:12px;">📝 Yatırım Bildir</h3>';
  html += '<div class="form-group"><label>Gönderilen Token</label><select id="depositNetwork" class="form-input">';
  (info.tokens || []).forEach(t => {
    html += `<option value="${t.network}">${t.symbol} (${t.network})</option>`;
  });
  html += '</select></div>';
  html += '<div class="form-group"><label>Miktar (Altın)</label><input class="form-input" type="number" id="depositAmount" placeholder="500" min="500" /></div>';
  html += '<div class="form-group"><label>İşlem Hash (TX ID)</label><input class="form-input" type="text" id="depositTxHash" placeholder="Havale işlem numarası / TX hash" /></div>';
  html += '<button class="btn btn-gold" onclick="handleDeposit()">Bildir ✅</button>';
  html += '</div>';

  html += '<div class="card" id="pendingDepositCard" style="display:none;">';
  html += '<h3 style="margin-bottom:8px;">⏳ Bekleyen Yatırımlarım</h3>';
  html += '<div id="pendingDepositList"></div>';
  html += '</div>';

  el.innerHTML = html;

  if (walletData.pendingDepositGold > 0) {
    document.getElementById('pendingDepositCard').style.display = 'block';
    document.getElementById('pendingDepositList').innerHTML =
      `<p style="color:var(--warning);">${formatNumber(walletData.pendingDepositGold)} Altın yatırım bildiriminiz admin onayında.</p>`;
  }
}

function renderWithdrawTab(el) {
  let html = '';

  html += '<div class="card" style="margin-bottom:12px;">';
  html += '<h3 style="margin-bottom:12px;">💳 Çekim Adresin</h3>';
  html += '<div class="form-group">';
  html += '<input class="form-input" type="text" id="walletAddressInput" placeholder="TRC20 / BEP20 adresiniz" />';
  html += '</div>';
  html += '<button class="btn btn-blue" onclick="handleSetAddress()">Kaydet</button>';
  html += '</div>';

  html += '<div class="card">';
  html += '<h3 style="margin-bottom:12px;">💸 Çekim Talebi</h3>';
  html += '<p id="withdrawInfo" style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:12px;"></p>';
  html += '<div class="form-group"><label>Altın Miktarı</label><input class="form-input" type="number" id="withdrawAmount" placeholder="500" min="500" /></div>';
  html += '<div class="form-group"><label>Alıcı Adresi</label><input class="form-input" type="text" id="withdrawAddress" placeholder="Cüzdan adresi" /></div>';
  html += '<button class="btn btn-gold" onclick="handleWithdraw()">Çekim Talebi Gönder</button>';
  html += '<p style="font-size:0.7rem;color:var(--text-secondary);text-align:center;margin-top:8px;">Min: 500 Altın ($0.05) | 24 saatte 1 çekim</p>';
  html += '</div>';

  html += '<div class="card" id="pendingWithdrawCard" style="display:none;">';
  html += '<h3 style="margin-bottom:8px;">⏳ Bekleyen Çekimlerim</h3>';
  html += '<div id="pendingWithdrawList"></div>';
  html += '</div>';

  el.innerHTML = html;

  if (walletData.walletAddress) {
    document.getElementById('walletAddressInput').value = walletData.walletAddress;
  }

  if (walletData.cooldownRemaining > 0) {
    document.getElementById('withdrawInfo').textContent = `⏳ ${Math.ceil(walletData.cooldownRemaining / 3600000)} saat bekle`;
  } else {
    document.getElementById('withdrawInfo').textContent = `Bakiye: ${formatNumber(walletData.goldBalance)} Altın | Min: ${formatNumber(walletData.minWithdrawalGold)} Altın`;
  }

  if (walletData.pendingWithdrawGold > 0) {
    document.getElementById('pendingWithdrawCard').style.display = 'block';
    document.getElementById('pendingWithdrawList').innerHTML =
      `<p style="color:var(--warning);">${formatNumber(walletData.pendingWithdrawGold)} Altın çekim talebiniz admin onayında.</p>`;
  }
}

async function handleSetAddress() {
  const addr = document.getElementById('walletAddressInput').value.trim();
  if (!addr || addr.length < 10) return showNotification('Geçerli bir adres girin', 'error');
  try {
    await API.setAddress(addr);
    showNotification('Adres kaydedildi!', 'success');
  } catch (err) {
    showNotification('Hata: ' + err.message, 'error');
  }
}

async function handleDeposit() {
  const amountGold = parseInt(document.getElementById('depositAmount').value);
  const network = document.getElementById('depositNetwork').value;
  const txHash = document.getElementById('depositTxHash').value.trim();
  if (!amountGold || amountGold < 500) return showNotification('Minimum 500 Altın', 'error');
  if (!txHash) return showNotification('İşlem hash girin', 'error');

  try {
    const res = await API.deposit(amountGold, network, txHash);
    if (res.success) {
      showNotification('✅ Bildiriminiz alındı!', 'success');
      await loadWalletData();
      switchWalletTab('deposit');
    } else showNotification(res.message, 'error');
  } catch (err) {
    showNotification('Hata: ' + err.message, 'error');
  }
}

async function handleWithdraw() {
  const amount = parseInt(document.getElementById('withdrawAmount').value);
  const address = document.getElementById('withdrawAddress').value.trim() || document.getElementById('walletAddressInput').value.trim();
  if (!amount || amount < 500) return showNotification('Minimum 500 Altın', 'error');
  if (!address || address.length < 10) return showNotification('Geçerli adres girin', 'error');

  try {
    const res = await API.withdraw(amount, address);
    if (res.success) {
      showNotification('✅ Talep alındı!', 'success');
      await loadWalletData();
      switchWalletTab('withdraw');
    } else showNotification(res.message, 'error');
  } catch (err) {
    showNotification('Çekim hatası: ' + err.message, 'error');
  }
}
