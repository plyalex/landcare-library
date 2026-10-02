# Landcare Library

A book-lending library for Balmattum Sheans Creek Landcare members. 

Members photograph their bookshelf and the app reads the spines, looks up each book and adds it to a shared catalogue. Anyone in the group can ask to borrow a book through an in-app message. Loans run for one month with up to two renewals. Return reminders go out by email, and a "Who has what" page shows every book that's out, who has it and when it's due back.

It runs on free plans from Supabase (database and logins) and Vercel (website hosting). The only part that can cost money is reading the photos; see step 4.

Setup takes about an hour the first time. You only do it once.

---

## What you'll need

- The group Gmail account (balmattumsheanscreek.landcare@gmail.com), with 2-Step Verification turned on
- A GitHub account (free), used to hand the code to Vercel
- A Supabase account (free), sign in with GitHub
- A Vercel account (free Hobby plan), sign in with GitHub
- A Google account for the Gemini and Google Books keys (the group Gmail is fine)

Keep a text file open as you go. You'll collect about ten values and paste them into Vercel in step 7.

Menu names in these dashboards change from time to time. If a label below doesn't match exactly, look for the nearest equivalent.

---

## Step 1: Create the database (Supabase)

1. Go to supabase.com and create a new project.
   - Name: `landcare-library`
   - Region: **Sydney** (keeps the app fast for members)
   - Set a database password and store it somewhere safe. The app doesn't need it, but you might later.
2. When the project is ready, open **SQL Editor**, then **New query**.
3. Open `supabase/schema.sql` from this folder, copy the whole file, paste it in and click **Run**. You should see "Success. No rows returned".
4. Set the group's join code. New members need it to sign up. In a new SQL query run:

   ```sql
   update private.settings set value = 'your-code-here' where key = 'join_code';
   ```

   Pick something easy to say out loud, like `sheanscreek`. Capitals and spaces don't matter when members type it. You can change it any time by running the same line again.

5. Go to **Project Settings > API Keys** and copy these into your text file:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **Publishable key** (starts `sb_publishable_`)
   - **Secret key** (starts `sb_secret_`). Treat this like a password and never share it.

   Older projects call these the "anon" and "service_role" keys. Either works.

## Step 2: Gmail app password (for sending email)

The app sends request, approval and reminder emails from the group Gmail.

1. Sign in to the group Gmail, then go to myaccount.google.com > **Security**.
2. Make sure **2-Step Verification** is on.
3. Search the account settings for **App passwords** and create one called `Landcare Library`.
4. Copy the 16-character password into your text file (remove the spaces).

You'll use it twice: in Supabase (step 3) and in Vercel (step 7).

## Step 3: Login emails (Supabase)

By default Supabase will only send login emails to its own team members, so password resets won't reach your members until you do this.

1. In Supabase go to **Authentication > Emails > SMTP Settings** and turn on custom SMTP:
   - Sender email: `balmattumsheanscreek.landcare@gmail.com`
   - Sender name: `Landcare Library`
   - Host: `smtp.gmail.com`
   - Port: `465`
   - Username: `balmattumsheanscreek.landcare@gmail.com`
   - Password: the app password from step 2
2. Go to **Authentication > Sign In / Providers > Email** and turn **Confirm email** off. Members can then start using the app straight after signing up. The join code already keeps outsiders out.
3. Go to **Authentication > Emails > Templates > Reset password** and replace the link in the message with:

   ```
   {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery
   ```

   This lets members open the reset email on a different device from the one they asked on (for example, ask on the laptop, open the email on the phone).

You'll come back to Supabase in step 8 to give it the website's address.

## Step 4: Key for reading book photos

Choose one of these.

**Option A: Google Gemini (free).** Go to aistudio.google.com, sign in, click **Get API key** and create one. Copy it into your text file as the Gemini key.

Google's free tier may use what's sent to it to improve its models. For photos of book spines that's a low concern, but members should know not to photograph anything private.

**Option B: Claude (paid, very cheap).** Go to console.anthropic.com, buy the minimum credit and create an API key. Each photo costs well under one cent, so a few dollars would catalogue the whole group's books many times over.

If you set both keys, the app uses Gemini. To use Claude instead, also set `VISION_PROVIDER=anthropic` in step 7.

## Step 5: Google Books key (free, recommended)

The app looks up each book's cover, publisher, description and so on from Google Books, with Open Library as a backup. It works without a key, but the shared anonymous allowance runs out easily.

