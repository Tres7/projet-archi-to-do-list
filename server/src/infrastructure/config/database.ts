import sqlite3Pkg from "sqlite3";
import fs from "fs";
import path from "path";

export type SqliteDatabase = import("sqlite3").Database;

const sqlite3 = sqlite3Pkg.verbose();

const DEFAULT_LOCATION = "/etc/todos/todo.db";

export function getSqliteLocation(): string {
  return process.env.SQLITE_DB_LOCATION || DEFAULT_LOCATION;
}

export async function createSqliteDatabase( location: string = getSqliteLocation() ): Promise<SqliteDatabase> {
  const dirName = path.dirname(location);

  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName, { recursive: true });
  }

  const db = await new Promise<SqliteDatabase>((resolve, reject) => {
    const instance = new sqlite3.Database(location, (err) => {
      if (err) return reject(err);

      if (process.env.NODE_ENV !== "test") {
        console.log(`Using sqlite database at ${location}`);
      }

      resolve(instance);
    });
  });

  await new Promise<void>((resolve, reject) => {
    db.run(
      "CREATE TABLE IF NOT EXISTS todo_items (id varchar(36), name varchar(255), completed boolean)",
      (err) => (err ? reject(err) : resolve())
    );
  });

  return db;
}

export async function closeSqliteDatabase(db: SqliteDatabase): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    db.close((err) => (err ? reject(err) : resolve()));
  });
}
