# Trade Analytics Setup Guide

This guide walks you through deploying your trade analytics app to Vercel with Supabase.

**Total time:** ~15 minutes

---

## Step 1: Create Supabase Project (5 min)

1. Go to [supabase.com](https://supabase.com) and sign in (or create account)

2. Click **New Project**

3. Fill in:
   - **Name:** `trade-analytics` (or whatever you prefer)
   - **Database Password:** Generate a strong one and save it
   - **Region:** Choose closest to you (e.g., London for UK)

4. Click **Create new project** and wait ~2 minutes for setup

---

## Step 2: Run Database Schema (3 min)

1. In Supabase, go to **SQL Editor** (left sidebar)

2. Click **New query**

3. Open the file `supabase/schema.sql` from this project

4. Copy the entire contents and paste into the SQL Editor

5. Click **Run** (or Cmd/Ctrl + Enter)

6. You should see "Success. No rows returned" — this is correct

7. Verify by going to **Table Editor** — you should see these tables:
   - accounts (with ISA and MARGIN rows)
   - executions
   - trades
   - trade_legs
   - trade_annotations
   - daily_summaries
   - weekly_summaries
   - monthly_summaries
   - yearly_summaries

---

## Step 3: Get Supabase API Keys (1 min)

1. In Supabase, go to **Project Settings** → **API**

2. Copy these values (you'll need them for Vercel):
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key — the long JWT string under "Project API keys"

3. Keep this page open, you'll need these values in the next step

---

## Step 4: Deploy to Vercel (5 min)

### Option A: Deploy via GitHub (Recommended)

1. Push this project to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   gh repo create trade-analytics --private --push
   ```

2. Go to [vercel.com](https://vercel.com) and sign in

3. Click **Add New** → **Project**

4. Import your `trade-analytics` repository

5. In the **Environment Variables** section, add:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
   | `IBKR_ACCOUNT_MAP` | `{"YOUR_IBKR_ID":"MARGIN","YOUR_OTHER_ID":"ISA"}` |

6. Click **Deploy**

7. Wait ~2 minutes for the build to complete

8. Your app is now live at `https://your-project.vercel.app`

### Option B: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Follow the prompts, then add environment variables:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add IBKR_ACCOUNT_MAP
   ```

4. Redeploy with env vars:
   ```bash
   vercel --prod
   ```

---

## Step 5: Find Your IBKR Account IDs (2 min)

Your IBKR account IDs are needed for the `IBKR_ACCOUNT_MAP` environment variable.

**To find them:**

1. Log in to IBKR Client Portal

2. Go to **Settings** → **Account Settings**

3. Your account ID is displayed at the top (format: `U1234567` or similar)

4. If you have multiple accounts (ISA + Margin), note both IDs

5. Update your Vercel environment variable:
   ```
   IBKR_ACCOUNT_MAP={"U1234567":"MARGIN","U7654321":"ISA"}
   ```
   Replace with your actual account IDs.

---

## Step 6: Test Your Deployment

1. Visit your Vercel URL

2. You should see the dashboard with:
   - "0 trades" message
   - Working navigation
   - Account switcher showing "All", "ISA", "Margin"

3. Go to **Import** page and verify the dropzone loads

4. If you see any errors, check:
   - Vercel logs (Vercel Dashboard → Your Project → Deployments → View Logs)
   - Environment variables are set correctly
   - Database schema was run successfully

---

## Local Development

To run locally after setup:

```bash
# Copy environment file
cp .env.example .env.local

# Edit .env.local with your Supabase credentials
# (same values you used for Vercel)

# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:3000
```

---

## Troubleshooting

### "Missing Supabase environment variables"

- Make sure both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- In Vercel: Settings → Environment Variables
- Redeploy after adding variables

### "Failed to fetch accounts" or empty data

- Verify the schema was run in Supabase SQL Editor
- Check that the `accounts` table has ISA and MARGIN rows
- Ensure RLS policies were created (check Table Editor → accounts → Policies)

### Import not working

- Check that `IBKR_ACCOUNT_MAP` is valid JSON
- Account IDs in the map must match what's in your Flex XML
- Check browser console for specific error messages

### Build fails

- Check Vercel build logs for specific errors
- Run `npm run build` locally to see detailed error messages

---

## Next Steps

Your app is now deployed! Here's what to do next:

1. **Export your first Flex report from IBKR** and import it

2. **Annotate a few trades** to test the A+ checklist

3. **Check the Stats page** to verify analytics are calculating

Future phases will add:
- Screenshot uploads (Cloudflare R2)
- Daily/weekly email summaries
- More visualization options
