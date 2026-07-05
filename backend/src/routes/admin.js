import { q1, q, w } from '../db/database.js';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin123';

function adminAuth(request, reply) {
  const token = request.headers['x-admin-token'] || request.query.token;
  if (token !== ADMIN_TOKEN) { reply.code(401).send({ error: 'Unauthorized' }); return false; }
  return true;
}

export function adminRoutes(fastify, db, miningService) {
  // Admin dashboard HTML
  fastify.get('/admin', async (request, reply) => {
    if (request.query.token !== ADMIN_TOKEN) return reply.code(401).send('Unauthorized');
    reply.type('text/html').send(getAdminHTML());
  });

  // User detail page
  fastify.get('/admin/user', async (request, reply) => {
    if (request.query.token !== ADMIN_TOKEN) return reply.code(401).send('Unauthorized');
    reply.type('text/html').send(getUserDetailHTML());
  });

  // API: all users
  fastify.get('/api/admin/users', async (request, reply) => {
    if (!adminAuth(request, reply)) return;
    const users = await q(db,
      `SELECT id, username, telegram_id, gold_balance, total_earned, total_withdrawn,
              cwallet_id, created_at, is_active
       FROM users ORDER BY gold_balance DESC LIMIT 200`);
    return { users };
  });

  // API: single user detail
  fastify.get('/api/admin/users/:id', async (request, reply) => {
    if (!adminAuth(request, reply)) return;
    const user = await q1(db, 'SELECT * FROM users WHERE id = ?', [Number(request.params.id)]);
    if (!user) return reply.code(404).send({ error: 'User not found' });
    const animals = await q(db,
      'SELECT ua.*, a.name, a.emoji FROM user_animals ua JOIN animals a ON ua.animal_id = a.id WHERE ua.user_id = ?',
      [user.id]);
    const recentTxs = await q(db,
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [user.id]);
    return { user, animals, transactions: recentTxs, hourlyProduction: await miningService.calculateHourlyProduction(user.id) };
  });

  // API: stats
  fastify.get('/api/admin/stats', async (request, reply) => {
    if (!adminAuth(request, reply)) return;
    const totalUsers = (await q1(db, 'SELECT COUNT(*) as c FROM users')).c;
    const activeUsers = (await q1(db, 'SELECT COUNT(*) as c FROM users WHERE is_active = 1')).c;
    const totalGold = (await q1(db, 'SELECT COALESCE(SUM(gold_balance),0) as s FROM users')).s;
    const totalWithdrawn = (await q1(db, 'SELECT COALESCE(SUM(total_withdrawn),0) as s FROM users')).s;
    const todayStart = Date.now() - (Date.now() % 86400000);
    const todayData = await q1(db,
      "SELECT COUNT(*) as c, COALESCE(SUM(amount_usd),0) as s FROM transactions WHERE type = 'WITHDRAWAL' AND status = 'COMPLETED' AND created_at >= ?",
      [todayStart]);
    return { totalUsers, activeUsers, totalGold, totalWithdrawn, todayWithdrawals: todayData.c, todayVolumeUsd: todayData.s };
  });
}

