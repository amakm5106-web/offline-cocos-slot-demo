ပြင်ဆင်ပြီးသော local/offline demo build
======================================

ပြဿနာတွေ့ရှိချက်
----------------
- build ထဲမှာ lobby/main bundle, AfricanBuffalo slot bundle, GoldenCentury slot bundle တွေပါရှိပါတယ်။
- Login / checkVersion / ServerList / getRoomInfo / chooseRoom / lottery socket response တွေ live server မှမရရင် game flow ရပ်သွားနိုင်ပါတယ်။
- PlayerInfo ရဲ့ default coin က 0 ဖြစ်နေပြီး server loginResult မရတဲ့အခါ balance 0 ပဲပြနေပါတယ်။
- zip ထဲမှာ external captured response တချို့ရှိပေမယ့် /checkVersion response မပါလို့ lobby scene load မဖြစ်နိုင်ပါတယ်။

ပြင်ဆင်ထားတာ
-------------
- ym-offline-fallback.61327.js ကိုထည့်ထားပါတယ်။
- index.html နဲ့ index ထဲမှာ fallback script ကို settings ပြီးနောက် load အောင်ထည့်ထားပါတယ်။
- /checkVersion, guest login, room info, choose room, VIP/payment/customer service API တွေအတွက် local JSON response fallback ထည့်ထားပါတယ်။
- socket.io ကို local mock server ပုံစံ wrap လုပ်ထားပြီး loginResult, ServerListResult, loginGameResult, LoginfreeCountResult, lotteryResult response တွေကို game logic မူရင်း flow အတိုင်းပြန်ပေးပါတယ်။
- game ထဲဝင်တိုင်း start balance ကို 100000 ပြန်စထားပါတယ်။ Spin နှိပ်ရင် bet ဖြတ်ပြီး Win ဖြစ်ရင် balance ထဲပြန်ပေါင်းပါတယ်။ FreeSpin trigger/remaining count ကိုလည်း response ထဲထည့်ထားပါတယ်။
- AfricanBuffalo နဲ့ GoldenCentury network connected flag ကိုလည်း slot flow မရပ်အောင် patch ထည့်ထားပါတယ်။

သတိပြုရန်
---------
- ဒီ build က local/offline demo အတွက်ဖြစ်ပါတယ်။ Live server account balance ကို client-side ကနေပြောင်းတာမဟုတ်ပါ။
- Real server နဲ့ချိတ်မလုပ်အောင် fallback socket/API ကို local simulation အနေနဲ့သုံးထားပါတယ်။

နောက်ဆုံး Loading 90% Fix
------------------------
- Lobby preload အချိန် `assets/resources/native/1f/1fdafe36e.58210.png` မရှိလို့ 404 ဖြစ်ပြီး dragon loading screen 90%/100% မှာရပ်နေတဲ့ပြဿနာကို ပြင်ထားပါတယ်။
- ပျောက်နေတဲ့ lobby game-icon atlas texture ကို build ထဲသို့ ပြန်ထည့်ထားပါတယ်။
- LobbyMain က `socket-io` module real server သို့ခေါ်နေတဲ့နေရာကို local offline socket fallback သုံးအောင် patch လုပ်ထားပါတယ်။
- loginResult payload ထဲက `headimgurl` type, `win_pool`, `getBankScore`, `getMsgToUser` response shape တွေကို game logic မကျအောင်ညှိထားပါတယ်။
- Test ပြုလုပ်ပြီး `HotUpdate -> LobbyMain` load အောင်မြင်ပြီး `Loading` node ပိတ်သွားတာကိုစစ်ထားပါတယ်။


2026-07-02 v2 FIX - 100% Loading Loop
----------------------------------------
ပြဿနာ: Loading 100% ပြည့်ပြီး Lobby ကိုခဏဝင်ပြီးနောက် HotUpdate/Loading scene ကိုပြန်သွားကာ 100% မှာရပ်နေခြင်း။
ပြုပြင်ချက်:
- launchScene ကို HotUpdate မှ LobbyMain သို့ တိုက်ရိုက်ပြောင်းထားသည်။
- offline fallback ထဲတွင် HotUpdate scene ပြန်ခေါ်ခြင်း၊ preload လုပ်ခြင်း၊ cc.game.restart ပြန်ခေါ်ခြင်းများကို LobbyMain သို့ redirect လုပ်ထားသည်။
- HotUpdateSearchPaths/gameVersion cache များကို ဖယ်ရှားထားသည်။
- local/offline socket fallback ဆက်လက်အသုံးပြုအောင် ထားသည်။
