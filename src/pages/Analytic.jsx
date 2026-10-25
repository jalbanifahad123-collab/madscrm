import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Wallet, Activity, FileText, ArrowUp } from 'lucide-react';
import { Card, IconBadge, Avatar, CountUp, PageHeader, StagePill } from '../components/ui';
import { fmtM, fmtCompact, statusOf, remainingOf, lastMonths } from '../data';

export default function Analytic({ clients, invoices, payments, settings, toast }) {
  const a = useMemo(() => {
    const billed = invoices.reduce((x, i) => x + Number(i.amount || 0), 0);
    const paid = payments.reduce((x, p) => x + Number(p.amount || 0), 0);
    const rate = billed > 0 ? Math.round((paid / billed) * 100) : 0;
    const avgInvoice = invoices.length ? Math.round(billed / invoices.length) : 0;

    // average days to fully pay an invoice
    const payDays = [];
    invoices.forEach((inv) => {
      const ps = payments.filter((p) => p.invoiceId === inv.id).sort((x, y) => (x.date < y.date ? -1 : 1));
      let acc = 0;
      for (const p of ps) {
        acc += Number(p.amount || 0);
        if (acc >= inv.amount) {
          payDays.push(Math.max(0, Math.round((new Date(p.date + 'T12:00:00') - new Date(inv.date + 'T12:00:00')) / 86400000)));
          break;
        }
      }
    });
    const avgDays = payDays.length ? Math.round(payDays.reduce((x, y) => x + y, 0) / payDays.length) : null;

    const overdueAmt = invoices.filter((i) => statusOf(i, payments) === 'Overdue').reduce((x, i) => x + remainingOf(i, payments), 0);
    const months = lastMonths(payments, invoices, 6);
    const best = [...months].sort((x, y) => y.collected - x.collected)[0];

    const topClients = clients.map((c) => ({
      client: c,
      paid: payments.filter((p) => p.clientId === c.id).reduce((x, p) => x + Number(p.amount || 0), 0),
      billed: invoices.filter((i) => i.clientId === c.id).reduce((x, i) => x + Number(i.amount || 0), 0),
    })).filter((x) => x.billed > 0 || x.paid > 0).sort((x, y) => y.paid - x.paid).slice(0, 5);

    const statusCounts = ['Paid', 'Partial', 'Unpaid', 'Overdue'].map((s) => ({
      status: s,
      count: invoices.filter((i) => statusOf(i, payments) === s).length,
      amount: invoices.filter((i) => statusOf(i, payments) === s).reduce((x, i) => x + remainingOf(i, payments), 0),
    }));

    return { billed, paid, rate, avgInvoice, avgDays, overdueAmt, months, best, topClients, statusCounts };
  }, [clients, invoices, payments]);

  const maxBar = Math.max(1, ...a.months.map((m) => Math.max(m.billed, m.collected)));
  const maxTop = Math.max(1, ...a.topClients.map((x) => x.paid));

  const stats = [
    { icon: <Activity size={14} />, tone: 'limeSoft', label: 'Collection rate', value: a.rate, fmt: (v) => Math.round(v) + '%', sub: 'Share of the billed amount collected' },
    { icon: <FileText size={14} />, tone: 'blueSoft', label: 'Avg. invoice value', value: a.avgInvoice, fmt: (v) => fmtM(v, settings), sub: `Across ${invoices.length} invoices` },
    { icon: <Wallet size={14} />, tone: 'black', label: 'Avg. days to pay', value: a.avgDays ?? 0, fmt: (v) => (a.avgDays == null ? '—' : Math.round(v) + ' days'), sub: 'From invoice to full payment' },
    { icon: <ArrowUp size={14} />, tone: 'redSoft', label: 'Overdue amount', value: a.overdueAmt, fmt: (v) => fmtM(v, settings), sub: 'Total of late payments' },
  ];

  return (
    <div>
      <PageHeader title="Analytics" subtitle="All these numbers come from your real clients, invoices and payments" badge={false} />

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

      <div className="mt-4 grid gap-4 [&>*]:min-w-0 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <IconBadge><BarChart3 size={14} /></IconBadge>
              <span className="text-[14px] font-bold text-neutral-900 dark:text-white">Billed vs Collected</span>
            </div>
            {a.best && a.best.collected > 0 && <span className="rounded-full bg-[#e7f9ec] px-2.5 py-1 text-[11px] font-bold text-[#149e55] dark:bg-emerald-500/15">Best month: {a.best.label} · {fmtM(a.best.collected, settings)}</span>}
          </div>
          <div className="mb-1 mt-6 flex items-center">
            <span className="text-[10.5px] font-medium text-neutral-400">Amount ({settings.currency})</span>
            <span className="mx-3 flex-1 border-t border-dashed border-neutral-300 dark:border-white/15" />
            <span className="flex items-center gap-3 text-[10.5px] font-medium text-neutral-400">
              <span className="flex items-center gap-1"><i className="h-[7px] w-[7px] rounded-full bg-[#dbe4ff]" />Billed</span>
              <span className="flex items-center gap-1"><i className="h-[7px] w-[7px] rounded-full bg-[#2248f5]" />Collected</span>
            </span>
          </div>
          <div className="flex items-end gap-3 pt-2">
            {a.months.map((m, i) => (
              <div key={m.key} className="flex flex-1 flex-col items-center gap-2" title={`${m.label} — billed ${fmtM(m.billed, settings)}, collected ${fmtM(m.collected, settings)}`}>
                <span className="flex h-[110px] items-end gap-1">
                  <motion.span initial={{ height: 0 }} animate={{ height: Math.max(3, (m.billed / maxBar) * 110) }} transition={{ duration: 0.7, delay: i * 0.05 }} className="block w-[14px] rounded-t-[6px] bg-[#dbe4ff]" />
                  <motion.span initial={{ height: 0 }} animate={{ height: Math.max(3, (m.collected / maxBar) * 110) }} transition={{ duration: 0.7, delay: 0.1 + i * 0.05 }} className="block w-[14px] rounded-t-[6px] bg-[#2248f5]" />
                </span>
                <span className="text-[10px] font-semibold tracking-wide text-neutral-400">{m.label}</span>
                <span className="-mt-1 text-[9px] font-medium text-neutral-400">{m.collected > 0 ? fmtCompact(m.collected, settings) : ''}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <span className="text-[14px] font-bold text-neutral-900 dark:text-white">Invoice status</span>
          <div className="mt-4 space-y-3">
            {a.statusCounts.map((s) => (
              <div key={s.status} className="flex items-center gap-3">
                <StagePill stage={s.status} />
                <span className="flex-1 text-[12px] text-neutral-500 dark:text-neutral-400">{s.count} invoices</span>
                <b className="whitespace-nowrap text-[12.5px] text-neutral-800 dark:text-neutral-100">{s.status === 'Paid' ? '—' : fmtM(s.amount, settings)}</b>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <span className="text-[14px] font-bold text-neutral-900 dark:text-white">Top clients — your biggest payers</span>
        <div className="mt-4 space-y-3.5">
          {a.topClients.map((x, i) => (
            <div key={x.client.id} className="flex items-center gap-3">
              <Avatar initials={x.client.initials} color={x.client.color} size={32} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="flex min-w-0 items-baseline gap-1.5">
                    <b className="min-w-0 truncate text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">{x.client.name}</b>
                    {x.client.company && <span className="min-w-0 shrink-[2] truncate text-[11px] font-medium text-neutral-400">{x.client.company}</span>}
                  </span>
                  <b className="shrink-0 whitespace-nowrap text-[13px] font-bold text-[#149e55]">{fmtM(x.paid, settings)}</b>
                </span>
                <span className="mt-1.5 block h-[6px] overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
                  <motion.span initial={{ width: 0 }} animate={{ width: (x.paid / maxTop) * 100 + '%' }} transition={{ duration: 0.8, delay: i * 0.07 }} className="block h-full rounded-full bg-[#16b364]" />
                </span>
                <span className="mt-1 block text-[10.5px] text-neutral-400">collected out of {fmtM(x.billed, settings)} billed</span>
              </span>
            </div>
          ))}
          {a.topClients.length === 0 && <p className="py-6 text-center text-[12px] text-neutral-400">Once you add clients and payments, the ranking will appear here.</p>}
        </div>
      </Card>
    </div>
  );
}
