async function renderFarmPage(container) {
    let html = '<div class="claim-btn-container">';
    html += '<button class="claim-btn" id="claimBtn" onclick="handleClaim()">';
    html += '⚡<br><span class="claim-sub">Topla</span>';
    html += '</button>';
    html += '</div>';
    html += '<div id="unclaimedInfo"></div>';
    html += '<div id="animalList"></div>';
    container.innerHTML = html;

    await loadFarmData();
}

async function loadFarmData() {
    try {
        const data = await API.getFarm();
        farmData = data;

        updateHeader(data.goldBalance, data.hourlyProduction);

        const unclaimedEl = document.getElementById('unclaimedInfo');
        if (data.unclaimedGold > 0) {
            unclaimedEl.innerHTML = `<div class="unclaimed-badge">💰 ${formatNumber(data.unclaimedGold)} Altın toplanmayı bekliyor!</div>`;
        } else {
            unclaimedEl.innerHTML = '';
        }

        const animalList = document.getElementById('animalList');
        let html = '<h3 style="margin-bottom:12px;">🐾 Hayvanların</h3>';

        const ownedMap = {};
        data.animals.forEach(a => { ownedMap[a.animal.id] = a.quantity; });

        data.availableAnimals.forEach(animal => {
            const owned = ownedMap[animal.id] || 0;
            const canBuy = data.goldBalance >= animal.purchaseCostGold && animal.purchaseCostGold > 0;

            html += '<div class="animal-card">';
            html += `<div class="animal-emoji">${animal.emoji || getAnimalEmoji(animal.name)}</div>`;
            html += '<div class="animal-info">';
            html += `<div class="animal-name">${animal.name}</div>`;
            html += `<div class="animal-tier">Tier ${animal.tier}</div>`;
            html += `<div class="animal-production">⚡ ${formatNumber(Math.round(animal.dailyProductionGold))} Altın/gün <span>(${formatNumber(Math.round(animal.dailyProductionGold / 24))}/sa)</span></div>`;

            if (animal.id === 1) {
                html += `<div class="owned-badge" style="display:inline-block;margin-top:4px;">✅ Ücretsiz</div>`;
            } else if (owned > 0) {
                html += `<div class="owned-badge" style="display:inline-block;margin-top:4px;">Sahip: ${owned}</div>`;
            } else {
                html += `<div class="animal-cost">💰 ${formatNumber(animal.purchaseCostGold)} Altın</div>`;
            }

            html += '</div>';
            html += '<div class="animal-actions">';
            if (owned > 0) {
                html += `<button class="btn-buy" onclick="handlePurchase(${animal.id})">+ Satın Al</button>`;
            } else if (animal.id !== 1) {
                html += `<button class="btn-buy" ${canBuy ? '' : 'disabled'} onclick="handlePurchase(${animal.id})">Satın Al</button>`;
            }
            html += '</div></div>';
        });

        html += '<div style="margin-top:12px;font-size:0.8rem;color:var(--text-secondary);text-align:center;">';
        html += `Toplam: ${formatNumber(Math.round(data.dailyProduction))} Altın/gün (${formatNumber(Math.round(data.hourlyProduction))}/sa)`;
        html += '</div>';

        animalList.innerHTML = html;
    } catch (err) {
        showNotification('Çiftlik verisi yüklenemedi: ' + err.message, 'error');
    }
}

function getAnimalEmoji(name) {
    const emojis = {
        'Tavuk': '🐔', 'Tavşan': '🐇', 'Koyun': '🐑', 'Keçi': '🐐',
        'İnek': '🐄', 'At': '🐎', 'Altın Boğa': '🐂'
    };
    return emojis[name] || '🐾';
}

async function handleClaim() {
    try {
        const result = await API.claim();
        showNotification(`+${formatNumber(result.goldEarned)} Altın kazandın! 🎉`, 'success');

        const btn = document.getElementById('claimBtn');
        coinAnimation(btn.parentElement);

        await loadFarmData();
    } catch (err) {
        showNotification('Toplama hatası: ' + err.message, 'error');
    }
}

async function handlePurchase(animalId) {
    try {
        const result = await API.purchase(animalId, 1);
        if (result.success) {
            showNotification('Satın alma başarılı! 🎉', 'success');
            await loadFarmData();
        } else {
            showNotification(result.message, 'error');
        }
    } catch (err) {
        showNotification('Satın alma hatası: ' + err.message, 'error');
    }
}
