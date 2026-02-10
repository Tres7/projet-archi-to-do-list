import type { TodoStore } from './types.ts';

const mod = process.env.MYSQL_HOST
    ? await import('./mysql.js')
    : await import('./sqlite.js');

const db: TodoStore = mod.default;

export default db;
