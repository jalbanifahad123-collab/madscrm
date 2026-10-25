// ── Shared data & helpers for the Mads Agency business dashboard ──

// ────────────────────────────────────────────────────────────────
// Business CRM layer — clients, invoices, payments (real use)
// ────────────────────────────────────────────────────────────────

export const PALETTE = ['#2b59ff', '#22a06b', '#e5484d', '#f5a524', '#a259ff', '#26262b', '#0891b2', '#c47b4a'];

export const CURRENCY_SYMBOLS = { PKR: 'Rs ', USD: '$', EUR: '€', GBP: '£', AED: 'AED ' };

export const defaultSettings = {
  businessName: 'Mads Agency',
  ownerName: 'Mads Team',
  currency: 'PKR',
  monthlyGoal: 500000,
  paymentDetails: '',
  sampleData: false,
};

export const METHODS = ['Bank transfer', 'Cash', 'JazzCash', 'Easypaisa', 'Card', 'Cheque'];
export const CLIENT_STATUSES = ['Active', 'Lead', 'Inactive'];

const sym = (s) => CURRENCY_SYMBOLS[s?.currency || 'PKR'] || '';
export const fmtM = (n, s) => {
  if (n == null) return '—';
  const loc = (s?.currency || 'PKR') === 'PKR' ? 'en-PK' : 'en-US';
  return sym(s) + Number(n || 0).toLocaleString(loc, { maximumFractionDigits: 0 });
};
export const fmtCompact = (n, s) =>
  sym(s) + Number(n || 0).toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export const todayISO = () => new Date().toLocaleDateString('en-CA'); // yyyy-mm-dd (local)
export const fmtDate = (iso) =>
  iso ? new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const initialsOf = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '??';

// invoice money math — "paid" is always derived from payments, never out of sync
export const paidOf = (invoiceId, payments) =>
  payments.filter((p) => p.invoiceId === invoiceId).reduce((a, p) => a + Number(p.amount || 0), 0);
export const remainingOf = (inv, payments) => Math.max(0, Number(inv.amount || 0) - paidOf(inv.id, payments));
export const statusOf = (inv, payments) => {
  const paid = paidOf(inv.id, payments);
  if (inv.amount - paid <= 0) return 'Paid';
  if (inv.due && inv.due < todayISO()) return 'Overdue';
  return paid > 0 ? 'Partial' : 'Unpaid';
};

export function clientTotals(clientId, invoices, payments) {
  const invs = invoices.filter((i) => i.clientId === clientId);
  const pays = payments.filter((p) => p.clientId === clientId);
  const billed = invs.reduce((a, i) => a + Number(i.amount || 0), 0);
  const paid = pays.reduce((a, p) => a + Number(p.amount || 0), 0);
  const balance = invs.reduce((a, i) => a + remainingOf(i, payments), 0);
  const overdue = invs.filter((i) => statusOf(i, payments) === 'Overdue')
    .reduce((a, i) => a + remainingOf(i, payments), 0);
  const lastPay = pays.length ? [...pays].sort((a, b) => (a.date < b.date ? 1 : -1))[0] : null;
  return { billed, paid, balance, overdue, open: invs.filter((i) => remainingOf(i, payments) > 0).length, lastPay };
}

export function lastMonths(payments, invoices, n = 6) {
  const out = [];
  const now = new Date();
  for (let k = n - 1; k >= 0; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    const key = d.toLocaleDateString('en-CA').slice(0, 7); // yyyy-mm
    out.push({
      key,
      label: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      collected: payments.filter((p) => (p.date || '').startsWith(key)).reduce((a, p) => a + Number(p.amount || 0), 0),
      billed: invoices.filter((i) => (i.date || '').startsWith(key)).reduce((a, i) => a + Number(i.amount || 0), 0),
    });
  }
  return out;
}

// ── Projects pipeline (agency workflow) ──
export const PROJECT_STAGES = ['Leads', 'Convert', 'Working', 'Completed'];
export const STAGE_PROGRESS = { Leads: 10, Convert: 40, Working: 70, Completed: 100 };
export const STAGE_COLORS = { Leads: '#7aa2ff', Convert: '#f5a524', Working: '#2f6bff', Completed: '#22c15e' };
export const SERVICES = ['Website Development', 'App Development', 'Graphic Designing', 'Video Editing', 'Social Media', 'UI/UX Design'];
export const SOURCES = ['WhatsApp', 'Instagram', 'Facebook', 'Website', 'Referral', 'Cold outreach'];
