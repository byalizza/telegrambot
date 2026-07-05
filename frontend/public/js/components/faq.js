function renderFAQPage(container) {
    let html = '<h2 style="margin-bottom:16px;">❓ Nasıl Oynanır?</h2>';

    const faqs = [
        {
            q: '🎮 Bu oyun nedir?',
            a: 'FarmMine, Telegram üzerinde çalışan bir çiftlik simülasyon oyunudur. Hayvanlar satın alır, onlar sizin için otomatik olarak Altın üretir. Biriken Altınları gerçek paraya çevirebilirsiniz.'
        },
        {
            q: '💰 Altın nasıl kazanılır?',
            a: 'Hayvanlarınız 7/24 Altın üretir. Ne kadar çok hayvanınız varsa, saatlik üretiminiz o kadar yüksek olur. Üretimi toplamak için Çiftlik ekranındaki büyük ⚡ butonuna tıklayın.'
        },
        {
            q: '🐾 Hayvanlar ve Üretim',
            a: '7 farklı hayvan türü vardır: Tavuk (ücretsiz), Tavşan, Koyun, Keçi, İnek, At ve Altın Boğa. Her hayvanın farklı satın alma bedeli ve günlük üretim hızı vardır. Daha pahalı hayvanlar daha hızlı üretir.'
        },
        {
            q: '📊 Hayvan Üretim Tablosu',
            a: '' +
                '<table class="animal-table">' +
                '<tr><th>Hayvan</th><th>Fiyat</th><th>Günlük</th><th>Aylık</th></tr>' +
                '<tr><td>🐔 Tavuk</td><td>Ücretsiz</td><td>42 Altın</td><td>$0.13</td></tr>' +
                '<tr><td>🐇 Tavşan</td><td>20,000 Altın</td><td>43 Altın</td><td>$0.13</td></tr>' +
                '<tr><td>🐑 Koyun</td><td>50,000 Altın</td><td>113 Altın</td><td>$0.34</td></tr>' +
                '<tr><td>🐐 Keçi</td><td>100,000 Altın</td><td>233 Altın</td><td>$0.70</td></tr>' +
                '<tr><td>🐄 İnek</td><td>250,000 Altın</td><td>617 Altın</td><td>$1.85</td></tr>' +
                '<tr><td>🐎 At</td><td>500,000 Altın</td><td>1,300 Altın</td><td>$3.90</td></tr>' +
                '<tr><td>🐂 Altın Boğa</td><td>1,000,000 Altın</td><td>2,833 Altın</td><td>$8.50</td></tr>' +
                '</table>' +
                '<p style="font-size:0.8rem;color:var(--text-secondary);margin-top:8px;">10,000 Altın = $1.00 USD</p>'
        },
        {
            q: '💸 Nasıl para çekerim?',
            a: 'Cüzdan sekmesine gidin, CWallet ID\'nizi girin ve çekim yapmak istediğiniz Altın miktarını yazın. Minimum çekim 500 Altın ($0.05)\'dir. Çekimler otomatik olarak CWallet cüzdanınıza gönderilir.'
        },
        {
            q: '👥 Ortaklık sistemi nasıl çalışır?',
            a: 'Davet linkinizi arkadaşlarınızla paylaşın. Kaydolan her arkadaş için 50 Altın bonus kazanırsınız. Ayrıca arkadaşlarınızın üretiminden %10 komisyon alırsınız.'
        },
        {
            q: '📋 Görevler ne işe yarar?',
            a: 'Görevleri tamamlayarak ekstra Altın kazanabilirsiniz. Telegram kanalına katılma, günlük giriş gibi görevler sizi ödüllendirir. Ayrıca çekim yapabilmek için en az 1 görevi tamamlamış olmanız gerekir.'
        },
        {
            q: '🔒 Güvenlik',
            a: 'Tüm işlemler Telegram kimlik doğrulaması ile korunur. Çekim işlemleri Redis kilidi ile eşzamanlı işlemlere karşı korunur. Her kullanıcı 24 saatte yalnızca 1 çekim yapabilir.'
        }
    ];

    faqs.forEach((faq, i) => {
        html += `<div class="faq-item" onclick="toggleFAQ(${i})">`;
        html += `<div class="faq-question">${faq.q}</div>`;
        html += `<div class="faq-answer">${faq.a}</div>`;
        html += '</div>';
    });

    container.innerHTML = html;
}

function toggleFAQ(index) {
    const items = document.querySelectorAll('.faq-item');
    const current = items[index];
    const isOpen = current.classList.contains('open');

    items.forEach(item => item.classList.remove('open'));
    if (!isOpen) current.classList.add('open');
}
