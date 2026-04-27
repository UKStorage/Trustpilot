const { chromium } = require("playwright");
const { google } = require("googleapis");

const QUERY = "ukstoragecompany.co.uk";
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const PAGES = 5;

// ── Google Sheets auth ──────────────────────────────────────────────────────
async function getSheet() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  return sheets;
}

// ── Read existing IDs from column I (col 9) ─────────────────────────────────
async function getExistingIds(sheets) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "Sheet1!I:I",
  });
  const rows = res.data.values || [];
  return new Set(rows.flat().filter(Boolean));
}

// ── Append rows to sheet ─────────────────────────────────────────────────────
async function appendRows(sheets, rows) {
  if (rows.length === 0) {
    console.log("No new reviews to append.");
    return;
  }
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "Sheet1!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });
  console.log(`Appended ${rows.length} new reviews.`);
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
  return d.toISOString().replace("T", " ").substring(0, 19); // yyyy-MM-dd HH:mm:ss
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

  const sheets = await getSheet();
  const existingIds = await getExistingIds(sheets);
  console.log(`Found ${existingIds.size} existing review IDs in sheet.`);

  const newRows = [];

  for (let page = 1; page <= PAGES; page++) {
    const url = `https://uk.trustpilot.com/review/${QUERY}?page=${page}`;
    console.log(`Scraping page ${page}: ${url}`);

    const tab = await context.newPage();

    try {
      await tab.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

      // Wait for Cloudflare to pass and page to load
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

        const rawDate =
          r.dates?.publishedDate || r.createdAt || r.date || null;
        const rawReplyDate =
          r.reply?.dates?.publishedDate || r.reply?.createdAt || null;
        const timestamp = rawDate
          ? Math.floor(new Date(rawDate).getTime() / 1000)
          : "";

        newRows.push([
          `https://uk.trustpilot.com/review/${QUERY}`,
          totalReviews,
          r.rating ?? "",
          r.title ?? "",
          cleanText(r.text),
          0,
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
  await appendRows(sheets, newRows);
}

scrape().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
