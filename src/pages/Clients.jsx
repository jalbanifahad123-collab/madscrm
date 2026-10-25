import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Download, UserPlus, Users, Activity, Wallet, ArrowUp, Phone, Mail, MapPin,
  Pencil, Trash2, Plus, FileText
} from 'lucide-react';
import { Card, IconBadge, Avatar, StagePill, CountUp, PageHeader } from '../components/ui';
import InvoiceModal from '../components/InvoiceModal';
import {
  fmtM, fmtCompact, fmtDate, paidOf, remainingOf, statusOf, clientTotals, CLIENT_STATUSES
} from '../data';

export default function Clients({ clients, invoices, payments, settings, toast, onAddClient, onEditClient, onDeleteClient, onAddInvoice, onEditInvoice, onDeleteInvoice, onRecordPayment, onDeletePayment }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [onlyBalance, setOnlyBalance] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [viewInv, setViewInv] = useState(null);

  const totals = useMemo(() => {
    const map = {};
    clients.forEach((c) => { map[c.id] = clientTotals(c.id, invoices, payments); });
    return map;
  }, [clients, invoices, payments]);

  const counts = useMemo(() => {
    const c = { All: clients.length };
    CLIENT_STATUSES.forEach((f) => { c[f] = clients.filter((x) => x.status === f).length; });
    return c;
  }, [clients]);

  const shown = clients.filter((c) =>
    (filter === 'All' || c.status === filter) &&
    (!onlyBalance || (totals[c.id]?.balance || 0) > 0) &&
    (c.name + c.company + c.email + c.phone + c.city).toLowerCase().includes(query.toLowerCase())
  );

  const selected = clients.find((c) => c.id === selectedId) || shown[0] || clients[0] || null;
  const selTotals = selected ? totals[selected.id] : null;
  const selInvoices = selected ? invoices.filter((i) => i.clientId === selected.id).sort((a, b) => (a.date < b.date ? 1 : -1)) : [];
  const selPayments = selected ? payments.filter((p) => p.clientId === selected.id).sort((a, b) => (a.date < b.date ? 1 : -1)) : [];
  const invoiceNo = (id) => invoices.find((i) => i.id === id)?.no || '';

  const grand = useMemo(() => ({
    billed: invoices.reduce((a, i) => a + Number(i.amount || 0), 0),
    paid: payments.reduce((a, p) => a + Number(p.amount || 0), 0),
    balance: invoices.reduce((a, i) => a + remainingOf(i, payments), 0),
  }), [invoices, payments]);

  const exportCSV = () => {
    const csv = 'Name,Company,Phone,Email,City,Status,Billed,Paid,Balance\n' +
      clients.map((c) => {
        const t = totals[c.id];
        return [c.name, c.company, c.phone, c.email, c.city, c.status, t.billed, t.paid, t.balance].join(',');
      }).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'clients.csv'; a.click();
    toast('Clients exported as CSV');
  };

  const stats = [
    { icon: <Users size={14} />, tone: 'blueSoft', label: 'Total clients', value: clients.length, fmt: (v) => Math.round(v), sub: `${counts.Active || 0} currently active` },
    { icon: <Activity size={14} />, tone: 'limeSoft', label: 'Total billed', value: grand.billed, fmt: (v) => fmtM(v, settings), sub: 'Across all invoices' },
    { icon: <Wallet size={14} />, tone: 'black', label: 'Total collected', value: grand.paid, fmt: (v) => fmtM(v, settings), sub: 'Payments received so far' },
    { icon: <ArrowUp size={14} />, tone: 'redSoft', label: 'Outstanding', value: grand.balance, fmt: (v) => fmtM(v, settings), sub: 'Still to collect from clients' },
  ];

  const iconBtn = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 transition hover:bg-white hover:shadow-sm dark:bg-white/[0.06] dark:hover:bg-white/10';

  return (
    <div>
      <PageHeader title="Clients" subtitle="All your clients — who paid what, and what is still due" badge={false}>
        <label className="hidden items-center gap-2 rounded-full border border-black/[0.05] bg-white px-3.5 py-2 dark:border-white/10 dark:bg-white/[0.05] md:flex">
          <Search size={14} className="text-neutral-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, phone, company…" className="w-56 bg-transparent text-[12.5px] font-medium text-neutral-700 outline-none placeholder:text-neutral-400 dark:text-neutral-200" />
        </label>
        <button onClick={exportCSV} title="Export CSV" className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.05] bg-white text-neutral-500 transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-200"><Download size={15} /></button>
        <button onClick={onAddClient} className="flex items-center gap-1.5 rounded-full bg-[#2248f5] px-4 py-2.5 text-[12.5px] font-semibold text-white transition hover:bg-[#1a3bd0] active:scale-[0.98]"><UserPlus size={15} /> Add client</button>
      </PageHeader>
      <label className="mb-4 flex items-center gap-2 rounded-full border border-black/[0.05] bg-white px-3.5 py-2.5 dark:border-white/10 dark:bg-white/[0.05] md:hidden">
        <Search size={14} className="text-neutral-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search clients…" className="w-full bg-transparent text-[12.5px] font-medium outline-none placeholder:text-neutral-400 dark:text-neutral-200" />
      </label>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 [&>*]:min-w-0">
        {stats.map((s, i) => (
          <Card key={s.label} hover className="p-4">
            <div className="flex items-center gap-2">
              <IconBadge tone={s.tone} className="h-6 w-6">{s.icon}</IconBadge>
              <span className="text-[12px] font-semibold text-neutral-500 dark:text-neutral-400">{s.label}</span>
            </div>
            <p className="mt-3 truncate text-[22px] font-bold leading-none tracking-tight text-neutral-900 dark:text-white"><CountUp value={s.value} format={s.fmt} duration={900 + i * 120} /></p>
            <p className="mt-1 text-[11px] text-neutral-400">{s.sub}</p>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid items-start gap-4 [&>*]:min-w-0 lg:grid-cols-[1.85fr_1fr]">
        {/* Table */}
        <Card className="p-5 lg:self-stretch">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <IconBadge><Users size={14} /></IconBadge>
              <span className="text-[14px] font-bold text-neutral-900 dark:text-white">All clients</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['All', ...CLIENT_STATUSES].map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition ${filter === f ? 'bg-[#17171a] text-white dark:bg-white dark:text-black' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-white/[0.06] dark:text-neutral-300 dark:hover:bg-white/10'}`}>
                  {f} <span className="opacity-60">{counts[f]}</span>
                </button>
              ))}
              <button onClick={() => setOnlyBalance(!onlyBalance)}
                className={`rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition ${onlyBalance ? 'bg-[#e5484d] text-white' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-white/[0.06] dark:text-neutral-300'}`}>
                With balance
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] table-fixed text-left">
              <colgroup>
                <col />
                <col style={{ width: 96 }} />
                <col style={{ width: 104 }} />
                <col style={{ width: 104 }} />
                <col style={{ width: 104 }} />
              </colgroup>
              <thead>
                <tr className="border-b border-neutral-100 text-[10px] font-semibold tracking-[0.08em] text-neutral-400 dark:border-white/[0.06]">
                  <th className="pb-2.5 pr-3">CLIENT</th><th className="pb-2.5 pr-3">STATUS</th>
                  <th className="pb-2.5 pr-3">BILLED</th><th className="pb-2.5 pr-3">PAID</th><th className="pb-2.5">BALANCE</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((c, i) => {
                  const t = totals[c.id];
                  const isSel = selected && c.id === selected.id;
                  return (
                    <motion.tr key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      onClick={() => setSelectedId(c.id)}
                      className={`cursor-pointer border-b border-neutral-50 transition last:border-0 dark:border-white/[0.04] ${isSel ? 'bg-blue-50/70 dark:bg-blue-500/10' : 'hover:bg-neutral-50 dark:hover:bg-white/[0.03]'}`}>
                      <td className="py-3 pr-3">
                        <span className="flex items-center gap-2.5">
                          <Avatar initials={c.initials} color={c.color} size={32} />
                          <span className="min-w-0 flex-1">
                            <b className="block truncate text-[13px] font-semibold leading-tight text-neutral-800 dark:text-neutral-100">{c.name}</b>
                            <span className="block truncate text-[11px] text-neutral-400">{c.company}{c.phone ? ' · ' + c.phone : ''}</span>
                          </span>
                        </span>
                      </td>
                      <td className="py-3 pr-3"><StagePill stage={c.status} /></td>
                      <td className="whitespace-nowrap py-3 pr-3 text-[12.5px] font-semibold text-neutral-700 dark:text-neutral-200">{fmtM(t.billed, settings)}</td>
                      <td className="whitespace-nowrap py-3 pr-3 text-[12.5px] font-semibold text-[#149e55]">{fmtM(t.paid, settings)}</td>
                      <td className={`py-3 text-[12.5px] font-bold ${t.balance > 0 ? (t.overdue > 0 ? 'text-[#e5484d]' : 'text-[#e8912d]') : 'text-neutral-400'}`}>
                        <span className="whitespace-nowrap">{t.balance > 0 ? fmtM(t.balance, settings) : 'Clear'}</span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            {shown.length === 0 && <p className="py-10 text-center text-[13px] text-neutral-400">No client found. <button onClick={onAddClient} className="font-semibold text-[#2248f5] hover:underline">Add your first client</button></p>}
          </div>
        </Card>

        {/* Detail panel */}
        <Card className="p-5 lg:sticky lg:top-[92px]">
          {selected && selTotals ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar initials={selected.initials} color={selected.color} size={44} />
                  <span className="min-w-0">
                    <b className="block truncate text-[15px] font-bold leading-tight text-neutral-900 dark:text-white">{selected.name}</b>
                    <span className="block truncate text-[11.5px] text-neutral-400">{selected.company}</span>
                  </span>
                </span>
                <StagePill stage={selected.status} />
              </div>

              <div className="mt-3.5 space-y-1.5 text-[12px] text-neutral-500 dark:text-neutral-400">
                {selected.phone && <p className="flex items-center gap-2"><Phone size={12} className="shrink-0 text-neutral-400" />{selected.phone}</p>}
                {selected.email && <p className="flex items-center gap-2"><Mail size={12} className="shrink-0 text-neutral-400" /><span className="break-all">{selected.email}</span></p>}
                {selected.city && <p className="flex items-center gap-2"><MapPin size={12} className="shrink-0 text-neutral-400" />{selected.city} · client since {fmtDate(selected.since)}</p>}
                {selected.notes && <p className="rounded-xl bg-neutral-50 px-3 py-2 text-[11.5px] italic dark:bg-white/[0.04]">“{selected.notes}”</p>}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[['Billed', selTotals.billed, 'text-neutral-800 dark:text-neutral-100'], ['Paid', selTotals.paid, 'text-[#149e55]'], ['Balance', selTotals.balance, selTotals.balance > 0 ? 'text-[#e5484d]' : 'text-neutral-400']].map(([label, v, cls]) => (
                  <div key={label} className="rounded-2xl bg-neutral-50 px-2 py-2.5 dark:bg-white/[0.04]">
                    <p className="text-[10px] font-semibold tracking-wide text-neutral-400">{label.toUpperCase()}</p>
                    <p className={`mt-0.5 truncate text-[13px] font-bold ${cls}`} title={fmtM(v, settings)}>{v >= 10000000 ? fmtCompact(v, settings) : fmtM(v, settings)}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3.5 flex gap-2">
                <button onClick={() => onAddInvoice(selected.id)} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#2248f5] px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-[#1a3bd0]"><Plus size={14} /> Invoice</button>
                <button onClick={() => onEditClient(selected)} className="flex items-center justify-center gap-1.5 rounded-full bg-neutral-100 px-3.5 py-2 text-[12px] font-semibold text-neutral-600 transition hover:bg-neutral-200 dark:bg-white/[0.07] dark:text-neutral-200"><Pencil size={13} /> Edit</button>
                <button onClick={() => onDeleteClient(selected)} title="Delete client" className="flex items-center justify-center rounded-full bg-[#fdeceb] px-3 py-2 text-[#e5484d] transition hover:bg-[#fbd9d7] dark:bg-red-500/15"><Trash2 size={14} /></button>
              </div>

              <p className="mb-2 mt-5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-neutral-400"><FileText size={12} /> INVOICES ({selInvoices.length})</p>
              <div className="max-h-[300px] space-y-2 overflow-y-auto pr-0.5">
                {selInvoices.map((inv) => {
                  const paid = paidOf(inv.id, payments);
                  const rem = remainingOf(inv, payments);
                  const st = statusOf(inv, payments);
                  return (
                    <div key={inv.id} className="rounded-2xl border border-black/[0.04] bg-neutral-50 px-3.5 py-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
                      <div className="flex items-center justify-between gap-2">
                        <b className="min-w-0 truncate text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-100">{inv.no} · {inv.title}</b>
                        <StagePill stage={st} />
                      </div>
                      <p className="mt-1 text-[11px] text-neutral-400">
                        <span className="whitespace-nowrap">{fmtM(paid, settings)} paid of {fmtM(inv.amount, settings)}</span>
                        {rem > 0 && <> · <b className={`whitespace-nowrap ${st === 'Overdue' ? 'text-[#e5484d]' : 'text-neutral-600 dark:text-neutral-300'}`}>{fmtM(rem, settings)} remaining</b> · <span className="whitespace-nowrap">due {fmtDate(inv.due)}</span></>}
                      </p>
                      <span className="mt-2 block h-[5px] overflow-hidden rounded-full bg-neutral-200/70 dark:bg-white/10">
                        <span className={`block h-full rounded-full ${st === 'Paid' ? 'bg-[#16b364]' : st === 'Overdue' ? 'bg-[#f04438]' : 'bg-[#f5a524]'}`} style={{ width: (inv.amount > 0 ? Math.min(100, (paid / inv.amount) * 100) : 0) + '%' }} />
                      </span>
                      <div className="mt-2.5 flex items-center gap-1.5">
                        {rem > 0 && <button onClick={() => onRecordPayment(inv)} className="rounded-full bg-[#2248f5] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#1a3bd0]">Record payment</button>}
                        <span className="flex-1" />
                        <button onClick={() => setViewInv(inv)} className={iconBtn} title="Download invoice"><Download size={12} /></button>
                        <button onClick={() => onEditInvoice(inv)} className={iconBtn} title="Edit invoice"><Pencil size={12} /></button>
                        <button onClick={() => onDeleteInvoice(inv)} className={iconBtn + ' hover:!text-red-500'} title="Delete invoice"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  );
                })}
                {selInvoices.length === 0 && <p className="py-4 text-center text-[12px] text-neutral-400">This client has no invoices yet.</p>}
              </div>

              <p className="mb-2 mt-5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-neutral-400"><Wallet size={12} /> PAYMENT HISTORY ({selPayments.length})</p>
              <div className="max-h-[220px] space-y-1.5 overflow-y-auto pr-0.5">
                {selPayments.map((p) => (
                  <div key={p.id} className="group flex items-center gap-2.5 rounded-xl bg-neutral-50 px-3 py-2 dark:bg-white/[0.03]">
                    <span className="min-w-0 flex-1">
                      <b className="block text-[12px] font-bold text-[#149e55]">+{fmtM(p.amount, settings)}</b>
                      <span className="text-[10.5px] text-neutral-400">{fmtDate(p.date)} · {p.method} · {invoiceNo(p.invoiceId)}</span>
                    </span>
                    <button onClick={() => onDeletePayment(p)} className={iconBtn + ' h-6 w-6 opacity-0 hover:!text-red-500 group-hover:opacity-100'} title="Delete payment"><Trash2 size={11} /></button>
                  </div>
                ))}
                {selPayments.length === 0 && <p className="py-3 text-center text-[12px] text-neutral-400">No payments received yet.</p>}
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-[13px] text-neutral-400">Select a client or <button onClick={onAddClient} className="font-semibold text-[#2248f5] hover:underline">add a new client</button>.</p>
          )}
        </Card>
      </div>
      {viewInv && <InvoiceModal invoice={viewInv} client={selected} payments={payments} settings={settings} toast={toast} onClose={() => setViewInv(null)} />}
    </div>
  );
}