1. Go to console.cloud.google.com and create a project called `landcare-library`.
2. Go to **APIs & Services > Library**, search for **Books API** and click **Enable**.
3. Go to **APIs & Services > Credentials > Create credentials > API key**.
4. Edit the key and under **API restrictions** choose **Restrict key > Books API**. Save.
5. Copy the key into your text file.

## Step 6: Put the code on GitHub

1. On github.com click **New repository**, name it `landcare-library`, set it to **Private** and create it.
2. Unzip `landcare-library.zip` on your computer.
3. On the new repository's page click **uploading an existing file**, drag in **everything inside** the unzipped folder (not the folder itself), and click **Commit changes**.

   If GitHub skips the hidden files (`.gitignore` and `.env.example`), that's fine. The app doesn't need them to run.

## Step 7: Publish the website (Vercel)

1. On vercel.com click **Add New > Project** and import the `landcare-library` repository.
2. Before clicking Deploy, open **Environment Variables** and add these:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL (step 1) |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (step 1) |
   | `SUPABASE_SECRET_KEY` | Supabase secret key (step 1) |
   | `GEMINI_API_KEY` | Gemini key (step 4, option A) |
   | `ANTHROPIC_API_KEY` | Claude key (step 4, option B, if you chose it) |
   | `GOOGLE_BOOKS_API_KEY` | Google Books key (step 5) |
   | `SMTP_HOST` | `smtp.gmail.com` |
   | `SMTP_PORT` | `465` |
   | `SMTP_USER` | `balmattumsheanscreek.landcare@gmail.com` |
   | `SMTP_PASS` | Gmail app password (step 2) |
   | `EMAIL_FROM` | `Landcare Library <balmattumsheanscreek.landcare@gmail.com>` |
   | `CRON_SECRET` | Any long random string, e.g. 40 random letters and numbers |

   Optional:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_GROUP_NAME` | Defaults to `Balmattum Sheans Creek Landcare` |
   | `NEXT_PUBLIC_APP_NAME` | Defaults to `Landcare Library` |
   | `NEXT_PUBLIC_SITE_URL` | Only if you add your own domain later |
   | `VISION_PROVIDER` | `gemini` or `anthropic` |

3. Click **Deploy**. After a couple of minutes you'll get an address like `https://landcare-library.vercel.app`. Copy it.

The server region (Sydney) and the daily reminder job are already set in `vercel.json`. Vercel uses `CRON_SECRET` to call the reminder job, so nobody else can trigger it.

If you change an environment variable later, go to **Deployments**, open the latest one and click **Redeploy** for the change to take effect.

## Step 8: Tell Supabase the website's address

In Supabase go to **Authentication > URL Configuration**:

- **Site URL:** your Vercel address, e.g. `https://landcare-library.vercel.app`
- **Redirect URLs:** add `https://landcare-library.vercel.app/**` (using your own address)

## Step 9: Try it out

1. Open the website and click **Create an account**. Use your name, email, a password and the join code.
2. Fill in your profile (phone number and pickup notes such as "Leave in the shed by the gate"). Borrowers see these when a loan is approved.
3. Click **Add books**, photograph a shelf and check the list before saving.
4. Ask a committee member to sign up and request one of your books. Check that the email arrives, then approve it, mark it picked up and mark it returned.
5. Optionally, test the reminder job straight away. In Vercel go to **Settings > Cron Jobs** and click **Run**, or visit this address with the secret:

   ```
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://landcare-library.vercel.app/api/cron/reminders
   ```

   It replies with how many loans it checked and how many emails it sent.

Then send the address and join code to members.

---

## How it works for members

**Adding books.** Take a clear photo of the spines in good light, one shelf at a time. You can add several photos at once. The app lists what it found, and you can untick anything you don't want to lend. If it matched the wrong title or edition, click **Wrong book?** to search again, or add it with just the title and author as you typed them. Books you've already added are flagged so you don't double up. Photos are not stored.

**Borrowing.** Open a book and click **Ask to borrow**. Pick a day you could collect it, and the app writes a message to the owner, which you can change before sending. The owner gets it in Messages and by email. You can ask for a book that's already out; your request waits in line.

