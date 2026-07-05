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

    html += '<div class="card" id="cwalletSection">';
    html += '<h3 style="margin-bottom:12px;">🔗 CWallet ID</h3>';
    html += '<div class="form-group">';
    html += '<input type="text" id="cwalletInput" placeholder="CWallet ID-nizi girin" />';
    html += '</div>';
    html += '<button class="btn btn-blue" onclick="handleSetCWallet()">Kaydet</button>';
    html += '</div>';

    html += '<div class="withdraw-form">';
    html += '<h3 style="margin-bottom:12px;">💸 Çekim Yap</h3>';
    html += '<p id="withdrawInfo" style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:12px;"></p>';
    html += '<div class="form-group">';
    html += '<label>Altın Miktarı</label>';
    html += '<input type="number" id="withdrawAmount" placeholder="500" min="500" />';
    html += '</div>';
    html += '<button class="btn btn-gold" onclick="handleWithdraw()">Çekim Yap</button>';
    html += '<p style="font-size:0.7rem;color:var(--text-secondary);text-align:center;margin-top:8px;">Minimum çekim: 500 Altın ($0.05)</p>';
    html += '</div>';

    container.innerHTML = '<h2 style="margin-bottom:16px;">👛 Cüzdan</h2>' + html;
    await loadWalletData();
}

async function loadWalletData() {
    try {
        const data = await API.getBalance();
        document.getElementById('walletGoldBalance').textContent = formatNumber(data.goldBalance);
        document.getElementById('walletUsdBalance').textContent = '$' + data.usdBalance;

        document.getElementById('walletStats').innerHTML = `
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                <span style="color:var(--text-secondary);">Toplam Kazanç</span>
                <span style="color:var(--gold);">${formatNumber(data.totalEarned)} Altın</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                <span style="color:var(--text-secondary);">Toplam Çekim</span>
                <span style="color:var(--green);">${formatNumber(data.totalWithdrawn)} Altın</span>
            </div>
        `;

        document.getElementById('withdrawInfo').textContent =
            `Bakiyen: ${formatNumber(data.goldBalance)} Altın (${data.usdBalance}$) | Minimum: ${formatNumber(data.minWithdrawalGold)} Altın`;

        if (data.cwalletId) {
            document.getElementById('cwalletInput').value = data.cwalletId;
            document.querySelector('#cwalletSection h3').textContent = '✅ CWallet ID: ' + data.cwalletId;
        }
    } catch (err) {
        showNotification('Cüzdan verisi yüklenemedi: ' + err.message, 'error');
    }
}

async function handleSetCWallet() {
    const cwalletId = document.getElementById('cwalletInput').value.trim();
    if (!cwalletId) {
        showNotification('Lütfen CWallet ID girin', 'error');
        return;
    }
    try {
        await API.setCWallet(cwalletId);
        showNotification('CWallet ID kaydedildi! ✅', 'success');
        await loadWalletData();
    } catch (err) {
        showNotification('Hata: ' + err.message, 'error');
    }
}

async function handleWithdraw() {
    const amount = parseInt(document.getElementById('withdrawAmount').value);
    const cwalletId = document.getElementById('cwalletInput').value.trim();

    if (!amount || amount < 500) {
        showNotification('Minimum çekim 500 Altındır', 'error');
        return;
    }
    if (!cwalletId) {
        showNotification('Önce CWallet ID kaydedin', 'error');
        return;
    }

    try {
        const result = await API.withdraw(amount, cwalletId);
        if (result.success) {
            showNotification('💰 ' + result.message, 'success');
            await loadWalletData();
        } else {
            showNotification(result.message, 'error');
        }
    } catch (err) {
        showNotification('Çekim hatası: ' + err.message, 'error');
    }
}
