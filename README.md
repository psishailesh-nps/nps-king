# NPS KING — GitHub Pages + Supabase

તમારી NPS KING Gujarati website હવે Supabase cloud database માટે તૈયાર છે.

## આ packageમાં

- `index.html` — live website
- `config.js` — તમારા Supabase projectનું public configuration
- `cloud_patch.js` — online Leads / Customers / Settings / Admin Login integration
- `supabase_schema.sql` — tables, RLS policies અને secure public status lookup

## 1. Supabase Database તૈયાર કરો

Supabase Dashboard → **SQL Editor** → New query → `supabase_schema.sql` ની આખી contents paste કરો → **Run**.

આથી:
- `site_settings` table
- `customers` table
- `leads` table
- Row Level Security policies
- public application status lookup function

બનશે.

## 2. Admin user બનાવો

Supabase Dashboard → **Authentication → Users → Add user / Create user**.

Email:
`psi.shailesh@gmail.com`

તમારો પોતાનો strong password set કરો.

જો Supabase email confirmation માંગે તો userને confirm કરો અથવા projectની authentication setting પ્રમાણે confirmation complete કરો.

## 3. GitHub પર upload

Repositoryમાં root folderમાં આ ત્રણ files હોવી જરૂરી છે:

- `index.html`
- `config.js`
- `cloud_patch.js`

`supabase_schema.sql` ને repositoryમાં રાખવું optional છે, પણ setup record માટે રાખી શકો છો.

## 4. GitHub Pages

GitHub Repository → **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main` → Folder: `/ (root)` → Save.

થોડા સમય પછી GitHub Pages URL મળશે.

## 5. Supabase Auth URL

Supabase → **Authentication → URL Configuration** માં તમારી GitHub Pages URL ને **Site URL** તરીકે મૂકો અને જરૂર પડે તો Redirect URLsમાં પણ ઉમેરો.

## Security

- `config.js`માં માત્ર public/publishable key છે.
- `service_role` અથવા secret key ક્યારેય frontendમાં ન મૂકવી.
- Leads public visitor દ્વારા insert થઈ શકે છે, પરંતુ public visitor leads વાંચી શકતો નથી.
- Customers/Leads/Settings વાંચવા અને manage કરવા માટે authenticated admin session જરૂરી છે.
- Public status lookup માત્ર નામ, PRAN અને status આપે છે.

## નોંધ

Google Ads lead delivery માટે private Google credential frontendમાં ન મૂકવો. હાલ website source/keyword capture કરીને Supabaseમાં lead record save કરે છે. Actual Google Lead Form webhook માટે અલગ server-side integration જરૂરી છે.
