(function () {
  'use strict';

  // --- 100% loading loop fix: bypass HotUpdate scene on web/offline builds ---
  window.hallName = 'LobbyMain';
  window.game_ver = window.game_ver || 'v4.0-offline';
  try {
    if (window._CCSettings) {
      window._CCSettings.launchScene = 'db://assets/Scene/main/LobbyMain.fire';
      window._CCSettings.orientation = 'landscape';
      window._CCSettings.remoteBundles = [];
      window._CCSettings.server = '';
    }
    localStorage.removeItem('HotUpdateSearchPaths');
    localStorage.removeItem('gameVersion');
    localStorage.setItem('ym_disable_hotupdate', '1');
  } catch (e) {}

  function installSceneLoopGuard() {
    if (!window.cc || !cc.director || cc.director.__ymLoopGuardInstalled) return false;
    cc.director.__ymLoopGuardInstalled = true;
    var realLoadScene = cc.director.loadScene.bind(cc.director);
    var realPreloadScene = cc.director.preloadScene ? cc.director.preloadScene.bind(cc.director) : null;
    cc.director.loadScene = function (sceneName) {
      try {
        var cur = cc.director.getScene && cc.director.getScene();
        var curName = cur && cur.name;
        var requestedScene = String(sceneName || '');
        if (/HotUpdate/i.test(requestedScene)) {
          console.warn('[YM Offline Patch] blocked HotUpdate reload loop, loading LobbyMain instead');
          if (curName === 'LobbyMain') return;
          sceneName = 'LobbyMain';
        }
      } catch (e) {}
      return realLoadScene.apply(this, arguments.length ? [sceneName].concat(Array.prototype.slice.call(arguments, 1)) : arguments);
    };
    if (realPreloadScene) {
      cc.director.preloadScene = function (sceneName) {
        if (/HotUpdate/i.test(String(sceneName || ''))) sceneName = 'LobbyMain';
        return realPreloadScene.apply(this, [sceneName].concat(Array.prototype.slice.call(arguments, 1)));
      };
    }
    if (cc.game && !cc.game.__ymRestartGuardInstalled) {
      cc.game.__ymRestartGuardInstalled = true;
      cc.game.restart = function () {
        console.warn('[YM Offline Patch] blocked cc.game.restart; returning to LobbyMain');
        try { cc.director.loadScene('LobbyMain'); } catch (e) {}
      };
    }
    return true;
  }
  var guardTimer = setInterval(function () { if (installSceneLoopGuard()) clearInterval(guardTimer); }, 50);
  setTimeout(function () { clearInterval(guardTimer); installSceneLoopGuard(); }, 15000);


  var OFFLINE_START_BALANCE = 100000;
  var PLAYER_ID = 18698;
  var ACCOUNT = 'guest18698';
  var PASSWORD = '123456';

  window.YM_OFFLINE_MODE = true;
  window.AfricanBuffalo_LOBBYNET = window.AfricanBuffalo_LOBBYNET || { disconnect: function () {} };
  window.GoldenCentury_LOBBYNET = window.GoldenCentury_LOBBYNET || { disconnect: function () {} };
  window.__ymOffline = window.__ymOffline || {
    lobbyBalance: OFFLINE_START_BALANCE,
    gameBalance: OFFLINE_START_BALANCE,
    spinNo: 0,
    freeSpins: 0,
    lastBet: 500
  };
  window.__ymOffline.lobbyBalance = OFFLINE_START_BALANCE;
  window.__ymOffline.gameBalance = OFFLINE_START_BALANCE;
  window.__ymOffline.spinNo = 0;
  window.__ymOffline.freeSpins = 0;

  function safeJsonParse(v) {
    if (typeof v !== 'string') return v || {};
    try { return JSON.parse(v); } catch (e) { return {}; }
  }
  function jsonText(obj) { return JSON.stringify(obj); }
  function nextTick(fn, delay) { setTimeout(fn, delay == null ? 20 : delay); }

  try {
    localStorage.setItem('userData', JSON.stringify({ account: ACCOUNT, password: PASSWORD }));
    localStorage.setItem('ym_offline_start_balance', String(OFFLINE_START_BALANCE));
  } catch (e) {}

  function roomList(total) {
    var out = [];
    for (var i = 0; i < (total || 120); i++) {
      out.push({ playerId: i % 7 === 0 ? -1 : i, roleId: i % 4 + 1 });
    }
    return out;
  }

  function makeServerInfo(gameId, port) {
    var normal = [];
    for (var i = 0; i < 12; i++) {
      normal.push({
        ip: '127.0.0.1',
        prot: ':' + (port || (15000 + (gameId % 100))),
        entryCoin: 0,
        Server: 'Offline Room ' + (i + 1),
        serverName: 'Offline Room ' + (i + 1),
        bet: 500
      });
    }
    return { GameId: gameId, gameid: String(gameId), serverInfo: { normal: normal, high: [], vip: [] } };
  }

  function makeServerList() {
    // Advertise only the game bundles included in this offline archive.
    var ids = [120, 124];
    var gameInfo = [];
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var port = id === 120 ? 15020 : (id === 124 ? 15024 : 15000 + (id % 100));
      gameInfo.push(makeServerInfo(id, port));
    }
    return {
      GameInfo: gameInfo,
      gameList: ids.map(function (id) { return { gameid: String(id), GameId: id }; })
    };
  }

  function interceptedResponse(url, method, body) {
    var u = String(url || '');
    if (/checkVersion/i.test(u)) return { code: 1, msg: 'offline ok', data: { version: 'offline' } };
    if (/weixinLogin/i.test(u)) return { code: 1, msg: 'success', data: { account: ACCOUNT, password: PASSWORD } };
    if (/admin\/api\/imgs/i.test(u)) return { '1': '', '2': '', '3': '', '4': '', '5': '' };
    if (/api\/User\/getVipData/i.test(u)) return {
      code: 1,
      msg: 'success',
      data: {
        vip_list: [
          { id: 1, level: 1, up_bet: 1, up_gold: 0, week_gold: 0, month_gold: 0, check_bonus: 0 },
          { id: 2, level: 2, up_bet: 50000, up_gold: 0, week_gold: 0, month_gold: 0, check_bonus: 0 },
          { id: 3, level: 3, up_bet: 100000, up_gold: 0, week_gold: 0, month_gold: 0, check_bonus: 0 },
          { id: 4, level: 4, up_bet: 500000, up_gold: 0, week_gold: 0, month_gold: 0, check_bonus: 0 }
        ]
      }
    };
    if (/api\/config\/getPayList/i.test(u)) return { code: 1, msg: 'success', data: [] };
    if (/api\/kefu\/wlists/i.test(u)) return { code: 1, msg: 'success', data: [] };
    if (/getRoomInfo/i.test(u)) return { code: 1, data: roomList(120) };
    if (/chooseRoom/i.test(u)) return { code: 1, data: roomList(120) };
    if (/shark777mm\.com|buffalo996\.com|127\.0\.0\.1:13/i.test(u)) return { code: 1, msg: 'offline ok', data: [] };
    return null;
  }

  var RealXHR = window.XMLHttpRequest;
  if (RealXHR) {
    function OfflineXHR() {
      this._xhr = new RealXHR();
      this._headers = {};
      this._listeners = {};
      this.readyState = 0;
      this.status = 0;
      this.statusText = '';
      this.responseText = '';
      this.response = '';
      this.responseURL = '';
      this.responseType = '';
      this.timeout = 0;
      this.withCredentials = false;
      var self = this;
      this._xhr.onreadystatechange = function () {
        copyXhr(self);
        if (typeof self.onreadystatechange === 'function') self.onreadystatechange.call(self);
        self._dispatch('readystatechange');
      };
      this._xhr.onload = function () {
        copyXhr(self);
        if (typeof self.onload === 'function') self.onload.call(self);
        self._dispatch('load');
      };
      this._xhr.onerror = function () {
        copyXhr(self);
        if (typeof self.onerror === 'function') self.onerror.call(self);
        self._dispatch('error');
      };
      this._xhr.ontimeout = function () {
        copyXhr(self);
        if (typeof self.ontimeout === 'function') self.ontimeout.call(self);
        self._dispatch('timeout');
      };
    }
    function copyXhr(self) {
      try { self.readyState = self._xhr.readyState; } catch (e) {}
      try { self.status = self._xhr.status; } catch (e) {}
      try { self.statusText = self._xhr.statusText; } catch (e) {}
      try { self.responseText = self._xhr.responseText; } catch (e) {}
      try { self.response = self._xhr.response; } catch (e) {}
      try { self.responseURL = self._xhr.responseURL; } catch (e) {}
    }
    OfflineXHR.prototype.open = function (method, url, async, user, password) {
      this._method = method || 'GET';
      this._url = url;
      this._async = async !== false;
      this.readyState = 1;
      if (typeof this.onreadystatechange === 'function') this.onreadystatechange.call(this);
      this._dispatch('readystatechange');
      if (!interceptedResponse(url, method, null)) this._xhr.open(method, url, async, user, password);
    };
    OfflineXHR.prototype.setRequestHeader = function (name, value) {
      this._headers[name] = value;
      if (!interceptedResponse(this._url, this._method, null)) this._xhr.setRequestHeader(name, value);
    };
    OfflineXHR.prototype.getResponseHeader = function (name) { return name && name.toLowerCase() === 'content-type' ? 'application/json' : null; };
    OfflineXHR.prototype.getAllResponseHeaders = function () { return 'content-type: application/json\r\n'; };
    OfflineXHR.prototype.overrideMimeType = function (mime) { if (this._xhr.overrideMimeType) this._xhr.overrideMimeType(mime); };
    OfflineXHR.prototype.abort = function () { try { this._xhr.abort(); } catch (e) {} };
    OfflineXHR.prototype.addEventListener = function (type, cb) {
      (this._listeners[type] = this._listeners[type] || []).push(cb);
    };
    OfflineXHR.prototype.removeEventListener = function (type, cb) {
      var arr = this._listeners[type] || [];
      this._listeners[type] = arr.filter(function (x) { return x !== cb; });
    };
    OfflineXHR.prototype._dispatch = function (type) {
      var arr = this._listeners[type] || [];
      var evt = { type: type, target: this, currentTarget: this };
      arr.slice().forEach(function (cb) { try { cb.call(this, evt); } catch (e) {} }, this);
    };
    OfflineXHR.prototype.send = function (body) {
      var fake = interceptedResponse(this._url, this._method, body);
      var self = this;
      if (fake) {
        nextTick(function () {
          var text = jsonText(fake);
          self.readyState = 4;
          self.status = 200;
          self.statusText = 'OK';
          self.responseURL = String(self._url || '');
          self.responseText = text;
          self.response = self.responseType === 'json' ? fake : text;
          if (typeof self.onreadystatechange === 'function') self.onreadystatechange.call(self);
          self._dispatch('readystatechange');
          if (typeof self.onload === 'function') self.onload.call(self);
          self._dispatch('load');
          self._dispatch('loadend');
        });
      } else {
        this._xhr.responseType = this.responseType;
        this._xhr.timeout = this.timeout || 0;
        this._xhr.withCredentials = !!this.withCredentials;
        this._xhr.send(body);
      }
    };
    window.XMLHttpRequest = OfflineXHR;
  }

  function makeCards(kind, spinNo) {
    var cards = [];
    for (var i = 0; i < 20; i++) cards.push((i * 7 + spinNo * 3) % 11);
    if (kind === 'free') {
      cards[0] = 12; cards[6] = 12; cards[12] = 12;
    } else if (kind === 'win5') {
      cards[0] = 3; cards[1] = 3; cards[2] = 3; cards[3] = 3; cards[4] = 3;
    } else if (kind === 'win3') {
      cards[0] = 5; cards[1] = 5; cards[2] = 5;
    }
    return cards;
  }
  function winCardsFor(lines) {
    var a = [];
    for (var i = 0; i < 20; i++) a.push(0);
    lines.forEach(function (line) { line.forEach(function (idx) { a[idx] = 1; }); });
    return a;
  }
  function makeLotteryResult(data) {
    var st = window.__ymOffline;
    data = safeJsonParse(data);
    var rawBet = Array.isArray(data.nBetList) ? Number(data.nBetList[0]) : Number(data.bet || st.lastBet || 500);
    var bet = isFinite(rawBet) && rawBet > 0 ? rawBet : 500;
    st.lastBet = bet;
    st.spinNo += 1;

    var isFree = st.freeSpins > 0;
    if (!isFree && st.gameBalance < bet) st.gameBalance = OFFLINE_START_BALANCE;
    if (!isFree) st.gameBalance -= bet;

    var kind = 'lose', win = 0, freeFlag = false, addFree = 0, lines = [];
    if (isFree) {
      st.freeSpins -= 1;
      kind = st.spinNo % 2 === 0 ? 'win3' : 'lose';
      if (kind === 'win3') { win = bet * 3; lines = [[0, 1, 2]]; }
    } else if (st.spinNo % 6 === 0) {
      kind = 'free'; freeFlag = true; addFree = 8; st.freeSpins = addFree;
    } else if (st.spinNo % 3 === 0) {
      kind = 'win5'; win = bet * 5; lines = [[0, 1, 2, 3, 4]];
    } else if (st.spinNo % 2 === 0) {
      kind = 'win3'; win = bet * 2; lines = [[0, 1, 2]];
    }
    st.gameBalance += win;

    return {
      ResultCode: 1,
      ResultData: {
        userscore: st.gameBalance,
        winscore: win,
        freeCount: st.freeSpins,
        viewarray: {
          nHandCards: makeCards(kind, st.spinNo),
          freeAnim: [0, 1, 2, 3, 4],
          nWinCards: winCardsFor(lines),
          nWinLinesDetail: lines,
          fMultiple: win > 0 && bet > 0 ? win / bet : 0,
          getFreeTime: { bFlag: freeFlag, nFreeTime: addFree },
          freeSpCardPos: freeFlag ? [0, 6, 12] : [],
          coinCardList: []
        }
      }
    };
  }

  function loginPayload() {
    return {
      resultid: 1,
      msg: 'success',
      Obj: {
        id: PLAYER_ID,
        account: ACCOUNT,
        password: PASSWORD,
        nickname: 'Offline Player',
        score: OFFLINE_START_BALANCE,
        diamond: 0,
        giftTicket: 0,
        headimgurl: '01',
        sex: 1,
        sign: 'offline_sign_100000',
        ChannelType: 'offline',
        proplist: { '1': 0 },
        official: 0,
        phoneNo: '',
        userLevel: 3,
        userExp: 0,
        upExp: 1,
        win_pool: 8888888
      },
      win_pool: 8888888
    };
  }
  function gameLoginPayload() {
    window.__ymOffline.gameBalance = OFFLINE_START_BALANCE;
    window.__ymOffline.freeSpins = 0;
    window.__ymOffline.spinNo = 0;
    return {
      resultid: 1,
      msg: 'success',
      Obj: {
        nGamblingWinPool: 8888888,
        nGamblingWinPool1: 8888888,
        gameBet: 500,
        userscore: OFFLINE_START_BALANCE
      }
    };
  }

  function MockSocket(url) {
    this.url = url || 'offline://local';
    this.connected = false;
    this.$events = {};
    var self = this;
    nextTick(function () {
      self.connected = true;
      self._fire('connect', true);
      self._fire('connected', true);
    }, 50);
  }
  MockSocket.prototype.on = function (name, cb) {
    (this.$events[name] = this.$events[name] || []).push(cb);
    if ((name === 'connected' || name === 'connect') && this.connected) {
      var self = this;
      nextTick(function () { cb.call(self, true); }, 1);
    }
    return this;
  };
  MockSocket.prototype.removeListen = function (name) { delete this.$events[name]; return this; };
  MockSocket.prototype.removeAllListeners = function (name) { if (name) delete this.$events[name]; else this.$events = {}; return this; };
  MockSocket.prototype.disconnect = function () {
    this.connected = false;
    // Offline mode: do NOT fire the game's disconnect handlers.
    // Several Lobby/game handlers respond by showing Canvas/Loading at 100% forever.
    if (window.__ymHideLobbyLoading) { try { window.__ymHideLobbyLoading(); } catch (e) {} }
    return this;
  };
  MockSocket.prototype.close = MockSocket.prototype.disconnect;
  MockSocket.prototype._fire = function (name, payload) {
    var arr = (this.$events[name] || []).slice();
    var self = this;
    arr.forEach(function (cb) { try { cb.call(self, payload); } catch (e) { console.error('[YM offline callback]', name, e); } });
  };
  MockSocket.prototype.emit = function (name, data) {
    var self = this;
    switch (name) {
      case 'login':
      case 'loginNoPassword':
        nextTick(function () {
          self._fire('loginResult', loginPayload());
          var sl = makeServerList();
          self._fire('ServerListResult', sl);
          self._fire('RedisWinPool', { code: 1, data: 8888888 });
        }, 60);
        break;
      case 'getBankScore':
        nextTick(function () { self._fire('getBankScoreResult', { ResultCode: 1, resultid: 1, bankScore: 0, score: window.__ymOffline.lobbyBalance }); }, 30);
        break;
      case 'getBank':
        nextTick(function () { self._fire('getBankResult', { ResultCode: 1, Result: 1, data: [] }); }, 30);
        break;
      case 'getMsgToUser':
        nextTick(function () { self._fire('getMsgToUserResult', { ResultCode: 0, data: { chatList: [] } }); }, 30);
        break;
      case 'updateCharLog':
        nextTick(function () { self._fire('updateCharLogResult', { ResultCode: 1, Result: 1 }); }, 10);
        break;
      case 'LoginGame':
        nextTick(function () { self._fire('loginGameResult', gameLoginPayload()); }, 60);
        break;
      case 'LoginfreeCount':
        nextTick(function () { self._fire('LoginfreeCountResult', { ResultCode: 1, freeCount: 0, ResultData: { freeCount: 0 } }); }, 30);
        break;
      case 'lottery':
        nextTick(function () { self._fire('lotteryResult', makeLotteryResult(data)); }, 130);
        break;
      case 'heartbeat':
        nextTick(function () { self._fire('heartbeatResult', { code: 1 }); }, 10);
        break;
      case 'cleanLineOut':
      case 'roomOut':
      case 'leaveRoom':
        nextTick(function () { self._fire(name + 'Result', { code: 1, resultid: 1 }); }, 10);
        break;
      default:
        nextTick(function () { self._fire(name + 'Result', { code: 1, resultid: 1, Obj: {} }); }, 10);
    }
    return this;
  };

  function offlineConnect(url) { return new MockSocket(url); }
  offlineConnect.connect = offlineConnect;
  offlineConnect.Socket = MockSocket;

  function wrapIo(realIo) {
    if (!realIo || realIo.__ymOfflineWrapped) return realIo;
    function ioWrapper(url, opts) { return offlineConnect(url, opts); }
    for (var k in realIo) { try { ioWrapper[k] = realIo[k]; } catch (e) {} }
    ioWrapper.connect = function (url, opts) { return offlineConnect(url, opts); };
    ioWrapper.__ymOfflineWrapped = true;
    ioWrapper.Socket = MockSocket;
    return ioWrapper;
  }

  try {
    var savedIo;
    Object.defineProperty(window, 'io', {
      configurable: true,
      enumerable: true,
      get: function () { return savedIo || offlineConnect; },
      set: function (v) { savedIo = wrapIo(v); }
    });
  } catch (e) {
    window.io = offlineConnect;
  }
  var patchTimer = setInterval(function () {
    if (window.io && !window.io.__ymOfflineWrapped) window.io = wrapIo(window.io);
  }, 100);
  setTimeout(function () { clearInterval(patchTimer); }, 15000);

  console.log('[YM Offline Patch] Local balance/server fallback loaded. Entry balance = ' + OFFLINE_START_BALANCE);
})();