**Loans.**
- The owner approves or declines. Approved books show as **Reserved** until collected.
- When the book changes hands, the owner clicks **Mark as picked up** or the borrower clicks **I've picked it up**. The loan runs for one month from that day.
- The borrower can click **Renew for another month**, up to twice, from **My loans**. Renewing isn't possible if someone else is waiting for the book.
- When the book comes back, the owner clicks **Mark as returned**. The next request can then be approved.
- A borrower can cancel their request (**Cancel request**), and either person can cancel a reservation that hasn't been collected.

**Reminders.** The borrower gets an email a week before the due date, on the due date, and once a week while the book is overdue. The owner gets one email when a book is a week overdue. Emails go out between 8 and 9am Melbourne time.

**Who has what.** Lists every book that's out or reserved, who has it and when it's due back, so everyone can see where things are.

**Messages.** Members can message each other about any book. Messages are private to the two people in the conversation. Loan updates (approved, picked up, renewed, returned) appear in the conversation automatically.

**Not lending a book for a while?** The owner can untick **Available to borrow** on the book's page. It stays in the catalogue marked "Not lending". The same page has a **Note for borrowers** (for example, "signed copy, please handle with care").

---

## Looking after it

**New members who used the wrong code** land on a "waiting" page where they can enter the right code. Or let them in yourself: Supabase > **Table Editor > profiles**, find their row and tick `is_member`.

**Removing someone's access:** untick `is_member` on their profile. They can no longer see the library, and their books and loan history stay in place. Deleting their account under **Authentication > Users** also deletes their books and loan history, so only do that if they ask.

**Changing the join code:** run the `update private.settings ...` line from step 1 again. Existing members aren't affected.

**Keeping it free:**
- Supabase pauses free projects after a week with no activity. The daily reminder job keeps it awake, so this shouldn't happen. If it ever does, sign in to Supabase and click **Restore**.
- The free database holds 500 MB, enough for tens of thousands of books.
- Vercel's Hobby plan is for non-commercial use, which suits a community group. Its scheduled jobs run once a day at some point within the set hour.
- Gmail allows around 500 emails a day, far more than the library will send.

**Backups:** now and then, open Supabase > **Table Editor**, pick `books`, and export it as CSV. Do the same for `loans` if you want a record of who borrowed what.

**Changing the loan rules:** the one-month loan and two renewals are enforced in the database, in `supabase/schema.sql` (look for `interval '1 month'` and `renewals >= 2`). The wording shown on screen comes from `lib/config.ts`. If the committee changes the rules, update both, re-run `schema.sql` in Supabase (it's safe to re-run and keeps your data), and push the code change to GitHub. Vercel redeploys automatically.

---

## Troubleshooting

**Members aren't getting emails.** Check `SMTP_PASS` in Vercel is the app password with no spaces, then redeploy. Look in the group Gmail's Sent folder to see whether the emails went out, and ask members to check their spam folder.

**Password reset says the link didn't work.** Check you did step 3.3 (the Reset password template) and step 8 (Site URL). Reset links can only be used once and expire after an hour.

**Photos aren't being read.** Check `GEMINI_API_KEY` (or `ANTHROPIC_API_KEY`) in Vercel, then redeploy. The error is recorded in Vercel under **Logs**. Very blurry or dark photos, or spines at an angle, can also defeat it, so take a closer photo of fewer books.

**Books are found but details are missing.** Add or check `GOOGLE_BOOKS_API_KEY`, then redeploy. Members can still add a book with just its title and author.

**Reminder emails never arrive.** In Vercel check **Settings > Cron Jobs** shows the job and that `CRON_SECRET` is set. Scheduled jobs only run on the live (production) site.

---

## For developers

Next.js 16 (App Router) with React 19, TypeScript and Tailwind CSS 4, on Supabase (Postgres, Auth, row level security) and Vercel.

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
npm run typecheck
```

For local logins, add `http://localhost:3000/**` to the Supabase redirect URLs.

- `supabase/schema.sql`: tables, views (`catalog`, `loan_details`), row level security, and the loan functions (`request_loan`, `respond_to_request`, `mark_picked_up`, `renew_loan`, `mark_returned`, `cancel_loan`). All loan changes go through these functions, so the rules hold even if someone calls the API directly.
- `app/(app)`: member pages. `app/(auth)`: login, sign up, password reset.
- `app/api/identify`: photo to book list (`lib/books/vision.ts`, then `lib/books/lookup.ts`).
- `app/api/cron/reminders`: the daily reminder job (scheduled in `vercel.json`, 22:00 UTC).
- `lib/notify.ts` and `lib/email.ts`: email notifications.
