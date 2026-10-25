// ── Downloadable / printable invoice documents ─────────────────
// Builds one self-contained HTML invoice (logo embedded, no external
// files needed) that can be previewed in-app, downloaded as a file to
// send to the client, or printed / saved as PDF.
import { fmtM, fmtDate, todayISO, paidOf, remainingOf, statusOf } from './data';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Fetch the black logo once and cache it as a data URL so downloaded
// invoices keep the logo even when opened offline / on a client's phone.
let logoCache; // undefined = not fetched yet, null = unavailable
export async function getLogoDataUrl() {
  if (logoCache !== undefined) return logoCache;
  try {
    const res = await fetch('/mads-logo-black.png');
    if (!res.ok) throw new Error('logo fetch failed');
    const blob = await res.blob();
    logoCache = await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    logoCache = null;
  }
  return logoCache;
}

const STATUS_STYLE = {
  Paid: { bg: '#e7f9ec', fg: '#0f7a3d', label: 'PAID' },
  Partial: { bg: '#fdf3e0', fg: '#9a6206', label: 'PARTIALLY PAID' },
  Unpaid: { bg: '#fdeceb', fg: '#b42318', label: 'UNPAID' },
  Overdue: { bg: '#fdeceb', fg: '#b42318', label: 'OVERDUE' },
};

const ONES = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function under1000(n) {
  let s = '';
  if (n >= 100) { s += ONES[Math.floor(n / 100)] + ' Hundred'; n %= 100; if (n) s += ' '; }
  if (n >= 20) { s += TENS[Math.floor(n / 10)]; if (n % 10) s += '-' + ONES[n % 10]; }
  else if (n > 0) s += ONES[n];
  return s;
}
export function amountWords(n) {
  n = Math.round(Math.abs(Number(n || 0)));
  if (n === 0) return 'Zero';
  const parts = [];
  for (const [v, name] of [[1e9, 'Billion'], [1e6, 'Million'], [1e3, 'Thousand']]) {
    if (n >= v) { parts.push(under1000(Math.floor(n / v)) + ' ' + name); n %= v; }
  }
  if (n > 0) parts.push(under1000(n));
  return parts.join(' ');
}
const CURRENCY_WORDS = { PKR: 'Rupees', USD: 'Dollars', EUR: 'Euros', GBP: 'Pounds', AED: 'Dirhams' };

export function invoiceFileName(invoice, client) {
  const c = (client?.name || 'Client').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'Client';
  return `Invoice-${invoice.no}-${c}.html`;
}