function getUserDetailHTML() {
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kullanıcı Detayı - FarmMine Admin</title><style>
*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
body{background:#0d1117;color:#c9d1d9;padding:20px}
h1{color:#ffd700;margin-bottom:16px}
.card{background:#161b22;border-radius:8px;padding:16px;margin-bottom:12px;border:1px solid #30363d}
.flex{display:flex;gap:16px;flex-wrap:wrap}
.flex>div{flex:1;min-width:200px}
.label{color:#8b949e;font-size:.8rem}
.value{font-size:1.1rem;font-weight:600;color:#ffd700}
table{width:100%;border-collapse:collapse;font-size:.85rem;margin-top:8px}
th{text-align:left;padding:8px;border-bottom:2px solid #30363d;color:#ffd700}
td{padding:8px;border-bottom:1px solid #21262d}
.back{margin-bottom:16px;display:inline-block;color:#58a6ff;text-decoration:none}
.green{color:#4caf50}
</style></head><body><a class="back" href="/admin?token=${ADMIN_TOKEN}">← Panel</a><h1 id="title">Kullanıcı #0</h1><div id="content">Yükleniyor...</div>
<script>const t=new URLSearchParams(location.search).get('token'),id=new URLSearchParams(location.search).get('userId');
async function load(){const h={'X-Admin-Token':t},d=await fetch('/api/admin/users/'+id,{headers:h}).then(r=>r.json()),u=d.user;
document.getElementById('title').textContent=u.username+' (#'+u.id+')';
document.getElementById('content').innerHTML=
'<div class="card"><div class="flex"><div><div class="label">Altın</div><div class="value">'+u.gold_balance.toLocaleString()+'</div></div><div><div class="label">Toplam Kazanç</div><div class="value">'+u.total_earned.toLocaleString()+'</div></div><div><div class="label">Toplam Çekim</div><div class="value">'+u.total_withdrawn.toLocaleString()+'</div></div><div><div class="label">Saatlik Üretim</div><div class="value green">'+Math.round(d.hourlyProduction)+'</div></div></div></div>'+
'<div class="card"><div class="flex"><div><div class="label">Telegram</div><div class="value">'+(u.telegram_id||'-')+'</div></div><div><div class="label">CWallet</div><div class="value">'+(u.cwallet_id||'-')+'</div></div><div><div class="label">Kayıt</div><div class="value">'+new Date(u.created_at).toLocaleString('tr-TR')+'</div></div><div><div class="label">Durum</div><div class="value">'+(u.is_active?'Aktif':'Pasif')+'</div></div></div></div>'+
'<div class="card"><h3>Hayvanlar</h3><table><tr><th>Hayvan</th><th>Adet</th></tr>'+d.animals.map(a=>'<tr><td>'+a.emoji+' '+a.name+'</td><td>'+a.quantity+'</td></tr>').join('')+'</table></div>'+
'<div class="card"><h3>İşlemler</h3><table><tr><th>Tarih</th><th>Tip</th><th>Miktar</th><th>Açıklama</th></tr>'+d.transactions.map(tx=>'<tr><td>'+new Date(tx.created_at).toLocaleString('tr-TR')+'</td><td>'+tx.type+'</td><td>'+(tx.type==='WITHDRAWAL'?'-':'+')+tx.amount_gold.toLocaleString()+'</td><td>'+tx.description+'</td></tr>').join('')+'</table></div>';}
load();</script></body></html>`; }

function getAdminHTML() {
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FarmMine Admin Panel</title><style>
*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
body{background:#0d1117;color:#c9d1d9;padding:20px}
h1{color:#ffd700;margin-bottom:20px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px}
.stat{background:#161b22;border-radius:8px;padding:16px;text-align:center;border:1px solid #30363d}
.stat-num{font-size:1.8rem;font-weight:700;color:#ffd700}
.stat-label{font-size:.8rem;color:#8b949e;margin-top:4px}
table{width:100%;border-collapse:collapse;font-size:.85rem}
th{text-align:left;padding:8px;border-bottom:2px solid #30363d;color:#ffd700}
td{padding:8px;border-bottom:1px solid #21262d}
tr:hover{background:#1c2128}
.badge{padding:2px 8px;border-radius:12px;font-size:.75rem;font-weight:600}
.badge-online{background:#238636;color:#fff}
.badge-offline{background:#30363d;color:#8b949e}
a{color:#58a6ff;text-decoration:none}
a:hover{text-decoration:underline}
.topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.search{background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:8px 12px;color:#c9d1d9;width:200px}
</style></head><body>
<div class="topbar"><h1>🌾 FarmMine Admin</h1><input class="search" id="search" placeholder="Kullanıcı ara..." oninput="filterTable()"/></div>
<div class="stats" id="stats"></div>
<h2 style="margin-bottom:12px;">Kullanıcılar</h2>
<table><thead><tr><th>ID</th><th>Kullanıcı</th><th>Telegram</th><th>Altın</th><th>Kazanç</th><th>Çekim</th><th>Durum</th></tr></thead><tbody id="usersBody"></tbody></table>
<script>let users=[],token=new URLSearchParams(location.search).get('token'),h={'X-Admin-Token':token};
async function load(){const s=await fetch('/api/admin/stats',{headers:h}).then(r=>r.json());
document.getElementById('stats').innerHTML='<div class="stat"><div class="stat-num">'+s.totalUsers+'</div><div class="stat-label">Kullanıcı</div></div><div class="stat"><div class="stat-num">'+s.activeUsers+'</div><div class="stat-label">Aktif</div></div><div class="stat"><div class="stat-num">'+(s.totalGold/10000).toFixed(2)+'$</div><div class="stat-label">Toplam Altın</div></div><div class="stat"><div class="stat-num">'+(s.totalWithdrawn/10000).toFixed(2)+'$</div><div class="stat-label">Çekilen</div></div><div class="stat"><div class="stat-num">'+s.todayWithdrawals+'</div><div class="stat-label">Bugün Çekim</div></div><div class="stat"><div class="stat-num">'+Number(s.todayVolumeUsd).toFixed(2)+'$</div><div class="stat-label">Bugün Hacim</div></div>';
const r=await fetch('/api/admin/users',{headers:h}).then(r=>r.json());users=r.users;renderTable();}
function renderTable(){const q=document.getElementById('search').value.toLowerCase(),f=users.filter(u=>u.username.toLowerCase().includes(q)||String(u.id).includes(q));
document.getElementById('usersBody').innerHTML=f.map(u=>'<tr onclick="window.location=\'/admin/user?userId='+u.id+'&token='+token+'\'"><td>'+u.id+'</td><td><a href="/admin/user?userId='+u.id+'&token='+token+'">'+u.username+'</a></td><td>'+(u.telegram_id||'-')+'</td><td style="color:#ffd700">'+Number(u.gold_balance).toLocaleString()+'</td><td style="color:#4caf50">'+Number(u.total_earned).toLocaleString()+'</td><td>'+Number(u.total_withdrawn).toLocaleString()+'</td><td><span class="badge '+(u.is_active?'badge-online':'badge-offline')+'">'+(u.is_active?'Aktif':'Pasif')+'</span></td></tr>').join('');}
function filterTable(){renderTable()}
load();</script></body></html>`; }
