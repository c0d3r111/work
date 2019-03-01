process.setMaxListeners(0);

const {Database}  = require('./database');
const {Router}    = require('./router');
const {Bot}       = require('./bot');

global.http       = require('http');
global.lmdb       = require('node-lmdb');
global.fetch      = require('node-fetch');
global.puppeteer  = require('puppeteer');
global.cmd        = require('child_process');
global.threads    = require('worker_threads');
global.moment     = require('moment');
global.useragent  = require('user-agents');
global.random     = Object.freeze((length) => {
  let l = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ0123456789';
  let t = l.length - 1;
  let c = '';
  while (c.length < length) {
    c += l.charAt(Math.round(Math.random() * t));
  }
  return c;
});
global.sleep      = Object.freeze((time) => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, time);
  });
});
global.range      = Object.freeze((min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
});
global.loginlinks = [];
global.lastupdate = Date.now();
global.agent      = new useragent({deviceCategory:'desktop'});
global.home       = '/home/private';
global.db         = Object.freeze(new Database());
global.settings   = db.get('settings') || db.temp;
global.bot        = Object.freeze(new Bot());
global.router     = Object.freeze(new Router());


http.createServer(router.route).listen(8080);