const API_BASE = window.location.origin + '/api';
const tg = window.Telegram?.WebApp;
let authToken = localStorage.getItem('farmgame_token') || '';
let currentUser = null;

function initTelegram() {
  if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#1a1a2e');
    tg.setBackgroundColor('#1a1a2e');
  }
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data;
}

const API = {
  async register(username, password) {
    const data = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    authToken = data.token;
    localStorage.setItem('farmgame_token', data.token);
    currentUser = data.user;
    return data;
  },

  async login(username, password) {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    authToken = data.token;
    localStorage.setItem('farmgame_token', data.token);
    currentUser = data.user;
    return data;
  },

  async telegramAuth() {
    if (!tg?.initData) throw new Error('Telegram not available');
    const data = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ telegramInitData: tg.initData })
    });
    authToken = data.token;
    localStorage.setItem('farmgame_token', data.token);
    currentUser = data.user;
    return data;
  },

  async telegramLogin() {
    if (!tg?.initData) throw new Error('Telegram not available');
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ telegramInitData: tg.initData })
    });
    authToken = data.token;
    localStorage.setItem('farmgame_token', data.token);
    currentUser = data.user;
    return data;
  },

  getFarm: () => api('/farm/status'),
  claim: () => api('/farm/claim', { method: 'POST', body: '{}' }),
  purchase: (animalId, quantity = 1) => api('/farm/purchase', { method: 'POST', body: JSON.stringify({ animalId, quantity }) }),
  getBalance: () => api('/wallet/balance'),
  setAddress: (address) => api('/wallet/set-address', { method: 'POST', body: JSON.stringify({ address }) }),
  deposit: (amountGold, network, txHash) => api('/wallet/deposit', { method: 'POST', body: JSON.stringify({ amountGold, network, txHash }) }),
  withdraw: (amountGold, address) => api('/wallet/withdraw', { method: 'POST', body: JSON.stringify({ amountGold, address }) }),
  getPending: () => api('/wallet/pending'),
  getTasks: () => api('/tasks/list'),
  completeTask: (taskId) => api('/tasks/complete', { method: 'POST', body: JSON.stringify({ taskId }) }),
  getReferralStats: () => api('/referral/stats'),
  getReferralLink: () => api('/referral/link'),
  logout: () => { authToken = ''; localStorage.removeItem('farmgame_token'); currentUser = null; },
  // Social
  getLeaderboard: () => api('/leaderboard'),
  searchUsers: (q) => api(`/users/search?q=${encodeURIComponent(q)}`),
  sendFriendRequest: (username) => api('/friends/send-request', { method: 'POST', body: JSON.stringify({ username }) }),
  acceptFriendRequest: (requestId) => api('/friends/accept-request', { method: 'POST', body: JSON.stringify({ requestId }) }),
  rejectFriendRequest: (requestId) => api('/friends/reject-request', { method: 'POST', body: JSON.stringify({ requestId }) }),
  getFriendList: () => api('/friends/list'),
  getFriendRequests: () => api('/friends/requests'),
  visitFriendFarm: (userId) => api(`/friends/farm/${userId}`),
};
