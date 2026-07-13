/**
 * 復健科進修雷達 - 爬蟲主程式 (MVP)
 *
 * 用法：node scrape.js
 * 需要先 npm install axios cheerio
 *
 * 設計理念：
 * - 每個來源是 SOURCES 陣列裡的一個物件
 * - 每個來源有自己的 fetch + parse 邏輯（因為每個學會網站結構都不一樣）
 * - 之後要加新來源，就是複製一個 source 物件，改 selector
 * - 輸出統一格式寫進 ../public/courses.json，前端只認這個格式
 */

const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

// ---- 統一輸出格式 ----
// { id, source, title, date, url, org, location, scrapedAt }

const SOURCES = [
  {
    id: "pmr",
    name: "台灣復健醫學會",
    url: "https://www.pmr.org.tw/active_news/active.asp",
    async parse(html) {
      const $ = cheerio.load(html);
      const items = [];

      // 台灣復健醫學會的學術活動列表：每筆是一個區塊，包含日期、標題連結、主辦、地點
      // 注意：這個 selector 是根據頁面文字內容推測的，實際跑的時候
      // 建議先 console.log($.html()) 確認真正的 class name / 結構再微調
      $("a[href*='active_info.asp']").each((_, el) => {
        const $el = $(el);
        const title = $el.text().trim();
        let href = $el.attr("href");
        if (href && !href.startsWith("http")) {
          href = new URL(href, "https://www.pmr.org.tw/active_news/").href;
        }

        // 往上找包含這個連結的區塊，抓日期/主辦/地點文字
        const $block = $el.closest("li, div, tr");
        const blockText = $block.text();

        const dateMatch = blockText.match(/日期[：:]\s*([\d/]+)/);
        const orgMatch = blockText.match(/主辦[：:]\s*([^\n地]+)/);
        const locMatch = blockText.match(/地點[：:]\s*([^\n]+)/);

        if (title && href) {
          items.push({
            id: `pmr-${Buffer.from(href).toString("base64").slice(0, 12)}`,
            source: "台灣復健醫學會",
            title,
            date: dateMatch ? dateMatch[1].trim() : null,
            url: href,
            org: orgMatch ? orgMatch[1].trim() : null,
            location: locMatch ? locMatch[1].trim() : null,
          });
        }
      });

      // 去重（同一個連結可能因為 DOM 結構重複抓到）
      const seen = new Set();
      return items.filter((i) => {
        if (seen.has(i.url)) return false;
        seen.add(i.url);
        return true;
      });
    },
  },

  // ---- 之後在這裡加更多來源 ----
  // {
  //   id: "xxx",
  //   name: "學會名稱",
  //   url: "https://...",
  //   async parse(html) { ... }
  // },
];

async function scrapeSource(source) {
  try {
    const res = await axios.get(source.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RehabRadarBot/1.0)" },
      timeout: 15000,
    });
    const items = await source.parse(res.data);
    console.log(`[${source.name}] 抓到 ${items.length} 筆`);
    return items;
  } catch (err) {
    console.error(`[${source.name}] 抓取失敗:`, err.message);
    return [];
  }
}

async function main() {
  const outPath = path.join(__dirname, "..", "public", "courses.json");

  // 讀舊資料（保留歷史紀錄，即使某個來源這次抓失敗也不會消失）
  let existing = [];
  if (fs.existsSync(outPath)) {
    existing = JSON.parse(fs.readFileSync(outPath, "utf-8"));
  }
  const existingById = new Map(existing.map((i) => [i.id, i]));

  const now = new Date().toISOString();
  for (const source of SOURCES) {
    const items = await scrapeSource(source);
    for (const item of items) {
      const prev = existingById.get(item.id);
      existingById.set(item.id, {
        ...item,
        scrapedAt: prev ? prev.scrapedAt : now, // 保留第一次被抓到的時間，用來算「新增」
      });
    }
  }

  const merged = Array.from(existingById.values()).sort((a, b) =>
    (b.scrapedAt || "").localeCompare(a.scrapedAt || "")
  );

  fs.writeFileSync(outPath, JSON.stringify(merged, null, 2), "utf-8");
  console.log(`寫入 ${merged.length} 筆到 ${outPath}`);
}

main();
