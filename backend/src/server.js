import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import 'dotenv/config';
import { getDatabase } from './db/database.js';
import { authMiddleware } from './middleware/auth.js';
import { createMiningService } from './services/miningService.js';
import { authRoutes } from './routes/auth.js';
import { farmRoutes } from './routes/farm.js';
import { walletRoutes } from './routes/wallet.js';
import { taskRoutes } from './routes/tasks.js';
import { referralRoutes } from './routes/referral.js';
import { adminRoutes } from './routes/admin.js';
import { socialRoutes } from './routes/social.js';

const PORT = parseInt(process.env.PORT || '8080');
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

const fastify = Fastify({ logger: true });

await fastify.register(cors, { origin: true, credentials: true });

authMiddleware(fastify);

// Serve frontend static files
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendPath = join(__dirname, '..', '..', 'frontend', 'public');
await fastify.register(fastifyStatic, { root: frontendPath, prefix: '/' });

const db = await getDatabase();
console.log('DB initialized:', typeof db, typeof db.execute);
const miningService = createMiningService(db);

authRoutes(fastify, db, BOT_TOKEN);
farmRoutes(fastify, db, miningService);
walletRoutes(fastify, db);
taskRoutes(fastify, db);
referralRoutes(fastify, db);
adminRoutes(fastify, db, miningService);
socialRoutes(fastify, db, miningService);

// SPA fallback - all non-API routes serve index.html
fastify.setNotFoundHandler((request, reply) => {
  if (request.url.startsWith('/api')) {
    reply.code(404).send({ error: 'Not found' });
  } else {
    reply.sendFile('index.html');
  }
});

fastify.get('/api/health', async (request, reply) => {
  try {
    const r = await db.execute('SELECT 1 as test');
    return { status: 'ok', time: Date.now(), db: r.rows[0] };
  } catch (e) {
    return { status: 'error', message: e.message, stack: e.stack?.split('\n')[0] };
  }
});

try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`🌾 FarmMine backend running on port ${PORT}`);
  console.log(`📝 Admin panel: http://localhost:${PORT}/admin?token=${process.env.ADMIN_TOKEN || 'admin123'}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
