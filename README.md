# Mads Agency — Business Dashboard

Mads Agency (madsagency.vercel.app) ke liye khud istemal karne wala dashboard:
**projects pipeline** (Leads → Convert → Working → Completed), clients track
karein, invoices banayein, payments record karein — paid / baaki / overdue sab
khud calculate hota hai. Data **browser (localStorage)** mein save rehta hai.
Dark theme agency website wali hai (navy + blue glow), light theme wesi ki wesi.

## Run karein

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build (dist/)
```

## Istemal kese karein

1. **Settings** (upar gear icon) — apna business name, currency (PKR default) aur monthly collection goal set karein.
2. **Dashboard** par blue banner mein **Start fresh** dabayein — sample data saaf ho jayega.
3. **Projects** — naya lead aaye to *Add project* karke **Leads** mein daalein. Deal confirm
   ho to **Convert**, kaam shuru ho to **Working**, deliver ho jaye to **Completed**.
   Card drag karke ya arrows se stage badlein. Lead ko aik click mein proper
   *client* bhi banaya ja sakta hai, aur project se direct invoice banti hai.
4. **Clients** — *Add client* se client add karein (name, phone/WhatsApp, company, city, notes).
   Kisi client par click karein to side panel mein us ki saari invoices, payments aur balance dikhta hai.
5. **New invoice** — client, kaam, amount, due date. Invoice number khud banta hai (INV-001…).
6. **Record payment** — jab paisay aayein, amount (partial bhi ho sakta hai), tareeka
   (Bank / Cash / JazzCash / Easypaisa…) save karein. Status khud update hoga:
   **Paid · Partial · Unpaid · Overdue**.
7. **Dashboard** — total collected, outstanding, overdue alerts ("Needs attention"),
   monthly goal gauge, top balances, recent payments — sab asal data se.
8. **Analytics** — collection rate, avg. invoice, clients kitne din mein pay karte hain, top clients.
9. **Reports** — Excel (CSV) exports, Monthly statement, print summary, aur sab se
   zaroori: **Backup download / restore**.

## Data & Backup (zaroor parhein)

- Saara data isi browser ke `localStorage` mein rehta hai — internet/account ki zaroorat nahi.
- Browser data clear karne ya doosra browser/phone istemal karne par data wahan nahi hoga.
- Iss liye haftay mein aik dafa **Reports → Backup download** kar ke file sambhaal lein.
  Kisi bhi waqt wohi file **Backup restore** karne se saara data wapis aa jata hai.
- `localStorage` keys: `bizcrm-clients`, `bizcrm-invoices`, `bizcrm-payments`, `bizcrm-projects`, `bizcrm-settings`.
