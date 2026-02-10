// if (process.env.MYSQL_HOST) module.exports = require('./mysql');
// else module.exports = require('./sqlite');

const mod = process.env.MYSQL_HOST 
    ? await import('./mysql.js')
    : await import('./sqlite.js');

export default mod.default ?? mod;
