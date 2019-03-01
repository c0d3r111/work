process.setMaxListeners(0);
(async () => {
  "use strict";
  
  const { 
    parentPort, 
    isMainThread
  }      = require("worker_threads");
  
  if (isMainThread) process.exit(1); 
  
  const fetch      = require('node-fetch');
  const fs         = require('fs-extra');
  const puppeteer  = require('puppeteer');
  const moment     = require('moment');
  const useragent  = require('user-agents');
  const debug      = Object.freeze((text) => {
    if (debugmode) console.log(text);
  });
  const random     = Object.freeze((length) => {
    let l = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ0123456789';
    let t = l.length - 1;
    let c = '';
    while (c.length < length) {
      c += l.charAt(Math.round(Math.random() * t));
    }
    return c;
  });
  const sleep      = Object.freeze((time) => {
    return new Promise((resolve, reject) => {
      setTimeout(resolve, time);
    });
  });
  const range      = Object.freeze((min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  });
  const agent      = new useragent({deviceCategory:'desktop'});
  const tempdir    = await fs.ensureDir("/home/private/junk/" + random(24));
  const browser    = await puppeteer.launch({
    args: [ 
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--window-position=0,0",
      "--ignore-certifcate-errors",
      `--user-agent=${agent.random().toString()}`
    ],
    headless: true,
    ignoreHTTPSErrors: true,
    userDataDir: tempdir
  });
  
  let page         = await browser.newPage();
  let loggedin     = false;
  let debugmode    = true; 
  let port;
  let offer;
  let pair;
  let loginurl;
  let loginlink;
  let pairs;
  let email;
  let backup;
  let sellprice;
  let buyprice;
  let ticker;

  page.on         ('error', (err) => {
    port.postMessage({message: 'update', update: Date.now()});
    process.exit(1);
  });
  parentPort.once ('message', data => {
    if (data.port) {
      port = data.port;
      parentPort.on('message', data => {
        if (!data.message) return;
        switch (data.message) {
          case 'launch': {
            offer    = data.offer;
            pair     = data.pair;
            pairs    = data.pairs;
            loginurl = data.url;
            email    = data.email;
            ticker   = setInterval(() => port.postMessage({message: 'price', pair: pair}), 1e3);
            void action().catch((err) => {
              port.postMessage({message: 'update', update: Date.now()});
              process.exit(1);
            });
            return;
          }
          case "link"  : {
            loginlink = data.link;
            return;
          }
          case "price" : {
            sellprice = data.sell;
            buyprice  = data.buy;
            backup    = data.backup;
            return;
          }
          default: break;
        }
      });
      port.postMessage("active");
    }
  });
  
  const presskey      = Object.freeze(async (page, times, key) => {
    for (let i = 0; i < times; i++) {
      await page.keyboard.down(key);
      await page.keyboard.up(key);
    }
    return;
  });
  const pressreturn   = Object.freeze(async (page) => {
    await page.keyboard.down('Shift');
    await page.keyboard.down('Enter');
    await page.keyboard.up('Enter');
    await page.keyboard.up('Shift');
    return;
  });
  const typeword      = Object.freeze(async (page, word, tab) => {
    for (let letter of word.split('')) {
      await presskey(1, 'Shift');
      await page.keyboard.sendCharacter(letter);
    }
    if (tab) {
      await presskey(page, 1, "Tab");
      await sleep(range(900,2156));
    }
    return;
  });
  const typemessage   = Object.freeze(async (page, message) => {
    const msg = message.split("");
    for (const i of msg) {
      if (i == "\n" || i == '\t' || i == '\r') {
        await pressreturn(page);
      }
      else if (i == " ") {
        await presskey(page, 1, 'Space');
      }
      else {
        await page.keyboard.sendCharacter(i);
      }
    }
    return;
  });
  const evidence      = Object.freeze(async (page) => {
    await page.screenshot({
      path: "/home/public/app/evidence.jpeg",
      fullPage: true,
      type: 'jpeg',
      quality: 80
    });
    return;
  });
  const login         = Object.freeze(async () => {
    if (!port || !offer || !pair || !loginurl || !sellprice) return;
    debug("Working on offer: " + offer + "for crypto: " + pair);
    let maxwait = 12e2;
    await page.setViewport({width:1920,height:1080});
    try {await page.goto(loginurl, {waitUntil: "load", timeout: 1e4})}
    catch(err) {await evidence(page)}
    await page.waitFor(5e3);
    if ((await page.evaluate(() => document.querySelector('.balance') ? true : false))) {
      loggedin = true;
      port.postMessage({message: 'update', update: Date.now()});
      return true;
    }
    else {
      await page.focus('input[name="email"]');
      await typeword(page, email, true);
      await evidence(page);
      await pressreturn(page);
      await pressreturn(page);
      await evidence(page);
      port.postMessage({message: 'link'});
      while (true) {
        await sleep(1e2);
        maxwait--;
        if (loginlink || !maxwait) break;
      }
      if (!loginlink) {
        await evidence(page);
        await page.close();
        await browser.close();
        debug("Bot failed to login to account.");
        port.postMessage({message: 'update', update: Date.now()});
        process.exit(1);
        return false;
      }
      else {
        try { await page.goto(loginlink, {waitUntil: "load", timeout: 2e4}) } 
        catch(err) { await evidence(page) }
        try {
          await page.waitForSelector('.balance');
          loggedin = true;
          port.postMessage({message: 'update', update: Date.now()});
        }
        catch(err) {
          void debug(err);
          await evidence(page);
        }
        finally {
          loginlink = false;
          return loggedin;
        }
      }
    }
  });
  const update        = Object.freeze(async () => {
    void debug('working on ' + pair + "offer " + offer);
    try { await page.goto(`https://remitano.com/${pair}/my/offers/${offer}/edit`, {timeout: 1e4}) } 
    catch(err) { await evidence(page) }
    await page.waitFor(1.5e4);
    await evidence(page);
    void debug('Checking offer type');
    let valid     = await page.evaluate(() => {
      let element = document.querySelector('#edit_offer > div > div > div > div > div > span:nth-child(1)');
      return element ? false : true;
    });
    if (!valid) {
      await page.close();
      await browser.close();
      debug("Offer does not exist.");
      port.postMessage({message: 'update', update: Date.now()});
      process.exit(1);
    }
    let offertype = await page.evaluate(() => {
      var sell = document.querySelectorAll('.offer-details .offer-type-sell.btn.active').length ? 'sell' : false;
      var buy  = document.querySelectorAll('.offer-details .offer-type-buy.btn.active').length ? 'buy' : false;
      return sell || buy;
    });
    let price     = offertype == 'sell' ? sellprice : buyprice;
    void debug('Offer type: ' + offertype);
    if (price < 1 || price > 10000) {
      void debug('abnormal price');
      price = backup;
    }
    await evidence(page);
    void debug('Entering price');
    await page.evaluate(() => {
      document.querySelectorAll('.btn-change')[0].click();
      return true;
    });
    await evidence(page);
    await page.evaluate(() => {
      document.querySelector('input[name="price"]').focus();
      document.querySelector('input[name="price"]').click();
      document.querySelector('input[name="price"]').click();
    });
    await evidence(page);
    await presskey(page, 20, 'ArrowRight');
    await presskey(page, 20, 'Backspace');
    await evidence(page);
    await typeword(page, price.toString(), true);
    await evidence(page);
    await page.evaluate(() => {
      document.querySelector('button[type="submit"]').click();
      document.querySelector('button[type="submit"]').click();
      return true;
    });
    await evidence(page);
    void debug('Waiting for confirmation');
    try { await page.waitForSelector('.flash-messages') } 
    catch(err) {
      void debug('check evidence');
      await evidence(page);
    }
    port.postMessage({message: 'offer', offer: offer, price: price, type: offertype, pair: pair});
    port.postMessage({message: 'update', update: Date.now()});
    return;
  });
  const action        = Object.freeze(async () => {
    if (!loggedin)  await login().catch(debug);
    if (!!loggedin) await update().catch(debug);
    await sleep(range(1e3, 1e4));
    return action();
  });
})();