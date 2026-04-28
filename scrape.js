const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const QUERY = "ukstoragecompany.co.uk";
const PAGES = 5;
const CSV_PATH = path.join(__dirname, "reviews.csv");

// ── CSV helpers ──────────────────────────────────────────────────────────────
const HEADERS = [
  "ProfileURL", "TotalReviews", "StarRating", "Title", "ReviewText",
  "Timestamp", "DateUTC", "ReviewID", "Verified", "ReviewerName",
  "ReviewerID", "ReviewerAvatarURL", "ReviewerTotalReviews",
  "ReviewerReviewsOnDomain", "CountryCode", "ReplyText", "ReplyDateUTC"
];

function escapeCSV(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCSV(row) {
  return row.map(escapeCSV).join(",");
}

// ── Read existing IDs from CSV ───────────────────────────────────────────────
function getExistingIdsAndRows() {
  if (!fs.existsSync(CSV_PATH)) {
    return { existingIds: new Set(), existingRows: [], header: rowToCSV(HEADERS) };
  }
  const lines = fs.readFileSync(CSV_PATH, "utf8").trim().split("\n");
  const header = lines[0];
  const dataLines = lines.slice(1);

  // ReviewID is column index 7 (0-based)
  const existingIds = new Set(
    dataLines.map(line => {
      const cols = line.split(",");
      return cols[7]?.replace(/"/g, "").trim();
    }).filter(Boolean)
  );

  return { existingIds, existingRows: dataLines, header };
}

// ── Clean text ───────────────────────────────────────────────────────────────
function cleanText(text) {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim();
}

// ── Format date ──────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().replace("T", " ").substring(0, 19);
}

// ── Main scrape ──────────────────────────────────────────────────────────────
async function scrape() {
  console.log("Launching browser...");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "en-GB",
  });

  const { existingIds, existingRows, header } = getExistingIdsAndRows();
  console.log(`Found ${existingIds.size} existing reviews in CSV.`);

  const newRows = [];

  for (let page = 1; page <= PAGES; page++) {
    const url = `https://uk.trustpilot.com/review/${QUERY}?page=${page}`;
    console.log(`Scraping page ${page}: ${url}`);

    const tab = await context.newPage();

    try {
      await tab.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await tab.waitForSelector("script#__NEXT_DATA__", { timeout: 15000 });

      const jsonText = await tab.$eval(
        "script#__NEXT_DATA__",
        (el) => el.textContent
      );

      const data = JSON.parse(jsonText);
      const reviews = data?.props?.pageProps?.reviews || [];
      const totalReviews =
        data?.props?.pageProps?.business?.numberOfReviews ??
        data?.props?.pageProps?.reviewsCount ??
        "";

      console.log(`  Found ${reviews.length} reviews on page ${page}`);

      for (const r of reviews) {
        if (existingIds.has(r.id)) continue;

        const rawDate = r.dates?.publishedDate || r.createdAt || r.date || null;
        const rawReplyDate = r.reply?.dates?.publishedDate || r.reply?.createdAt || null;
        const timestamp = rawDate
          ? Math.floor(new Date(rawDate).getTime() / 1000)
          : "";

        newRows.push([
          `https://uk.trustpilot.com/review/${QUERY}`,
          totalReviews,
          r.rating ?? "",
          r.title ?? "",
          cleanText(r.text),
          timestamp,
          formatDate(rawDate),
          r.id ?? "",
          r.isVerified ? "TRUE" : "FALSE",
          r.consumer?.displayName || "",
          r.consumer?.id || "",
          r.consumer?.imageUrl || "",
          r.consumer?.numberOfReviews || "",
          r.consumer?.numberOfReviewsOnSameDomain || 1,
          r.consumer?.countryCode || "",
          cleanText(r.reply?.text || ""),
          formatDate(rawReplyDate),
        ]);

        existingIds.add(r.id);
      }
    } catch (err) {
      console.error(`  Error on page ${page}: ${err.message}`);
    } finally {
      await tab.close();
    }
  }

  await browser.close();

  if (newRows.length === 0) {
    console.log("No new reviews found.");
    return;
  }

  // Write CSV — header + existing rows + new rows
  const allRows = [
    header,
    ...existingRows,
    ...newRows.map(rowToCSV)
  ];

  fs.writeFileSync(CSV_PATH, allRows.join("\n"), "utf8");
  console.log(`✅ Added ${newRows.length} new reviews. Total saved to reviews.csv`);
}

scrape().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
