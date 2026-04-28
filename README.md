# Trustpilot → CSV Scraper

Runs daily via GitHub Actions, scrapes Trustpilot reviews and saves them to `reviews.csv` in this repo. Pull into Google Sheets for free using IMPORTDATA.

---

## Setup Steps

### 1. Create a GitHub Repository
- Go to [github.com](https://github.com) and create a new **public** repo (must be public for IMPORTDATA to work)
- Upload these 4 files maintaining the folder structure:
  ```
  .github/workflows/scrape.yml
  scrape.js
  package.json
  README.md
  ```

---

### 2. Run It

- Go to the **Actions tab** in your GitHub repo
- Click **Scrape Trustpilot Reviews**
- Click **Run workflow** to test manually first
- It will then run automatically every day at 7am UTC
- After each run, `reviews.csv` will be committed and updated in the repo

---

### 3. Pull into Google Sheets (no API key needed!)

1. In your GitHub repo, click on `reviews.csv`
2. Click the **Raw** button — copy that URL (looks like `https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/reviews.csv`)
3. In a new Google Sheet, paste this formula in cell A1:
   ```
   =IMPORTDATA("https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/reviews.csv")
   ```
4. That's it — the sheet will pull the latest data every time it's opened or refreshed

---

## Column Order

| Col | Data |
|---|---|
| A | Profile URL |
| B | Total reviews on Trustpilot |
| C | Star rating |
| D | Review title |
| E | Review text |
| F | Timestamp (unix) |
| G | Date UTC |
| H | Review ID |
| I | Verified |
| J | Reviewer name |
| K | Reviewer ID |
| L | Reviewer avatar URL |
| M | Reviewer total reviews |
| N | Reviewer reviews on this domain |
| O | Country code |
| P | Company reply text |
| Q | Company reply date |
