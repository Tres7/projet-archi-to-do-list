const mod = process.env.MYSQL_HOST
    ? await import('./mysql.js')
    : await import('./sqlite.js');

export default mod.default ?? mod;
