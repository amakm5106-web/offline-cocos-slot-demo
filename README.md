# Local Offline Slot Game Demo

ဤ repository нь ZIP-ээр өгсөн Cocos Creator HTML5 build-ийг өөрчлөлт багатайгаар хадгалж, offline demo хэлбэрээр ажиллуулах боломжтой болгосон хувилбар юм. `assets/` доторх supplied зураг, animation/audio data, Cocos bundle-уудыг замын бүтцийг хадгалан оруулсан.

## Run

Node.js 18+ шаардлагатай. Dependency суулгах шаардлагагүй.

```bash
npm test
npm run build
npm run serve
```

Дараа нь browser дээр `http://localhost:4173` ကို ဖွင့်ပါ။ `npm run build` က မူရင်း web build болон scripts/assets-ийг `dist/` folder-т тавина။ `npm run serve` нь build амжилттай бол `dist/`-ийг, үгүй бол project root-ийг static server-аар үйлчилнэ.

## Included games

Offline fallback нь archive-д бодитоор байгаа playable game bundle-уудыг л харуулна:

- Game ID `120` — African Buffalo
- Game ID `124` — Golden Century

Lobby, resource болон internal bundle-ууд дагалдана. ZIP-д эдгээрээс бусад олон game ID-ийн нэр/тохиргооны мөр байгаа ч тэдгээрт харгалзах playable bundle-ууд archive-д байхгүй тул offline server list-д харуулахгүй.

## Offline demo behavior

Энэ нь real-money game, account service эсвэл remote server биш. Login, server list, room болон spin response-ууд browser доторх local mock-оос ирнэ. Demo эхлэхэд 100,000 virtual coin өгч, bet/win/free-spin response-уудыг local simulation хийнэ. Balance болон үр дүн нь бодит мөнгө, серверийн account balance-тай холбоогүй.

Тоглоом нь mobile Cocos2d build тул ширээний browser-оос гадна touch browser дээр ажиллахад зориулагдсан. Local HTTP server ашиглаарай; `file://`-ээр нээх нь asset load хийхэд тохиромжгүй.

## Validation/build scripts

- `npm test` — entrypoint, local script/style references, Cocos manifests ба bundled game assets-ийг шалгана.
- `npm run build` — шалгалтын дараа static deploy output-г `dist/` дотор үүсгэнэ.
- `npm run serve` — `dist/` эсвэл эх project-ийг local static server-аар ажиллуулна.

ZIP-д дагалдсан `README_FIXED_MYANMAR.txt` болон `FIX_REPORT_MYANMAR_FINAL.txt`-ийг эх сурвалжийн тайлбар болгон хэвээр хадгалсан.

## Asset rights

Archive дахь bundled artwork, font, sound болон game code-ийн эрх/лицензийг энэ ажлын хүрээнд бие даан баталгаажуулаагүй. Эх өгөгдлийг нийлүүлсэн байдлаар хадгалсан; public-д цааш тараах, өөрчлөх эсвэл дахин лицензлэхийн өмнө шаардлагатай зөвшөөрөл байгаа эсэхийг repository owner баталгаажуулна уу. Энэ repository-д тусгай open-source license олгоогүй.
