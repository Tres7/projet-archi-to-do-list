import { jest } from '@jest/globals';

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

function makeSqliteMock({ openErr, runErr, allErr, closeErr } = {}) {
  const run = jest.fn((sql, params, cb) => {
    if (typeof params === 'function') cb = params;
    cb?.(runErr ?? null);
  });

  const all = jest.fn((sql, params, cb) => {
    if (typeof params === 'function') cb = params;
    cb?.(allErr ?? null, []);
  });

  const close = jest.fn((cb) => cb?.(closeErr ?? null));

  class Database {
  constructor(location, cb) {
    setImmediate(() => cb?.(openErr ?? null));
  }
  run(...args) { return run(...args); }
  all(...args) { return all(...args); }
  close(cb) { return close(cb); }
}

  return { Database };
}

async function importDbWithSqlite3Mock(sqliteMock) {
    jest.unstable_mockModule('sqlite3', () => ({
    default: { verbose: () => sqliteMock },
    verbose: () => sqliteMock,
  }));

  const { default: db } = await import('../../src/persistence/sqlite.js');
  return db;
}

test('init rejects if Database constructor returns error', async () => {
  const sqliteMock = makeSqliteMock({ openErr: new Error('open fail') });
  const db = await importDbWithSqlite3Mock(sqliteMock);

  await expect(db.init()).rejects.toThrow('open fail');
});

test('init rejects if CREATE TABLE run returns error', async () => {
  const sqliteMock = makeSqliteMock({ runErr: new Error('create fail') });
  const db = await importDbWithSqlite3Mock(sqliteMock);

  await expect(db.init()).rejects.toThrow('create fail');
});

test('getItems rejects on db.all error', async () => {
  const sqliteMock = makeSqliteMock({ allErr: new Error('all fail') });
  const db = await importDbWithSqlite3Mock(sqliteMock);

  await db.init();
  await expect(db.getItems()).rejects.toThrow('all fail');
});

test('teardown rejects on close error', async () => {
  const sqliteMock = makeSqliteMock({ closeErr: new Error('close fail') });
  const db = await importDbWithSqlite3Mock(sqliteMock);

  await db.init();
  await expect(db.teardown()).rejects.toThrow('close fail');
});
