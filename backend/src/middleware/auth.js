import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'farmgame-secret';

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, telegramId: user.telegram_id },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function authMiddleware(fastify) {
  fastify.decorate('authenticate', async function (request, reply) {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'No token provided', code: 401 });
      return;
    }
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      request.user = decoded;
    } catch {
      reply.code(401).send({ error: 'Invalid token', code: 401 });
    }
  });
}

export function validateTelegramInitData(initData, botToken) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');
    const sortedKeys = Array.from(params.keys()).sort();
    const dataCheckString = sortedKeys.map(k => `${k}=${params.get(k)}`).join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (computedHash !== hash) return null;

    const userStr = params.get('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        return { id: userData.id, username: userData.username || '', first_name: userData.first_name || '', last_name: userData.last_name || '' };
      } catch { return null; }
    }
    return null;
  } catch {
    return null;
  }
}