export function buildInvoiceHtml({ invoice, client, payments, settings, logo, toolbar = true }) {
  const invPays = payments.filter((p) => p.invoiceId === invoice.id).sort((a, b) => (a.date < b.date ? -1 : 1));
  const paid = paidOf(invoice.id, payments);
  const rem = remainingOf(invoice, payments);
  const st = STATUS_STYLE[statusOf(invoice, payments)] || STATUS_STYLE.Unpaid;
  const biz = esc(settings?.businessName || 'Mads Agency');
  const curWord = CURRENCY_WORDS[settings?.currency || 'PKR'] || '';
  const wordsFor = rem > 0 ? rem : Number(invoice.amount || 0);
  const wordsLabel = rem > 0 ? 'Balance due in words' : 'Total in words';
  const payDetails = String(settings?.paymentDetails || '').trim();

  const clientLines = [
    client?.company,
    [client?.phone, client?.email].filter(Boolean).join('  ·  '),
    client?.city,
  ].filter(Boolean).map((l) => `<div class="cdet">${esc(l)}</div>`).join('');

  const payRows = invPays.map((p) => `
        <tr>
          <td>${esc(fmtDate(p.date))}</td>
          <td>${esc(p.method || '—')}</td>
          <td>${esc(p.note || '—')}</td>
          <td class="r"><b>${esc(fmtM(p.amount, settings))}</b></td>
        </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invoice ${esc(invoice.no)} — ${biz}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #eceff3; color: #101828; font-size: 14px; }
  .toolbar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 12px; background: #0b1226; color: #fff; padding: 10px 18px; font-size: 13px; }
  .toolbar b { font-weight: 700; }
  .toolbar span { color: rgba(255,255,255,.65); font-weight: 500; }
  .toolbar button { background: #2f6bff; color: #fff; border: 0; border-radius: 999px; padding: 8px 16px; font-size: 12.5px; font-weight: 700; cursor: pointer; }
  .sheet { max-width: 820px; margin: 28px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 12px 44px rgba(16,24,40,.14); }
  .accent { height: 5px; background: linear-gradient(90deg, #1130b4, #2f6bff, #7aa2ff); }
  .pad { padding: 42px 48px 34px; }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
  .brand img { height: 36px; width: auto; display: block; }
  .wordmark { font-size: 25px; font-weight: 800; letter-spacing: -.5px; }
  .meta { text-align: left; min-width: 235px; }
  .meta h1 { font-size: 27px; font-weight: 800; letter-spacing: .04em; }
  .pill { display: inline-block; margin: 7px 0 12px; padding: 4px 11px; border-radius: 999px; font-size: 11px; font-weight: 800; letter-spacing: .06em; }
  .mrow { display: flex; justify-content: space-between; gap: 18px; padding: 3px 0; font-size: 12.5px; }
  .mrow span { color: #667085; }
  .mrow b { font-weight: 700; white-space: nowrap; }
  .billed { margin-top: 34px; }
  .lbl { font-size: 10.5px; font-weight: 800; letter-spacing: .12em; color: #98a2b3; }
  .cname { font-size: 17px; font-weight: 800; margin-top: 5px; }
  .cdet { color: #475467; font-size: 12.5px; margin-top: 2px; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 26px; }
  table.items th { background: #0b1226; color: #fff; text-align: left; font-size: 10.5px; letter-spacing: .1em; padding: 10px 14px; }
  table.items th.r, table.items td.r { text-align: right; }
  table.items td { padding: 14px; border-bottom: 1px solid #eaecf0; font-size: 13.5px; vertical-align: top; }
  table.items .note { color: #667085; font-size: 12px; margin-top: 3px; }
  .totals { width: 310px; max-width: 100%; margin: 18px 0 0 auto; }
  .trow { display: flex; justify-content: space-between; gap: 16px; padding: 7px 2px; font-size: 13.5px; }
  .trow span { color: #475467; }
  .trow.paidrow b { color: #0f7a3d; }
  .trow.due { margin-top: 8px; padding: 11px 14px; border-radius: 10px; align-items: center; }
  .trow.due span { color: #101828; font-weight: 700; font-size: 13px; }
  .trow.due b { font-size: 17px; font-weight: 800; white-space: nowrap; }
  .words { margin-top: 14px; font-size: 12px; color: #667085; font-style: italic; }
  .words b { color: #344054; }
  .sect { margin-top: 34px; }
  table.pays { width: 100%; border-collapse: collapse; margin-top: 10px; }
  table.pays th { text-align: left; font-size: 10.5px; letter-spacing: .08em; color: #98a2b3; padding: 6px 10px; border-bottom: 1px solid #d0d5dd; }
  table.pays td { padding: 8px 10px; border-bottom: 1px solid #f2f4f7; font-size: 12.5px; color: #344054; }
  table.pays th.r, table.pays td.r { text-align: right; }
  .paybox { margin-top: 30px; border: 1px solid #eaecf0; background: #f8fafc; border-radius: 10px; padding: 14px 16px; }
  .paybox .txt { margin-top: 6px; font-size: 12.5px; line-height: 1.65; color: #344054; white-space: pre-wrap; }
  footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #eaecf0; }
  footer .thanks { font-size: 13px; font-weight: 700; }
  footer .gen { font-size: 11px; color: #98a2b3; margin-top: 3px; }
  @page { size: A4; margin: 12mm; }
  @media print {
    body { background: #fff; }
    .toolbar { display: none !important; }
    .sheet { box-shadow: none; margin: 0; max-width: none; border-radius: 0; }
    .pad { padding: 10px 6px 0; }
    .pill, .accent, table.items th, .trow.due, .paybox { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
${toolbar ? `<div class="toolbar"><div><b>${biz}</b> <span>— Invoice ${esc(invoice.no)}</span></div><button onclick="window.print()">Print / Save as PDF</button></div>` : ''}
<div class="sheet">
  <div class="accent"></div>
  <div class="pad">
    <header>
      <div class="brand">${logo ? `<img src="${logo}" alt="${biz}">` : `<div class="wordmark">${biz}</div>`}</div>
      <div class="meta">
        <h1>INVOICE</h1>
        <span class="pill" style="background:${st.bg};color:${st.fg}">${st.label}</span>
        <div class="mrow"><span>Invoice no.</span><b>${esc(invoice.no)}</b></div>
        <div class="mrow"><span>Issued</span><b>${esc(fmtDate(invoice.date))}</b></div>
        ${invoice.due ? `<div class="mrow"><span>Due date</span><b>${esc(fmtDate(invoice.due))}</b></div>` : ''}
      </div>
    </header>

    <section class="billed">
      <div class="lbl">BILLED TO</div>
      <div class="cname">${esc(client?.name || '—')}</div>
      ${clientLines}
    </section>

    <table class="items">
      <thead><tr><th>DESCRIPTION</th><th class="r" style="width:190px">AMOUNT</th></tr></thead>
      <tbody>
        <tr>
          <td><b>${esc(invoice.title || 'Services')}</b>${invoice.note ? `<div class="note">${esc(invoice.note)}</div>` : ''}</td>
          <td class="r"><b>${esc(fmtM(invoice.amount, settings))}</b></td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div class="trow"><span>Total</span><b>${esc(fmtM(invoice.amount, settings))}</b></div>
      ${paid > 0 ? `<div class="trow paidrow"><span>Amount paid</span><b>− ${esc(fmtM(paid, settings))}</b></div>` : ''}
      <div class="trow due" style="background:${rem > 0 ? '#eef3ff' : '#e9f9ef'}"><span>BALANCE DUE</span><b style="color:${rem > 0 ? '#101828' : '#0f7a3d'}">${esc(fmtM(rem, settings))}</b></div>
    </div>
    <p class="words">${wordsLabel}: <b>${esc(amountWords(wordsFor))}${curWord ? ' ' + curWord : ''} only</b></p>

    ${invPays.length ? `<section class="sect">
      <div class="lbl">PAYMENTS RECEIVED</div>
      <table class="pays">
        <thead><tr><th>DATE</th><th>METHOD</th><th>NOTE</th><th class="r">AMOUNT</th></tr></thead>
        <tbody>${payRows}</tbody>
      </table>
    </section>` : ''}

    ${payDetails ? `<div class="paybox"><div class="lbl">PAYMENT DETAILS</div><div class="txt">${esc(payDetails)}</div></div>` : ''}

    <footer>
      <div class="thanks">Thank you for your business.</div>
      <div class="gen">${biz} · Invoice generated on ${esc(fmtDate(todayISO()))}</div>
    </footer>
  </div>
</div>
</body>
</html>`;
}

export function downloadInvoiceHtml(html, filename) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// Writes the invoice into an already-opened window and triggers print.
// Open the window synchronously inside the click handler (before any
// await) so popup blockers don't stop it. Returns false if blocked.
export function printInvoiceHtml(html, win) {
  const w = win || window.open('', '_blank');
  if (!w) return false;
  try {
    w.document.open();
    w.document.write(html);
    w.document.close();
    const go = () => { try { w.focus(); w.print(); } catch { /* user can print manually */ } };
    if (w.document.readyState === 'complete') setTimeout(go, 350);
    else w.onload = () => setTimeout(go, 350);
    return true;
  } catch {
    return false;
  }
}
