function Bot() {
  let pages        = Object.create(null);
  let ads          = Object.create(null);
  let pairs        = Object.freeze(db.pairs.map(p => p.toLowerCase()));
  let loginurl     = "https://remitano.com/btc/my/login";
  let loggedin     = false;
  let hasprices    = false;
  let debugmode    = true;
  let exchanges    = Object.freeze(["bitstamp", "kraken", "binance", "bitfinex"]);
  let tickerpairs  = Object.freeze(["btcusd", "ltcusd", "bchusd", "ethusd", "xrpusd"]);
  let ticker       = {
    kraken   : {
      btcusd: 1,
      ethusd: 1,
      ltcusd: 1,
      bchusd: 1,
      xrpusd: 1
    },
    bitstamp : {
      btcusd: 1,
      ethusd: 1,
      ltcusd: 1,
      bchusd: 1,
      xrpusd: 1
    },
    bitfinex : {
      btcusd: 1,
      ethusd: 1,
      ltcusd: 1,
      bchusd: 1,
      xrpusd: 1
    },
    binance  : {
      btcusd: 1,
      ethusd: 1,
      ltcusd: 1,
      bchusd: 1,
      xrpusd: 1
    }
  };
  let f            = parseFloat;
  let i            = parseInt;
  let browser;

  const debug         = Object.freeze((text) => {
    "use strict";
    if (debugmode) console.log(text);
  });
  const url           = Object.freeze((type, coin) => {
    "use strict";
    return `https://remitano.com/api/v1/offers?offer_type=${type}&country_code=my&coin=${coin}&offline=true&page=1&coin_currency=${coin}&per_page=1000`;
  });
  const data_getrates = Object.freeze(() => {
    "use strict";
    let queue = [];
    Object.keys(ticker).forEach(exchange => {
      tickerpairs.forEach(pair => {
        switch (exchange) {
          case 'kraken':
            return void queue.push(data_kraken(pair));
          case 'bitstamp':
            return void queue.push(data_bitstamp(pair));
          case 'bitfinex':
            return void queue.push(data_bitfinex(pair));
          case 'binance':
            return void queue.push(data_binance(pair));
          default: return;
        }
      });
    });
    Promise.all(queue).
    then(() => {
      if (!hasprices) {
        hasprices = true;
        account_action();
        data_update();
        setTimeout(() => {
          debug('24 Hour reset');
          cmd.exec('pkill chrome');
          cmd.exec('rm -rf /home/private/junk && mkdir /home/private/junk');
          setTimeout(() => process.exit(0), 1e4);
        }, 1e3*6e1*6e1*24);
      }
    }).
    catch(debug).
    finally(() => {
      setTimeout(data_getrates, 2e4);
    });
  });
  const data_kraken   = Object.freeze((coin) => {
    "use strict";
    return new Promise((resolve, reject) => {
      if (coin == 'btcusd') coin = 'xbtusd';
      fetch(`https://api.kraken.com/0/public/Ticker?pair=${coin}`).
      then(response => response.json()).
      then(response => {
        if (coin == 'xbtusd') coin = 'btcusd';
        const pair = Object.keys(response.result)[0];
        ticker.kraken[coin] = f(response.result[pair].b[0]);
        resolve();
      }).
      catch(response => {
        console.log(response);
        resolve();
      });
    });
  });
  const data_bitstamp = Object.freeze((coin) => {
    "use strict";
    return new Promise((resolve, reject) => {
      fetch(`https://www.bitstamp.com/api/v2/ticker/${coin}/`).
      then(response => response.json()).
      then(response => {
        ticker.bitstamp[coin] = f(response.last);
        resolve();
      }).
      catch(response => {
        console.log(response);
        resolve();
      });
    });
  });
  const data_bitfinex = Object.freeze((coin) => {
    "use strict";
    return new Promise((resolve, reject) => {
      if (coin == 'bchusd') coin = 'babusd';
      fetch(`https://api.bitfinex.com/v1/pubticker/${coin}/`).
      then(response => response.json()).
      then(response => {
        if (coin == 'babusd') coin = 'bchusd';
        ticker.bitfinex[coin] = f(response.last_price);
        resolve();
      }).
      catch(response => {
        console.log(response);
        resolve();
      });
    });
  });
  const data_binance  = Object.freeze((coin) => {
    "use strict";
    return new Promise((resolve, reject) => {
      if (coin == 'bchusd') coin = 'bchabcusd'
      fetch(`https://api.binance.com/api/v1/ticker/price?symbol=${coin.toUpperCase() + 'T'}`).
      then(response => response.json()).
      then(response => {
        if (coin == 'bchabcusd') coin = 'bchusd';
        ticker.binance[coin] = f(response.price);
        resolve();
      }).
      catch(response => {
        console.log(response);
        resolve();
      });
    });
  });
  const data_get      = Object.freeze(async (type, coin) => {
    "use strict";
    let page   = await browser.newPage();
    let result = false;
    try {
      await page.setViewport({width:1920,height:1080});
      await page.goto(url(type, coin), {waitUntil: "load", timeout: 2e4});
    } 
    catch(err) {
      await evidence(page);
    }
    await page.waitFor(15000);
    const data = await page.evaluate('document.body.innerText');
    try { 
      result = JSON.parse(data)
    }
    catch(err) {
      debug('Data retrieval failed.' + err);
    } 
    finally {
      await page.close();
      return result;
    }
  });
  const data_fiat     = Object.freeze((z, p, m, k, x, r, y) => {
    "use strict";
    let cp = f(z / m);
    let fp = 0;
    if (y)  fp = cp < p ? cp : data_real(p, r, m, x, k, y);
    else    fp = cp > p ? cp : data_real(p, r, m, x, k, y);
    return (fp >= k && fp <= x) ? fp : false;
  });
  const data_real     = Object.freeze((p, r, m, x, k, y) => {
    "use strict";
    let rp = f((p * r) / m);
    return (rp >= k && rp <= x) ? rp : false;
  });
  const data_price    = Object.freeze((ad, coin, buy) => {
    "use strict";
    const exchange    = ad.reference_exchange.split('_')[0];
    const bitstamp    = coin.toLowerCase() == 'usdt' ? 1 : ticker.bitstamp[coin.toLowerCase() + 'usd'];
    const currentrate = coin.toLowerCase() == 'usdt' ? 1 : ticker[exchange][coin.toLowerCase() + 'usd'];
    const offerprice  = f(ad.price);
    const filterprice = f(settings[coin.toUpperCase() + 'min']);
    const filtermax   = f(settings[coin.toUpperCase() + 'max']);
    const offerfiat   = buy ? i(ad.max_coin_price) : i(ad.min_coin_price);
    
    if (offerfiat === NaN || !offerfiat) {
      return data_real(offerprice, currentrate, bitstamp, filtermax, filterprice, buy);
    }
    else {
      return data_fiat(offerfiat, offerprice, bitstamp, filterprice, filtermax, currentrate, buy);
    }
  });
  const data_date     = Object.freeze((addate, lastonline) => {
    "use strict";
    if (settings.lastonline <= 0) return true;
    else return (Date.now() - (new Date(addate).getTime())) <= lastonline;
  });
  const data_filter   = Object.freeze((type, coin) => {
    "use strict";
    return new Promise((resolve, reject) => {
      Promise.resolve(data_get(type, coin)).
      then(data => {
        if (!data) throw 'no data';
        switch (type) {
          case 'sell' : {
            const filtered   = [];
            const lastonline = 1000 * 60 * i(settings.lastonline);
            debug("Debug count: " + data.offers.length + ' offer.');
            for (let ad of data.offers) {
              const f1 = f(ad.max_amount) >= f(settings[coin.toUpperCase() + 'amt']);
                const f2 = data_price(ad, coin);
              const f3 = settings.blacklist.includes(ad.username.toLowerCase());
              const f4 = ad.disabled === false;
              const f5 = ad.currency.toLowerCase() === "myr";
              const f6 = data_date(ad.last_online_all, lastonline);
              const f7 = f(ad.seller_speed_score) >= f(settings.score);
              const f8 = f(ad.seller_released_trades_count) >= f(settings.trades);
              if (f1 && f2 && !f3 && f4 && f5 && f6 && f7 && f8) {
                filtered.push({price: f2, user: ad.username, max: ad.max_amount});
              }
            }
            const target   = filtered.reduce((min, ad) => f(ad.price) < f(min) ? f(ad.price) : f(min), Infinity);
            const newprice = f(target - f(settings[coin.toUpperCase() + 'markup']));
            db.save(`${coin}sellbest`, target);
            db.save(`${coin}sellads`,  JSON.stringify(filtered));
            db.save(`${coin}sellnew`,  newprice);
            resolve(true);
            break;
          }
          case 'buy'  : {
            const filtered = [];
            const lastonline = 1000 * 60 * i(settings.lastonline);
            for (let ad of data.offers) {
              const f1 = f(ad.max_amount) >= f(settings[coin.toUpperCase() + 'amt']);
              const f2 = data_price(ad, coin, true);
              const f3 = settings.blacklist.includes(ad.username.toLowerCase());
              const f4 = ad.disabled === false;
              const f5 = ad.currency === "MYR";
              const f6 = data_date(ad.last_online_all, lastonline);
              const f7 = f(ad.buyer_trust_score) >= f(settings.score);
              if (f1 && f2 && !f3 && f4 && f5 && f6 && f7) {
                filtered.push({price: f2, user: ad.username, max: ad.max_amount});
              }
            }
            const target   = filtered.reduce((max, ad) => f(ad.price) > f(max) ? f(ad.price) : f(max), 0);
            const newprice = f(target + f(settings[coin.toUpperCase() + 'markup']));
            db.save(`${coin}buybest`, target);
            db.save(`${coin}buyads`,  JSON.stringify(filtered));
            db.save(`${coin}buynew`,  newprice);
            resolve(true);
            break;
          }
          default     :
            resolve(true);
            break;
        }
      }).
      catch(data => {
        debug(data);
        resolve(false);
      });
    });
  });
  const data_update   = Object.freeze(async () => {
    "use strict";
    try {
      let data_all = [];
      for (let pair of pairs) {
        data_all.push(data_filter('sell', pair));
        data_all.push(data_filter('buy',  pair));
      }
      await Promise.all(data_all);
    }
    catch(err) {
      debug("Data update error.");
    } finally {
      lastupdate = Date.now();
      setTimeout(data_update, 2e4);      
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
  
  const account_login  = Object.freeze(async () => {
    let page    = await browser.newPage();
    let maxwait = 12e2;
    try { 
      await page.setViewport({width:1920,height:1080});
      await page.goto(loginurl, {waitUntil: "load", timeout: 2e4}) 
    } 
    catch(err) { await evidence(page) }
    await page.waitFor(5e3);
    if ((await page.evaluate(() => document.querySelector('.balance') ? true : false))) {
      loggedin = true;
      lastupdate = Date.now();
      await page.close();
      return true;
    }
    else {
      try { await page.focus('input[name="email"]') }
      catch(err) { await evidence(page) }
      await typeword(page, settings.email, true);
      await evidence(page);
      await pressreturn(page);
      await pressreturn(page);
      await evidence(page);
      void debug('Waiting for login link');
      while (true) {
        await sleep(100);
        maxwait--;
        if (loginlinks.length || !maxwait) break;
      }
      if (!loginlinks.length) {
        await evidence(page);
        debug("Bot failed to login to account.");
        lastupdate = Date.now();
        await page.close();
        return false;
      }
      else {
        void debug('Received login link');
        try { await page.goto(loginlinks.pop(), {waitUntil: "load", timeout: 2e4}) } 
        catch(err) { await evidence(page) }
        try {
          await page.waitForSelector('.balance');
          loggedin = true;
          lastupdate = Date.now();
          return true;
        }
        catch(err) {
          void debug(err);
          await evidence(page);
          return false;
        }
        finally {
          await page.close();
        }
      }
    }
  });
  const account_offers = Object.freeze(async () => {
    if (!loggedin) return false;
    let alloffers = [];
    let status    = 0;
    pairs.forEach(async pair => {
      let page   = await browser.newPage();
      let offers = [];
      try {
        await page.setViewport({width:1920,height:1080});
        await page.goto(`https://remitano.com/${pair}/my/dashboard/escrow/offers`,{waitUntil: "load", timeout: 2e4});
      } 
      catch(err) { await evidence(page) }
      try {
        try { await page.waitForSelector('.offer', {timeout: 10000}) } 
        catch(err) { await evidence(page) }
        offers = await page.evaluate(() => {
          let ids   = [];
          let nodes = Array.from(document.querySelectorAll('div[class*="offer-"]'));
          nodes.forEach(node => {
            let names = node.classList.value.split(' ');
            names.forEach(name => {
              let sufix = name.split('-');
              if (sufix.length > 1) {
                if (parseInt(sufix[1]) > 100) ids.push(sufix[1]);
              }
            });
          });
          return ids;
        });
      }
      catch(err) { void debug('No offers for: ' + pair) }
      finally {
        await page.close();
        alloffers.push({
          offers : offers,
          pair   : pair
        });
        status += 1;
        lastupdate = Date.now();
      }
    });
    while (status < pairs.length) {
      await sleep(100);
    }
    void db.save('myoffers', JSON.stringify(alloffers));
    for (let pair of alloffers) {
      for (let offer of pair.offers) {
        await sleep(range(20e3,30e3));
        if (!pages[offer]) {
          debug("Total workers: " + Object.keys(pages).length);
          pages[offer] = {
            worker   : new threads.Worker(home + "/browse.js"),
            channels : new threads.MessageChannel()
          };
          pages[offer].worker.postMessage({port: pages[offer].channels.port1}, [pages[offer].channels.port1]);
          pages[offer].worker.on('exit', (err) => {
            try { 
              pages[offer].worker.terminate();
              pages[offer].channels.port1.close();
              pages[offer].channels.port2.close();
            }
            catch(err) {}
            delete pages[offer];
          });
          pages[offer].worker.on('error', (err) => {
            try { 
              pages[offer].worker.terminate();
              pages[offer].channels.port1.close();
              pages[offer].channels.port2.close();
            }
            catch(err) {}
            delete pages[offer];
          });
          pages[offer].channels.port2.once('message', data => {
            pages[offer].channels.port2.on('message', data => {
              if (!data.message) return;
              switch (data.message) {
                case "link"   : {
                  let link = false;
                  if (loginlinks.length) link = loginlinks.pop();
                  pages[offer].worker.postMessage({link: link, message: 'link'});
                  return;
                }
                case "price"  : {
                  pages[offer].worker.postMessage({
                    message : 'price',
                    sell    : db.get(`${data.pair.toLowerCase()}sellnew`),
                    buy     : db.get(`${data.pair.toLowerCase()}buynew`),
                    backup  : settings.backup
                  });
                  return;
                }
                case "update" : {
                  lastupdate = data.update;
                  return;
                }
                case "offer"  : {
                  if (!ads[data.pair + 'ads']) ads[data.pair + 'ads'] = [];
                  ads[data.pair + 'ads'] = ads[data.pair + 'ads'].filter(offer => offer.offer !== data.offer);
                  ads[data.pair + 'ads'].push({
                    offer: data.offer,
                    price: data.price,
                    type : data.type
                  });
                  Object.keys(ads).forEach(pair => db.save(pair, JSON.stringify(ads[pair])));
                  return;
                } 
                default: return;
              }
            });
            pages[offer].worker.postMessage({
              message  : 'launch',
              offer    : offer, 
              pair     : pair.pair,
              url      : loginurl,
              pairs    : pairs,
              email    : settings.email
            });
          });
        }
      }
    }
    return true;
  });
  const account_action = Object.freeze(async () => {
    try {
      await account_login();
      await account_offers();
    } 
    catch(err) {
      debug(err);
    } 
    finally {
      await sleep(5e3);
      return account_action();
    }
  });
  
  (async () => {
    browser = await puppeteer.launch({
      args: [ 
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--window-position=0,0",
        "--ignore-certifcate-errors",
        `--user-agent=${agent.random().toString()}`
      ],
      headless: true,
      ignoreHTTPSErrors: true
    });
    data_getrates();
  })();
}

module.exports = {Bot};

