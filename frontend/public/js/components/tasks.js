async function renderTasksPage(container) {
    container.innerHTML = '<h2 style="margin-bottom:16px;">📋 Görevler</h2><p style="text-align:center;color:var(--text-secondary);">Yükleniyor...</p>';

    try {
        const data = await API.getTasks();
        let html = '';

        data.tasks.forEach(t => {
            const task = t.task;
            const done = t.isCompleted;

            html += '<div class="task-item">';
            html += `<div class="task-icon">${getTaskIcon(task.taskType)}</div>`;
            html += '<div class="task-info">';
            html += `<div class="task-title">${task.title}</div>`;
            html += `<div class="task-desc">${task.description}</div>`;
            html += `<div class="task-reward">+${formatNumber(task.rewardGold)} Altın</div>`;
            html += '</div>';

            if (done) {
                html += '<button class="task-btn done" disabled>✅</button>';
            } else {
                html += `<button class="task-btn do" onclick="handleCompleteTask(${task.id})">Git</button>`;
            }
            html += '</div>';
        });

        container.innerHTML = '<h2 style="margin-bottom:16px;">📋 Görevler</h2>' + html;
    } catch (err) {
        container.innerHTML = `<h2 style="margin-bottom:16px;">📋 Görevler</h2><p style="color:var(--red);text-align:center;">Hata: ${err.message}</p>`;
    }
}

function getTaskIcon(type) {
    const icons = {
        'JOIN_TELEGRAM_CHANNEL': '📢',
        'JOIN_TELEGRAM_GROUP': '👥',
        'FOLLOW_TWITTER': '🐦',
        'INVITE_FRIENDS': '🤝',
        'WATCH_VIDEO': '🎬',
        'DAILY_LOGIN': '📅'
    };
    return icons[type] || '✅';
}

async function handleCompleteTask(taskId) {
    try {
        const result = await API.completeTask(taskId);
        if (result.success) {
            showNotification(`+${result.rewardGold} Altın kazandın! 🎉`, 'success');
            renderTasksPage(document.getElementById('mainContent'));
        } else {
            showNotification(result.message, 'error');
        }
    } catch (err) {
        showNotification('Görev hatası: ' + err.message, 'error');
    }
}
