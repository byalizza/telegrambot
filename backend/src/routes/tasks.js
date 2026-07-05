import { q1, q, w } from '../db/database.js';

export function taskRoutes(fastify, db) {
  fastify.get('/api/tasks/list', { preHandler: [fastify.authenticate] }, async (request) => {
    const userId = request.user.id;
    const tasks = await q(db, 'SELECT * FROM tasks WHERE is_active = 1 ORDER BY order_index');
    const completedTasks = await q(db, 'SELECT task_id FROM user_tasks WHERE user_id = ? AND is_completed = 1', [userId]);
    const completedSet = new Set(completedTasks.map(t => t.task_id));

    return {
      tasks: tasks.map(t => ({ task: t, isCompleted: completedSet.has(t.id) }))
    };
  });

  fastify.post('/api/tasks/complete', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { taskId } = request.body || {};
    if (!taskId) return reply.code(400).send({ error: 'taskId required' });

    const userId = request.user.id;
    const task = await q1(db, 'SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (!task) return reply.code(404).send({ error: 'Task not found' });

    const alreadyDone = await q1(db, 'SELECT is_completed FROM user_tasks WHERE user_id = ? AND task_id = ?', [userId, taskId]);
    if (alreadyDone?.is_completed) return reply.code(400).send({ error: 'Task already completed' });

    await w(db,
      'INSERT INTO user_tasks (user_id, task_id, is_completed, completed_at) VALUES (?, ?, 1, ?) ON CONFLICT(user_id, task_id) DO UPDATE SET is_completed = 1, completed_at = ?',
      [userId, taskId, Date.now(), Date.now()]);
    await w(db, 'UPDATE users SET gold_balance = gold_balance + ?, total_earned = total_earned + ? WHERE id = ?',
      [task.reward_gold, task.reward_gold, userId]);
    await w(db, 'INSERT INTO transactions (user_id, type, amount_gold, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, 'TASK_REWARD', task.reward_gold, `Task: ${task.title}`, 'COMPLETED', Date.now()]);

    const user = await q1(db, 'SELECT * FROM users WHERE id = ?', [userId]);
    return { success: true, message: `+${task.reward_gold} gold!`, rewardGold: task.reward_gold, newBalance: Number(user.gold_balance) };
  });
}
