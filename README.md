# Trustpilot → Google Sheets Scraper

Runs daily via GitHub Actions, scrapes Trustpilot reviews and appends new ones to Google Sheets.

---

## Setup Steps

### 1. Create a GitHub Repository
- Go to [github.com](https://github.com) and create a new **private** repo
- Upload these 4 files maintaining the folder structure:
  ```
  .github/workflows/scrape.yml
  scrape.js
  package.json
  README.md
  ```

---

### 2. Set Up Google Service Account

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Go to **APIs & Services → Enable APIs** and enable **Google Sheets API**
4. Go to **APIs & Services → Credentials**
5. Click **Create Credentials → Service Account**
6. Give it a name, click **Done**
7. Click the service account → **Keys tab → Add Key → JSON**
8. Download the JSON file — you'll need its contents shortly

---

### 3. Share Your Google Sheet with the Service Account

1. Open the downloaded JSON file — copy the `client_email` value (looks like `something@project.iam.gserviceaccount.com`)
2. Open your Google Sheet
3. Click **Share** and paste that email in, give it **Editor** access

---

### 4. Add GitHub Secrets

In your GitHub repo go to **Settings → Secrets and variables → Actions → New repository secret**

Add these two secrets:

| Secret Name | Value |
|---|---|
| `GOOGLE_SHEET_ID` | The ID from your sheet URL: `https://docs.google.com/spreadsheets/d/`**THIS_PART**`/edit` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | The full contents of the JSON file you downloaded in step 2 |

---

### 5. Run It

- Go to **Actions tab** in your GitHub repo
- Click **Scrape Trustpilot Reviews**
- Click **Run workflow** to test it manually first
- After that it will run automatically every day at 7am UTC

---

## Column Order in Sheet

| Col | Data |
|---|---|
| A | Profile URL |
| B | Total reviews on Trustpilot |
| C | Star rating |
| D | Review title |
| E | Review text |
| F | (reserved) |
| G | Timestamp (unix) |
| H | Date UTC |
| I | Review ID (used for deduplication) |
| J | Verified |
| K | Reviewer name |
| L | Reviewer ID |
| M | Reviewer avatar URL |
| N | Reviewer total reviews |
| O | Reviewer reviews on this domain |
| P | Country code |
| Q | Company reply text |
| R | Company reply date |
