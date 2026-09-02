# NPS KING – Google Keyword + Gujarat Lead CRM

This package adds:
- Supabase cloud storage for website settings, customers and leads.
- Unlimited Google keyword manager in Admin Panel (add/edit/delete/active).
- Keyword and Gujarat-state lead filters in Leads CRM.
- Google Ads Lead Form webhook receiver via Supabase Edge Function.
- Google Ads test lead button that writes to Supabase.
- Website leads retain Google source/UTM/GCLID/keyword information when available.

## 1) Supabase SQL
Run `supabase_schema.sql` once in Supabase SQL Editor.

## 2) Admin user
Create the admin user in Supabase Authentication → Users with the configured email in `config.js`.

## 3) Deploy the Google webhook Edge Function
Install Supabase CLI, login, link this project, then deploy:

```bash
supabase login
supabase link --project-ref gkdwojcxbbnksxivbpel
supabase functions deploy google-leads --no-verify-jwt
supabase secrets set GOOGLE_WEBHOOK_KEY="CHANGE_THIS_TO_A_LONG_RANDOM_SECRET"
```

The webhook URL shown to Google Ads will be:
`https://gkdwojcxbbnksxivbpel.supabase.co/functions/v1/google-leads?key=YOUR_WEBHOOK_KEY`

Replace `YOUR_WEBHOOK_KEY` with the exact secret value you set. Do not put a Supabase service-role key in the website.

## 4) Google Ads
Create a Search campaign targeting Gujarat and add a Google Lead Form asset. Google supports delivering lead-form submissions to a CRM through a webhook or Google Ads API. The form should collect name and phone/email and must include the required privacy-policy URL.

Important: simply searching Google does NOT reveal a person's name or mobile number. A lead is created only when the person submits your website form or Google-hosted lead form. Exact organic Google search terms are also not guaranteed to be available to a website because Google commonly hides them; for Ads, use GCLID/UTM/campaign data and Google Ads reporting/API where applicable.

## 5) GitHub Pages
Upload the package files to the repository root. Keep `index.html`, `config.js`, `cloud_patch.js` together. Enable GitHub Pages from the repository's main branch/root.
