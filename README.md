# 復健科進修雷達 (MVP)

最小可行版本：先抓一個來源（台灣復健醫學會），把架構跑通，之後再一個一個加來源。

## 檔案結構

```
rehab-radar/
├── scraper/
│   ├── scrape.js       ← 爬蟲主程式，來源設定都在這裡
│   └── package.json
├── public/
│   ├── index.html       ← 前端頁面（開這個就能看）
│   └── courses.json     ← 爬蟲輸出的資料（目前是範例資料）
└── .github/workflows/
    └── scrape.yml        ← 每天自動跑爬蟲的排程
```

## 本機測試

```bash
cd scraper
npm install
npm run scrape          # 會更新 ../public/courses.json
```

跑完後可以直接用瀏覽器打開 `public/index.html`（或用 `npx serve public`）看結果。

⚠️ **selector 一定要調**：`scrape.js` 裡台灣復健醫學會的抓取邏輯，是我根據頁面文字內容
推測寫的，還沒有真的跑過。第一次跑完如果抓到 0 筆或資料錯亂，把 `console.log($.html())`
印出來的原始 HTML 貼給我，我幫你調 selector——這是每個來源第一次串接時都會需要做的事。

## 加新來源的步驟

1. 打開目標學會網站的課程/公告列表頁
2. 在 `scrape.js` 的 `SOURCES` 陣列裡複製一個物件出來
3. 改 `id`、`name`、`url`
4. 改 `parse()` 裡的 selector，抓出標題、連結、日期、主辦、地點
5. 跑 `npm run scrape` 測試

海報圖裡的日期（Martinoli、骨科足踝年會那種）可以先跳過，等基本架構穩了之後
再加「把圖片丟給 Claude API 讀日期」這一段，屬於進階功能。

## 部署到 Netlify

1. 把整個資料夾 push 到 GitHub repo
2. Netlify 連接這個 repo，Publish directory 設成 `public`
3. 到 GitHub repo 的 Settings → Actions → General，確認 workflow 權限是
   "Read and write permissions"（不然 bot 沒辦法 commit 資料回去）
4. `.github/workflows/scrape.yml` 會每天自動跑，跑完會 commit 新的
   `courses.json`，Netlify 偵測到 push 就會自動重新部署

## 之後可以加的功能（等 MVP 穩定後再做）

- 早晚各一次的 LINE/Email 通知（讀 courses.json 比對新增筆數）
- 海報圖 OCR 讀日期（呼叫 Claude API 讀圖）
- 每個來源獨立 RSS feed
- 台灣連線限定的來源 → 用 GitHub Actions 本身就是台灣以外的 IP，
  跟你原本遇到的問題一樣，可能還是需要一台家用機器代跑，或找台灣機房的
  免費 runner
