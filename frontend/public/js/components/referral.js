async function renderReferralPage(container) {
    container.innerHTML = '<h2 style="margin-bottom:16px;">👥 Ortaklık</h2><p style="text-align:center;color:var(--text-secondary);">Yükleniyor...</p>';

    try {
        const stats = await API.getReferralStats();
        const linkData = await API.getReferralLink();

        let html = '';
        html += '<div class="card">';
        html += '<h3 style="margin-bottom:8px;">📢 Davet Linkin</h3>';
        html += '<p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:8px;">Arkadaşlarını davet et, onlar kazandıkça sen de kazan!</p>';
        html += `<div class="referral-code-box" onclick="copyReferralLink('${linkData.inviteLink}')">`;
        html += `${linkData.inviteLink}`;
        html += '</div>';
        html += '<p style="font-size:0.75rem;color:var(--text-secondary);text-align:center;">Linke tıkla kopyala</p>';
        html += '</div>';

        html += '<div class="referral-stats">';
        html += '<div class="stat-card">';
        html += `<div class="stat-number">${stats.referralCount}</div>`;
        html += '<div class="stat-label">Davet Edilen</div>';
        html += '</div>';
        html += '<div class="stat-card">';
        html += `<div class="stat-number">${formatNumber(stats.totalBonusEarned)}</div>`;
        html += '<div class="stat-label">Kazanılan Bonus</div>';
        html += '</div>';
        html += '</div>';

        html += '<div class="card">';
        html += '<h3 style="margin-bottom:8px;">💰 Bonus & Komisyon</h3>';
        html += '<p style="font-size:0.9rem;">• Her davet için <strong style="color:var(--gold);">50 Altın</strong> bonus</p>';
        html += `<p style="font-size:0.9rem;">• Arkadaşının üretiminden <strong style="color:var(--gold);">%${Math.round(linkData.commissionRate || 10)}</strong> komisyon</p>`;
        html += '</div>';

        if (stats.referrals.length > 0) {
            html += '<h3 style="margin:12px 0;">Davet Ettiklerin</h3>';
            stats.referrals.forEach(ref => {
                html += '<div class="animal-card">';
                html += `<div style="font-size:1.5rem;">👤</div>`;
                html += '<div class="animal-info">';
                html += `<div class="animal-name">${ref.username}</div>`;
                html += `<div class="animal-production">Katılım: ${new Date(ref.joinedAt).toLocaleDateString('tr-TR')}</div>`;
                html += '</div>';
                html += `<div style="color:var(--gold);font-weight:600;">+${formatNumber(ref.bonusEarned)}</div>`;
                html += '</div>';
            });
        }

        container.innerHTML = '<h2 style="margin-bottom:16px;">👥 Ortaklık</h2>' + html;
    } catch (err) {
        container.innerHTML = `<h2 style="margin-bottom:16px;">👥 Ortaklık</h2><p style="color:var(--red);text-align:center;">Hata: ${err.message}</p>`;
    }
}

function copyReferralLink(link) {
    navigator.clipboard.writeText(link).then(() => {
        showNotification('Davet linki kopyalandı! 📋', 'success');
    }).catch(() => {
        showNotification('Link: ' + link, 'info');
    });
}
