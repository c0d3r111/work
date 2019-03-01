function Router() {
  "use strict";
  const getcookie     = Object.freeze(function(headers) {
    const cookie = headers.cookie;
    if (!cookie) return false;
    else {
      const c = cookie.split(' ').filter(k => k.split('=')[0] == 'remitanobot');
      if (!c.length) return false;
      else return c[0].split('=')[1];
    }
  });
  const getdata       = Object.freeze(function(headers) {
    try { return JSON.parse(headers['bot-data']) }
    catch(e) { return false }
  });
  const getsession    = Object.freeze(function(key) {
    switch (db.get('session', true)) {
      case false: return false;
      case key  : return true;
      default   : return false;
    }
  });
  const setheaders    = Object.freeze(function(res) {
    void res.setHeader('Access-Control-Allow-Origin',   '*');
    void res.setHeader('Access-Control-Allow-Methods',  '*');
    void res.setHeader('Access-Control-Allow-Headers',  '*');
    void res.setHeader('Access-Control-Allow-Credentials', true);
    return res;
  });
  const paths         = Object.freeze({
    login : Object.freeze(function(data, res) {
      switch (data.password) {
        case settings.password: {
          let key = random(128);
          void db.save('session', key);
          void res.setHeader('Set-Cookie', `remitanobot=${key};max-age=${1000*60*60*24*30};path=/;secure;httponly;samesite=strict`);
          return void res.end('1');
        }
        default: return void res.end('9');
      }
    }),
    load  : Object.freeze(function(data, res) {
      return void res.end(JSON.stringify(settings));
    }),
    save  : Object.freeze(function(data, res) {
      let coin  = -1;
      if (data.email !== settings.email) {
        setTimeout(() => {
          process.exit(1);
        }, 10000);
      }
      settings.blacklist  = data.blacklist;
      settings.score      = data.score;
      settings.password   = data.password;
      settings.lastonline = data.lastonline;
      settings.email      = data.email;
      settings.backup     = data.backup;
      settings.trades     = data.trades;
      settings.buyfiat    = data.buyfiat;
      settings.sellfiat   = data.sellfiat;
      // settings.bank       = data.bank.toLowerCase();
      // settings.bankname   = data.bankname;
      // settings.banknumber = data.banknumber;
      for (let i = 8; i < 33; i++) {
        if (i % 4 === 0) {
          coin++;
          if (db.pairs[coin]) {
            settings[db.pairs[coin] + 'min']    = data[db.pairs[coin] + 'min'];
            settings[db.pairs[coin] + 'max']    = data[db.pairs[coin] + 'max'];
            settings[db.pairs[coin] + 'markup'] = data[db.pairs[coin] + 'markup'];
            settings[db.pairs[coin] + 'amt']    = data[db.pairs[coin] + 'amt'];
          }
        }
        else continue;
      }
      void db.save('settings', JSON.stringify(settings));
      console.log(data.password);
      void res.end('1');
    }),
    coin  : Object.freeze(function(data, res) {
      return void res.end(JSON.stringify({
        tsell  : db.get(`${data.coin}sellads`) || [],
        tbuy   : db.get(`${data.coin}buyads`)  || [],
        tstats : [
          {"Best Sell": db.get(`${data.coin}sellbest`)},
          {"Best Buy" : db.get(`${data.coin}buybest`)},
          {"New Sell" : db.get(`${data.coin}sellnew`)},
          {"New Buy"  : db.get(`${data.coin}buynew`)}
        ],
        tads   : db.get(`${data.coin}ads`) || []
      }));
    }),
    msgs  : Object.freeze(function(req,  res) {
      if (req.method.toLowerCase() !== 'post') return void res.end();
      let reg  = /((?:(http|https|Http|Https|rtsp|Rtsp):\/\/(?:(?:[a-zA-Z0-9\$\-\_\.\+\!\*\'\(\)\,\;\?\&\=]|(?:\%[a-fA-F0-9]{2})){1,64}(?:\:(?:[a-zA-Z0-9\$\-\_\.\+\!\*\'\(\)\,\;\?\&\=]|(?:\%[a-fA-F0-9]{2})){1,25})?\@)?)?((?:(?:[a-zA-Z0-9][a-zA-Z0-9\-]{0,64}\.)+(?:(?:aero|arpa|asia|a[cdefgilmnoqrstuwxz])|(?:biz|b[abdefghijmnorstvwyz])|(?:cat|com|coop|c[acdfghiklmnoruvxyz])|d[ejkmoz]|(?:edu|e[cegrstu])|f[ijkmor]|(?:gov|g[abdefghilmnpqrstuwy])|h[kmnrtu]|(?:info|int|i[delmnoqrst])|(?:jobs|j[emop])|k[eghimnrwyz]|l[abcikrstuvy]|(?:mil|mobi|museum|m[acdghklmnopqrstuvwxyz])|(?:name|net|n[acefgilopruz])|(?:org|om)|(?:pro|p[aefghklmnrstwy])|qa|r[eouw]|s[abcdeghijklmnortuvyz]|(?:tel|travel|t[cdfghjklmnoprtvwz])|u[agkmsyz]|v[aceginu]|w[fs]|y[etu]|z[amw]))|(?:(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9])\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9]|0)\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9]|0)\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[0-9])))(?:\:\d{1,5})?)(\/(?:(?:[a-zA-Z0-9\;\/\?\:\@\&\=\#\~\-\.\+\!\*\'\(\)\,\_])|(?:\%[a-fA-F0-9]{2}))*)?(?:\b|$)/gi;
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', () => {
        let index     = body.indexOf('stripped-text=');
        if (index == -1) return void res.end();
        else {
          let formatted = unescape(body.slice(index));
          let links     = formatted.match(reg);
          let authlink  = links.filter(l => l.includes(settings.email));
          loginlinks.push(authlink[0]);
          console.log(loginlinks);
          return void res.end();
        }
      });
    })
  });
  
  this.route = Object.freeze(function(req, res) {
    const response = setheaders(res);
    const request  = req.url.replace(/\W+/g,'').replace('api','');
    const data     = getdata(req.headers);
    const cookie   = getsession(getcookie(req.headers));
    if (request === "messages") return void paths.msgs(req, response);
    if (!data)                  return void response.end();
    if (request === "login")    return void paths[request](data, response);
    if (!cookie)                return void response.end('9');
    if (request === "check")    return void response.end('1');
    if (request ===  "last")    return void response.end((moment((lastupdate || Date.now())).fromNow()).toString());
    if (request ===  "save")    return void paths.save(data, response);
    if (request ===  "load")    return void paths.load(data, response);
    if (request ===  "coin")    return void paths.coin(data, response);
    return void response.end();
  });
}

module.exports = {Router};