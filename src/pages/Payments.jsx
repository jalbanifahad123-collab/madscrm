import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Wallet, FileText, ArrowUp, Activity, Pencil, Trash2, Download } from 'lucide-react';
import { Card, IconBadge, StagePill, CountUp, PageHeader } from '../components/ui';
import InvoiceModal from '../components/InvoiceModal';
import { fmtM, fmtDate, todayISO, paidOf, remainingOf, statusOf, METHODS } from '../data';

const FILTERS = ['All', 'Unpaid', 'Partial', 'Overdue', 'Paid'];

export default function Payments({ clients, invoices, payments, settings, toast, onAddInvoice, onEditInvoice, onDeleteInvoice, onRecordPayment, onDeletePayment }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [viewInv, setViewInv] = useState(null);

  const clientName = (id) => clients.find((c) => c.id === id)?.name || '—';
  const invoiceNo = (id) => invoices.find((i) => i.id === id)?.no || '';

  const enriched = useMemo(() => invoices.map((inv) => ({
    inv, paid: paidOf(inv.id, payments), rem: remainingOf(inv, payments), st: statusOf(inv, payments),
  })).sort((a, b) => (a.inv.date < b.inv.date ? 1 : -1)), [invoices, payments]);

  const counts = useMemo(() => {
    const c = { All: enriched.length };
    FILTERS.slice(1).forEach((f) => { c[f] = enriched.filter((x) => x.st === f).length; });
    return c;
  }, [enriched]);

  const shown = enriched.filter((x) =>
    (filter === 'All' || x.st === filter) &&
    (x.inv.no + x.inv.title + clientName(x.inv.clientId)).toLowerCase().includes(query.toLowerCase())
  );

  const monthKey = todayISO().slice(0, 7);
  const stats = [
    { icon: <Wallet size={14} />, tone: 'black', label: 'Total collected', value: payments.reduce((a, p) => a + Number(p.amount || 0), 0), sub: 'All time payments' },
    { icon: <Activity size={14} />, tone: 'limeSoft', label: 'Collected this month', value: payments.filter((p) => (p.date || '').startsWith(monthKey)).reduce((a, p) => a + Number(p.amount || 0), 0), sub: 'Current month' },
    { icon: <FileText size={14} />, tone: 'blueSoft', label: 'Outstanding', value: enriched.reduce((a, x) => a + x.rem, 0), sub: `${enriched.filter((x) => x.rem > 0).length} open invoices` },
    { icon: <ArrowUp size={14} />, tone: 'redSoft', label: 'Overdue', value: enriched.filter((x) => x.st === 'Overdue').reduce((a, x) => a + x.rem, 0), sub: `${counts.Overdue || 0} invoices late` },
  ];

  const recent = [...payments].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 10);
  const byMethod = METHODS.map((m) => ({
    method: m,
    total: payments.filter((p) => p.method === m).reduce((a, p) => a + Number(p.amount || 0), 0),
  })).filter((x) => x.total > 0).sort((a, b) => b.total - a.total);
  const maxMethod = Math.max(1, ...byMethod.map((x) => x.total));

  const iconBtn = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 transition hover:bg-white hover:shadow-sm dark:bg-white/[0.06] dark:hover:bg-white/10';

  return (
    <div>
      <PageHeader title="Payments & Invoices" subtitle="Every invoice's status and every payment's record — paid, partial and overdue, all clear" badge={false}>
        <label className="hidden items-center gap-2 rounded-full border border-black/[0.05] bg-white px-3.5 py-2 dark:border-white/10 dark:bg-white/[0.05] md:flex">
          <Search size={14} className="text-neutral-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoice, client…" className="w-48 bg-transparent text-[12.5px] font-medium text-neutral-700 outline-none placeholder:text-neutral-400 dark:text-neutral-200" />
        </label>
        <button onClick={() => onAddInvoice()} className="flex items-center gap-1.5 rounded-full bg-[#2248f5] px-4 py-2.5 text-[12.5px] font-semibold text-white transition hover:bg-[#1a3bd0] active:scale-[0.98]"><Plus size={15} /> New invoice</button>
      </PageHeader>
      <label className="mb-4 flex items-center gap-2 rounded-full border border-black/[0.05] bg-white px-3.5 py-2.5 dark:border-white/10 dark:bg-white/[0.05] md:hidden">
        <Search size={14} className="text-neutral-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoices…" className="w-full bg-transparent text-[12.5px] font-medium outline-none placeholder:text-neutral-400 dark:text-neutral-200" />
      </label>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 [&>*]:min-w-0">
        {stats.map((s, i) => (
          <Card key={s.label} hover className="p-4">
            <div className="flex items-center gap-2">
              <IconBadge tone={s.tone} className="h-6 w-6">{s.icon}</IconBadge>
              <span className="text-[12px] font-semibold text-neutral-500 dark:text-neutral-400">{s.label}</span>
            </div>
            <p className="mt-3 truncate text-[22px] font-bold leading-none tracking-tight text-neutral-900 dark:text-white"><CountUp value={s.value} format={(v) => fmtM(v, settings)} duration={900 + i * 120} /></p>
            <p className="mt-1 text-[11px] text-neutral-400">{s.sub}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <IconBadge><FileText size={14} /></IconBadge>
            <span className="text-[14px] font-bold text-neutral-900 dark:text-white">Invoices</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition ${filter === f ? 'bg-[#17171a] text-white dark:bg-white dark:text-black' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-white/[0.06] dark:text-neutral-300 dark:hover:bg-white/10'}`}>
                {f} <span className="opacity-60">{counts[f]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[1020px] table-fixed text-left">
            <colgroup>
              <col />
              <col style={{ width: 150 }} />
              <col style={{ width: 88 }} />
              <col style={{ width: 108 }} />
              <col style={{ width: 108 }} />
              <col style={{ width: 108 }} />
              <col style={{ width: 96 }} />
              <col style={{ width: 222 }} />
            </colgroup>
            <thead>
              <tr className="border-b border-neutral-100 text-[10px] font-semibold tracking-[0.08em] text-neutral-400 dark:border-white/[0.06]">
                <th className="pb-2.5 pr-3">INVOICE</th><th className="pb-2.5 pr-3">CLIENT</th><th className="pb-2.5 pr-3">DUE</th>
                <th className="pb-2.5 pr-3">AMOUNT</th><th className="pb-2.5 pr-3">PAID</th><th className="pb-2.5 pr-3">REMAINING</th>
                <th className="pb-2.5 pr-3">STATUS</th><th className="pb-2.5" />
              </tr>
            </thead>
            <tbody>
              {shown.map(({ inv, paid, rem, st }, i) => (
                <motion.tr key={inv.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="group border-b border-neutral-50 transition last:border-0 hover:bg-neutral-50 dark:border-white/[0.04] dark:hover:bg-white/[0.03]">
                  <td className="py-3 pr-3">
                    <b className="block text-[12.5px] font-semibold leading-tight text-neutral-800 dark:text-neutral-100">{inv.no}</b>
                    <span className="block max-w-[220px] truncate text-[11px] text-neutral-400">{inv.title}</span>
                  </td>
                  <td className="py-3 pr-3 text-[12.5px] font-medium text-neutral-700 dark:text-neutral-200"><span className="block max-w-[170px] truncate">{clientName(inv.clientId)}</span></td>
                  <td className={`whitespace-nowrap py-3 pr-3 text-[12px] ${st === 'Overdue' ? 'font-bold text-[#e5484d]' : 'text-neutral-500 dark:text-neutral-400'}`}>{fmtDate(inv.due)}</td>
                  <td className="whitespace-nowrap py-3 pr-3 text-[12.5px] font-semibold text-neutral-700 dark:text-neutral-200">{fmtM(inv.amount, settings)}</td>
                  <td className="whitespace-nowrap py-3 pr-3 text-[12.5px] font-semibold text-[#149e55]">{fmtM(paid, settings)}</td>
                  <td className={`whitespace-nowrap py-3 pr-3 text-[12.5px] font-bold ${rem > 0 ? 'text-neutral-800 dark:text-neutral-100' : 'text-neutral-400'}`}>{rem > 0 ? fmtM(rem, settings) : '—'}</td>
                  <td className="py-3 pr-3"><StagePill stage={st} /></td>
                  <td className="py-3">
                    <span className="flex items-center justify-end gap-1.5">
                      {rem > 0 && <button onClick={() => onRecordPayment(inv)} className="shrink-0 whitespace-nowrap rounded-full bg-[#2248f5] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#1a3bd0]">Record payment</button>}
                      <button onClick={() => setViewInv(inv)} className={iconBtn} title="Download invoice"><Download size={12} /></button>
                      <button onClick={() => onEditInvoice(inv)} className={iconBtn} title="Edit"><Pencil size={12} /></button>
                      <button onClick={() => onDeleteInvoice(inv)} className={iconBtn + ' hover:!text-red-500'} title="Delete"><Trash2 size={12} /></button>
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <p className="py-10 text-center text-[13px] text-neutral-400">No invoices in this filter. <button onClick={() => onAddInvoice()} className="font-semibold text-[#2248f5] hover:underline">Create a new invoice</button></p>}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 [&>*]:min-w-0 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-5">
          <span className="text-[13.5px] font-semibold text-neutral-800 dark:text-neutral-100">Recent payments</span>
          <div className="mt-3 space-y-1.5">
            {recent.map((p) => (
              <div key={p.id} className="group flex items-center gap-3 rounded-2xl bg-neutral-50 px-3.5 py-2.5 dark:bg-white/[0.03]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e7f9ec] text-[#149e55] dark:bg-emerald-500/15"><Wallet size={13} /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-baseline gap-1"><b className="min-w-0 truncate text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-100">{clientName(p.clientId)}</b><span className="shrink-0 text-[12.5px] font-medium text-neutral-400">· {invoiceNo(p.invoiceId)}</span></span>
                  <span className="block truncate text-[11px] text-neutral-400">{fmtDate(p.date)} · {p.method}{p.note ? ' · ' + p.note : ''}</span>
                </span>
                <b className="shrink-0 whitespace-nowrap text-[13px] font-bold text-[#149e55]">+{fmtM(p.amount, settings)}</b>
                <button onClick={() => onDeletePayment(p)} className={iconBtn + ' h-6 w-6 opacity-0 hover:!text-red-500 group-hover:opacity-100'} title="Delete payment"><Trash2 size={11} /></button>
              </div>
            ))}
            {recent.length === 0 && <p className="py-6 text-center text-[12px] text-neutral-400">No payments recorded yet.</p>}
          </div>
        </Card>

        <Card className="p-5">
          <span className="text-[13.5px] font-semibold text-neutral-800 dark:text-neutral-100">Payment methods</span>
          <p className="mt-0.5 text-[11px] text-neutral-400">Where most of your money comes from</p>
          <div className="mt-4 space-y-3">
            {byMethod.map((x, i) => (
              <div key={x.method}>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-medium text-neutral-600 dark:text-neutral-300">{x.method}</span>
                  <b className="text-neutral-800 dark:text-neutral-100">{fmtM(x.total, settings)}</b>
                </div>
                <span className="mt-1.5 block h-[6px] overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
                  <motion.span initial={{ width: 0 }} animate={{ width: (x.total / maxMethod) * 100 + '%' }} transition={{ duration: 0.8, delay: i * 0.07 }}
                    className="block h-full rounded-full bg-[#2248f5]" />
                </span>
              </div>
            ))}
            {byMethod.length === 0 && <p className="py-4 text-center text-[12px] text-neutral-400">No data yet.</p>}
          </div>
        </Card>
      </div>
      {viewInv && <InvoiceModal invoice={viewInv} client={clients.find((c) => c.id === viewInv.clientId) || null} payments={payments} settings={settings} toast={toast} onClose={() => setViewInv(null)} />}
    </div>
  );
}
