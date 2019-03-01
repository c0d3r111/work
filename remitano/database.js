function Database() {
  "use strict";
  let coin   = -1;
  let env    = new lmdb.Env();
      env.open({
    path: home + "/storage",
    mapSize: 8*1024*1024*1024,
    maxDbs: 1,
  });
  let dbi    = env.openDbi({
    name: 'storage',
    create: true
  });

  this.pairs = ['BTC', 'BCH', 'LTC', 'ETH', 'XRP', 'USDT'];
  this.save  = Object.freeze(function(key, value) {
    let write = env.beginTxn();
        write.putString(dbi, key, value);
        write.commit();
  });
  this.get   = Object.freeze(function(key, plain) {
    if (!key) return false;
    let read  = env.beginTxn({readOnly: true});
    try {
      if (plain) {
        let data = read.getString(dbi, key);
        void read.abort();
        return data;
      }
      else {
        let data = JSON.parse(read.getString(dbi, key));
        void read.abort();
        return data;
      }
    }
    catch(e) {
      read.abort();
      return false;
    }
  });
  this.del   = Object.freeze(function(key) {
    let write = env.beginTxn();
    try {
      write.del(dbi, key);
      write.commit();
    }
    catch(err) {
      console.log("Bad key");
      write.abort();
    }
  });
  this.clear = Object.freeze(function() {
    dbi.drop();
    dbi = env.openDbi({
      name: 'storage',
      create: true
    });
  });
  this.temp  = {
    password    : "password12345",
    email       : "zixiankhoo@gmail.com",
    backup      : 4.13,
    score       : 0.300,
    lastonline  : 15,
    trades      : 30,
    sellfiat    : 13500,
    buyfiat     : 13500,
    bank        : "maybank",
    banknumber  : 23212312,
    bankname    : "John Doe",
    blacklist   : []
  };
  for (let i = 8; i < 33; i++) {
    if (i % 4 === 0) {
      coin++;
      if (this.pairs[coin]) {
        this.temp[this.pairs[coin] + 'min']    = 1.500;
        this.temp[this.pairs[coin] + 'max']    = 4.500;
        this.temp[this.pairs[coin] + 'markup'] = 0.001;
        this.temp[this.pairs[coin] + 'amt']    = 0.500;
      }
    }
    else continue;
  }
  // this.clear();
}

module.exports = {Database};