/*
 * YM 100% Loading Loop FINAL Guard v3
 * Fixes the exact case: LobbyMain appears briefly, then the game returns to Loading 100%.
 * Root causes found in the bundled code:
 *  - HotUpdateMain can still preload/load window.hallName again.
 *  - GameUpdate / hot-update paths can call cc.game.restart().
 *  - Socket disconnect handlers set Canvas/Loading.active = true.
 */
(function () {
  'use strict';
  if (window.__ymLoopFinalGuardV3) return;
  window.__ymLoopFinalGuardV3 = true;
  window.YM_OFFLINE_MODE = true;
  window.hallName = 'LobbyMain';
  window.game_ver = window.game_ver || 'v4.0-offline-final';

  function isLobbyName(name) {
    return String(name || '').replace(/^db:\/\/assets\/Scene\/main\//, '').replace(/\.fire$/, '') === 'LobbyMain';
  }
  function isBlockedSceneName(name) {
    var s = String(name || '');
    return !s || /HotUpdate|Loading|UpdateMain|Update/i.test(s);
  }
  function currentSceneName() {
    try {
      if (!window.cc || !cc.director || !cc.director.getScene) return '';
      var sc = cc.director.getScene();
      return sc && sc.name || '';
    } catch (e) { return ''; }
  }
  function safeFind(path, root) {
    try { return window.cc && cc.find ? cc.find(path, root) : null; } catch (e) { return null; }
  }
  function safeComp(node, type) {
    try { return node && node.getComponent ? node.getComponent(type) : null; } catch (e) { return null; }
  }
  function setNodeActive(path, active) {
    var n = safeFind(path);
    if (n) n.active = !!active;
    return n;
  }

  window.__ymHideLobbyLoading = function () {
    try {
      var splash = document.getElementById('splash');
      if (splash) splash.style.display = 'none';
      var progressBar = document.querySelector('#splash .progress-bar span');
      if (progressBar) progressBar.style.width = '0%';
    } catch (e) {}

    if (!window.cc || !cc.find) return;
    var scene = currentSceneName();
    // Only force-hide the Lobby overlay while we are in/returning to LobbyMain.
    // This avoids breaking normal in-game loading screens.
    if (scene && scene !== 'LobbyMain') return;

    var loading = safeFind('Canvas/Loading');
    if (loading) loading.active = false;

    var pb = safeFind('Canvas/Loading/pb_Loading');
    var prog = safeComp(pb, cc.ProgressBar || 'cc.ProgressBar');
    if (prog) prog.progress = 0;

    var txt = safeFind('Canvas/Loading/pb_Loading/pb_Loading_txt') || safeFind('Canvas/Loading/pb_Loading_txt');
    var lab = safeComp(txt, cc.Label || 'cc.Label');
    if (lab) lab.string = '0%';

    var waiting = safeFind('Canvas/com_waiting');
    if (waiting) waiting.active = false;

    var updateBox = safeFind('Canvas/com_UpdateMessageBox');
    if (updateBox) updateBox.active = false;
  };

  // Keep settings pinned before boot and after any delayed script rewrites them.
  function pinSettings() {
    try {
      if (window._CCSettings) {
        window._CCSettings.launchScene = 'db://assets/Scene/main/LobbyMain.fire';
        window._CCSettings.hasStartSceneBundle = false;
        window._CCSettings.remoteBundles = [];
        window._CCSettings.subpackages = [];
        window._CCSettings.server = '';
      }
      try { localStorage.removeItem('HotUpdateSearchPaths'); } catch (e) {}
      try { localStorage.removeItem('gameVersion'); } catch (e) {}
      try { localStorage.setItem('ym_disable_hotupdate', '1'); } catch (e) {}
    } catch (e) {}
  }
  pinSettings();
  var pinTimer = setInterval(pinSettings, 200);
  setTimeout(function () { clearInterval(pinTimer); }, 20000);

  function installDirectorGuard() {
    if (!window.cc || !cc.director || cc.director.__ymLoopFinalGuardV3) return false;
    cc.director.__ymLoopFinalGuardV3 = true;

    var realLoadScene = cc.director.loadScene && cc.director.loadScene.bind(cc.director);
    var realPreloadScene = cc.director.preloadScene && cc.director.preloadScene.bind(cc.director);

    if (realLoadScene) {
      cc.director.loadScene = function (sceneName) {
        var args = Array.prototype.slice.call(arguments);
        var requested = sceneName;
        if (isBlockedSceneName(requested)) {
          console.warn('[YM FINAL Guard] Blocked scene request:', requested, '-> LobbyMain');
          args[0] = 'LobbyMain';
        }
        if (isLobbyName(args[0]) && currentSceneName() === 'LobbyMain') {
          window.__ymHideLobbyLoading();
          for (var i = 1; i < args.length; i++) {
            if (typeof args[i] === 'function') {
              try { setTimeout(args[i], 0); } catch (e) {}
              break;
            }
          }
          return null;
        }
        return realLoadScene.apply(cc.director, args);
      };
    }

    if (realPreloadScene) {
      cc.director.preloadScene = function (sceneName, onProgress, onLoaded) {
        var requested = sceneName;
        if (isBlockedSceneName(requested)) {
          console.warn('[YM FINAL Guard] Blocked preload request:', requested, '-> LobbyMain');
          sceneName = 'LobbyMain';
        }
        if (isLobbyName(sceneName) && currentSceneName() === 'LobbyMain') {
          window.__ymHideLobbyLoading();
          if (typeof onProgress === 'function') {
            try { onProgress(1, 1, null); } catch (e) {}
          }
          if (typeof onLoaded === 'function') {
            try { setTimeout(function () { onLoaded(null); }, 0); } catch (e) {}
          }
          return null;
        }
        var wrappedLoaded = function () {
          if (isLobbyName(sceneName)) setTimeout(window.__ymHideLobbyLoading, 0);
          if (typeof onLoaded === 'function') return onLoaded.apply(this, arguments);
        };
        return realPreloadScene.call(cc.director, sceneName, onProgress, wrappedLoaded);
      };
    }

    if (window.cc && cc.game) {
      cc.game.restart = function () {
        console.warn('[YM FINAL Guard] cc.game.restart() suppressed; staying in LobbyMain.');
        window.hallName = 'LobbyMain';
        try {
          if (currentSceneName() && currentSceneName() !== 'LobbyMain') cc.director.loadScene('LobbyMain');
          else window.__ymHideLobbyLoading();
        } catch (e) { window.__ymHideLobbyLoading(); }
      };
    }

    try {
      cc.director.on(cc.Director.EVENT_AFTER_SCENE_LAUNCH, function () {
        if (currentSceneName() === 'LobbyMain') {
          window.__ymLobbyLaunchedAt = Date.now();
          setTimeout(window.__ymHideLobbyLoading, 60);
          setTimeout(window.__ymHideLobbyLoading, 400);
          setTimeout(window.__ymHideLobbyLoading, 1200);
        }
      });
    } catch (e) {}
    return true;
  }

  var guardTimer = setInterval(function () {
    if (installDirectorGuard()) clearInterval(guardTimer);
  }, 50);
  setTimeout(function () { clearInterval(guardTimer); }, 25000);

  // Force Socket.IO to stay offline and patch returned sockets.
  // This prevents late socket.io.20d95.js from replacing our safe local socket.
  setTimeout(function () {
    try {
      var sourceIo = window.io;
      if (!sourceIo) return;
      function patchSocket(s) {
        if (!s || s.__ymSocketFinalGuardV3) return s;
        s.__ymSocketFinalGuardV3 = true;
        var rawOn = s.on;
        if (rawOn) {
          s.on = function (name, cb) {
            if (/^(disconnect|connect_error|connect_timeout|error|reconnect)$/.test(String(name))) {
              var wrapped = function () {
                console.warn('[YM FINAL Guard] Ignored offline socket event:', name);
                window.__ymHideLobbyLoading();
                return null;
              };
              return rawOn.call(this, name, wrapped);
            }
            return rawOn.apply(this, arguments);
          };
        }
        var rawEmit = s.emit;
        if (rawEmit) {
          s.emit = function (name) {
            var ret = rawEmit.apply(this, arguments);
            if (/^(login|loginNoPassword|LoginGame|ServerList|heartbeat)$/.test(String(name))) {
              setTimeout(window.__ymHideLobbyLoading, 100);
              setTimeout(window.__ymHideLobbyLoading, 500);
            }
            return ret;
          };
        }
        s.disconnect = function () {
          this.connected = false;
          window.__ymHideLobbyLoading();
          return this;
        };
        s.close = s.disconnect;
        return s;
      }
      function finalIo(url, opts) {
        return patchSocket(sourceIo(url, opts));
      }
      for (var k in sourceIo) { try { finalIo[k] = sourceIo[k]; } catch (e) {} }
      finalIo.connect = function (url, opts) { return finalIo(url, opts); };
      finalIo.__ymOfflineWrapped = true;
      finalIo.__ymLoopFinalGuardV3 = true;
      try { if (sourceIo.Socket) finalIo.Socket = sourceIo.Socket; } catch (e) {}
      Object.defineProperty(window, 'io', {
        configurable: true,
        enumerable: true,
        get: function () { return finalIo; },
        set: function () {
          // Ignore real network Socket.IO in this offline package.
          // sourceIo remains the local MockSocket connector from the fallback.
        }
      });
    } catch (e) { console.warn('[YM FINAL Guard] socket wrapper install failed', e); }
  }, 0);

  // Startup-only cleanup for the exact 100% Lobby loop. Stops after initial boot window.
  var cleanStart = Date.now();
  var cleanTimer = setInterval(function () {
    if (Date.now() - cleanStart > 90000) return clearInterval(cleanTimer);
    try {
      if (!window.cc || !cc.find) return;
      if (currentSceneName() === 'LobbyMain') {
        var loading = safeFind('Canvas/Loading');
        var pb = safeFind('Canvas/Loading/pb_Loading');
        var pbc = safeComp(pb, cc.ProgressBar || 'cc.ProgressBar');
        if (loading && loading.active && (!pbc || pbc.progress >= 0.99 || Date.now() - (window.__ymLobbyLaunchedAt || 0) > 500)) {
          window.__ymHideLobbyLoading();
        }
      }
    } catch (e) {}
  }, 250);

  console.log('[YM FINAL Guard v3] Lobby 100% loop protection enabled.');
})();
