import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, ArrowUp, ArrowDown, ChevronUp, Wallet, Users, FileText, BarChart3, Crosshair, ArrowUpRight
} from 'lucide-react';
import { Card, IconBadge, CountUp, StagePill } from '../components/ui';
import {
  fmtM, fmtCompact, fmtDate, todayISO, paidOf, remainingOf, statusOf, clientTotals, lastMonths,
  PROJECT_STAGES, STAGE_COLORS
} from '../data';

/* pixel-stairs art (the original dashboard's signature) */
function PixelSteps() {
  const cols = [
    ['#f0f9c8'], ['#c9d8ff'], ['#c9d8ff', '#2248f5'],
    ['#c6f542', '#2248f5', '#c9d8ff'],
    ['#2248f5', '#2248f5', '#2248f5', '#7aa2ff'],
    ['#c6f542', '#c6f542', '#c6f542', '#ddfb8f', '#7aa2ff'],
    ['#2248f5', '#2248f5', '#7aa2ff', '#c9d8ff', '#c9d8ff', '#dbe4ff'],
  ];
  return (
    <div className="hidden shrink-0 items-end gap-[3px] sm:flex" aria-hidden>
      {cols.map((col, i) => (
        <div key={i} className="flex flex-col-reverse gap-[3px]">
          {col.map((c, j) => (
            <motion.span key={j} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 + i * 0.07 + j * 0.04 }}
              className="block h-[15px] w-[15px] rounded-[3px]" style={{ background: c }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* Monthly collection goal gauge */
function Gauge({ value, target, settings }) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const r = 76, cx = 100, cy = 92;
  const circumference = 2 * Math.PI * r;
  const arc = circumference * 0.75;
  const angle = (-225 + 270 * pct) * (Math.PI / 180);
  const dotX = cx + r * Math.cos(angle), dotY = cy + r * Math.sin(angle);
  return (
    <div data-testid="goal-gauge" style={{ width: 156, height: 144 }} className="relative h-[144px] w-[156px] shrink-0">
      <svg viewBox="0 0 200 184" className="block h-full w-full" role="img" aria-label="Monthly collection goal gauge">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2a2a30" strokeWidth="11" strokeLinecap="round"
          strokeDasharray={`${arc} ${circumference}`} transform={`rotate(135 ${cx} ${cy})`} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2248f5" strokeWidth="11" strokeLinecap="round"
          strokeDasharray={`${arc} ${circumference}`} strokeDashoffset={arc * (1 - pct)} transform={`rotate(135 ${cx} ${cy})`} />
        <circle cx={dotX} cy={dotY} r="6.5" fill="#fff" /><circle cx={dotX} cy={dotY} r="2.9" fill="#2248f5" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-[11px] font-medium leading-[16px] text-neutral-500">Collected</p>
        <p className="whitespace-nowrap text-[20px] font-bold leading-[26px] tracking-tight text-white">{fmtCompact(value, settings)}</p>
        <p className="whitespace-nowrap text-[10.5px] leading-[15px] text-neutral-500">of {fmtCompact(target, settings)} goal</p>
      </div>
    </div>
  );
}

const daysLate = (due) => Math.round((new Date(todayISO() + 'T12:00:00') - new Date(due + 'T12:00:00')) / 86400000);

export default function Dashboard({ clients, invoices, payments, projects = [], settings, toast, goPage, onAddClient, onAddInvoice, onRecordPayment, onOpenSettings }) {
  const clientName = (id) => clients.find((c) => c.id === id)?.name || '—';
  const invoiceNo = (id) => invoices.find((i) => i.id === id)?.no || '';

  const stats = useMemo(() => {
    const totalPaid = payments.reduce((a, p) => a + Number(p.amount || 0), 0);
    const totalBilled = invoices.reduce((a, i) => a + Number(i.amount || 0), 0);
    const outstanding = invoices.reduce((a, i) => a + remainingOf(i, payments), 0);
    const overdueInvs = invoices.filter((i) => statusOf(i, payments) === 'Overdue')
      .sort((a, b) => (a.due < b.due ? -1 : 1));
    const overdueAmt = overdueInvs.reduce((a, i) => a + remainingOf(i, payments), 0);
    const soon = invoices.filter((i) => {
      const rem = remainingOf(i, payments);
      const d = -daysLate(i.due);
      return rem > 0 && d >= 0 && d <= 7;
    });
    const months = lastMonths(payments, invoices, 6);
    const thisMonth = months[5]?.collected || 0;
    const prevMonth = months[4]?.collected || 0;
    const momPct = prevMonth > 0 ? Math.round(((thisMonth - prevMonth) / prevMonth) * 100) : null;
    const monthKey = todayISO().slice(0, 7);
    const newClients = clients.filter((c) => (c.since || '').startsWith(monthKey)).length;
    const balances = clients.map((c) => ({ client: c, ...clientTotals(c.id, invoices, payments) }))
      .filter((x) => x.balance > 0).sort((a, b) => b.balance - a.balance);
    const recentPays = [...payments].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
    return {
      totalPaid, totalBilled, outstanding, overdueInvs, overdueAmt,
      soonAmt: soon.reduce((a, i) => a + remainingOf(i, payments), 0),
      months, thisMonth, momPct, newClients, balances, recentPays,
      active: clients.filter((c) => c.status === 'Active').length,
      rate: totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0,
    };
  }, [clients, invoices, payments]);

  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' });
  const maxBar = Math.max(1, ...stats.months.map((m) => Math.max(m.collected, m.billed)));
  const stageStats = PROJECT_STAGES.map((st) => ({
    stage: st,
    count: projects.filter((x) => x.stage === st).length,
    value: projects.filter((x) => x.stage === st).reduce((a, x) => a + Number(x.value || 0), 0),
  }));

  return (
    <div className="space-y-4">

      {/* ── Row 1 ─────────────────────────────── */}
      <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-[2.07fr_1fr_1fr]">
        {/* Total collected */}
        <Card className="p-4" hover>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <IconBadge><Wallet size={15} /></IconBadge>
              <span className="text-[13.5px] font-semibold text-neutral-800 dark:text-neutral-100">Total collected</span>
            </div>
            <span className="rounded-full border border-black/[0.06] bg-white px-2.5 py-1 text-[10px] font-semibold tracking-wide text-neutral-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-300">{settings.currency} · ALL TIME</span>
          </div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[34px] font-bold leading-none tracking-tight text-neutral-900 dark:text-white">
                <CountUp value={stats.totalPaid} format={(v) => fmtM(v, settings)} />
              </span>
              <p className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[12px] text-neutral-500 dark:text-neutral-400">
                {stats.momPct != null && (
                  <span className={`flex h-[18px] items-center gap-0.5 rounded-full px-1.5 text-[11px] font-bold text-white ${stats.momPct >= 0 ? 'bg-[#16b364]' : 'bg-[#f04438]'}`}>
                    {stats.momPct >= 0 ? <ArrowUp size={10} strokeWidth={3} /> : <ArrowDown size={10} strokeWidth={3} />}{Math.abs(stats.momPct)}%
                  </span>
                )}
                <span><b className="text-neutral-700 dark:text-neutral-200">{fmtM(stats.thisMonth, settings)}</b> collected in {monthName}</span>
              </p>
            </div>
            <PixelSteps />
          </div>
          <div className="mt-3.5 flex flex-wrap gap-2">
            <button onClick={onAddClient} className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[#2248f5] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#1a3bd0] active:scale-[0.98]"><Plus size={15} strokeWidth={2.5} /> Add Client</button>
            <button onClick={() => onAddInvoice()} className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[#17171a] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-black active:scale-[0.98] dark:bg-white dark:text-black"><FileText size={14} /> New Invoice</button>
            <button onClick={() => goPage('payments')} className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-neutral-100 px-4 py-2 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-200 active:scale-[0.98] dark:bg-white/[0.07] dark:text-neutral-200"><Wallet size={14} /> Payments</button>
          </div>
        </Card>

        {/* Outstanding */}
        <Card className="flex flex-col p-4" hover>
          <div className="flex items-center gap-2.5">
            <IconBadge tone="red"><ArrowUp size={16} strokeWidth={2.5} /></IconBadge>
            <span className="text-[13.5px] font-semibold text-neutral-800 dark:text-neutral-100">Outstanding</span>
          </div>
          <p className="mt-3.5 text-[26px] font-bold leading-none tracking-tight text-neutral-900 dark:text-white">
            <CountUp value={stats.outstanding} format={(v) => fmtM(v, settings)} />
          </p>
          <p className="mt-1.5 text-[11.5px] text-neutral-400">still to collect from clients</p>
          <div className="mt-auto grid grid-cols-2 gap-3 pt-4">
            <div className="border-l-[3px] border-[#f04438] pl-2.5">
              <p className="text-[10.5px] font-medium text-neutral-400">Overdue</p>
              <p className="whitespace-nowrap text-[15px] font-bold text-[#e5484d]" title={fmtM(stats.overdueAmt, settings)}>{stats.overdueAmt >= 1000000 ? fmtCompact(stats.overdueAmt, settings) : fmtM(stats.overdueAmt, settings)}</p>
            </div>
            <div className="border-l-[3px] border-[#f5a524] pl-2.5">
              <p className="text-[10.5px] font-medium text-neutral-400">Due in 7 days</p>
              <p className="whitespace-nowrap text-[15px] font-bold text-neutral-800 dark:text-neutral-100" title={fmtM(stats.soonAmt, settings)}>{stats.soonAmt >= 1000000 ? fmtCompact(stats.soonAmt, settings) : fmtM(stats.soonAmt, settings)}</p>
            </div>
          </div>
        </Card>

        {/* Clients */}
        <Card className="flex flex-col p-4" hover>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <IconBadge tone="green"><Users size={15} /></IconBadge>
              <span className="text-[13.5px] font-semibold text-neutral-800 dark:text-neutral-100">Clients</span>
            </div>
            <button onClick={() => goPage('clients')} className="flex h-7 w-7 items-center justify-center rounded-full bg-[#17171a] text-white transition hover:scale-105 dark:bg-white dark:text-black"><ArrowUpRight size={13} /></button>
          </div>
          <p className="mt-3.5 text-[26px] font-bold leading-none tracking-tight text-neutral-900 dark:text-white">
            {stats.active}<span className="text-[15px] font-semibold text-neutral-400"> active / {clients.length} total</span>
          </p>
          <p className="mt-1.5 text-[11.5px] text-neutral-400">{stats.newClients} new in {monthName}</p>
          <div className="mt-auto pt-4">
            <p className="text-[10.5px] font-medium text-neutral-400">Collection rate (paid / billed)</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="h-[7px] flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
                <motion.span initial={{ width: 0 }} animate={{ width: stats.rate + '%' }} transition={{ duration: 0.9 }} className="block h-full rounded-full bg-[#16b364]" />
              </span>
              <b className="text-[13px] text-[#149e55]">{stats.rate}%</b>
            </div>
          </div>
        </Card>
      </div>

            {/* ── Projects pipeline strip ── */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <IconBadge><BarChart3 size={15} /></IconBadge>
            <span className="text-[13.5px] font-semibold text-neutral-800 dark:text-neutral-100">Projects pipeline</span>
            <span className="hidden text-[11px] text-neutral-400 sm:inline">Leads → Convert → Working → Completed</span>
          </div>
          <button onClick={() => goPage('projects')} className="text-[12px] font-semibold text-[#2248f5] hover:underline">Open board →</button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4 [&>*]:min-w-0">
          {stageStats.map((x) => (
            <button key={x.stage} onClick={() => goPage('projects')} className="rounded-2xl bg-neutral-50 px-3.5 py-3 text-left transition hover:bg-neutral-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]">
              <span className="flex items-center gap-2">
                <i className="h-[9px] w-[9px] shrink-0 rounded-full" style={{ background: STAGE_COLORS[x.stage] }} />
                <span className="text-[12px] font-semibold text-neutral-600 dark:text-neutral-300">{x.stage}</span>
              </span>
              <span className="mt-1.5 flex items-baseline gap-2">
                <b className="text-[20px] font-bold leading-none text-neutral-900 dark:text-white">{x.count}</b>
                <span className="truncate text-[11.5px] font-medium text-neutral-400">{fmtCompact(x.value, settings)}</span>
              </span>
            </button>
          ))}
        </div>
      </Card>

{/* ── Row 2 ─────────────────────────────── */}
      <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-[0.89fr_1fr_0.89fr]">
        {/* Goal + top balances */}
        <Card className="p-4 lg:row-span-2">
          <div className="flex items-center justify-between px-1 pb-3">
            <div className="flex items-center gap-2.5">
              <IconBadge><Crosshair size={15} /></IconBadge>
              <span className="text-[13.5px] font-semibold text-neutral-800 dark:text-neutral-100">Collections goal</span>
            </div>
            <button onClick={onOpenSettings} className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10.5px] font-semibold text-neutral-500 transition hover:bg-neutral-200 dark:bg-white/[0.07] dark:text-neutral-300">Edit goal</button>
          </div>
          <div style={{ height: 188, backgroundColor: '#131316', borderRadius: 18 }} className="relative isolate h-[188px] overflow-hidden rounded-[18px] bg-[#131316] dark:border dark:border-white/10">
            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
              <span className="text-[13px] font-semibold text-neutral-300">{monthName} collections</span>
              <button onClick={() => goPage('analytic')} title="View analytics" className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-black transition hover:scale-110 active:scale-95"><ChevronUp size={13} strokeWidth={3} /></button>
            </div>
            <div className="absolute inset-0 z-[1] flex items-center justify-center pt-6">
              <Gauge value={stats.thisMonth} target={settings.monthlyGoal} settings={settings} />
            </div>
            <button onClick={() => onAddInvoice()} title="New invoice" className="absolute bottom-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[#c6f542] text-black transition hover:scale-105"><Plus size={16} strokeWidth={2.5} /></button>
          </div>

          <p className="mb-2 mt-4 px-1 text-[11px] font-semibold tracking-wide text-neutral-400">TOP BALANCES — who owes you the most</p>
          <div className="space-y-2">
            {stats.balances.slice(0, 5).map((b) => {
              const pctPaid = b.billed > 0 ? Math.round((b.paid / b.billed) * 100) : 0;
              return (
                <button key={b.client.id} onClick={() => goPage('clients')} className="block w-full rounded-2xl bg-neutral-50 px-3.5 py-3 text-left transition hover:bg-neutral-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]">
                  <span className="flex items-center gap-3">
                    <span className="flex-1 truncate text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">{b.client.name}</span>
                    <span className={`text-[12px] font-bold ${b.overdue > 0 ? 'text-[#e5484d]' : 'text-neutral-700 dark:text-neutral-200'}`}>{fmtM(b.balance, settings)}</span>
                  </span>
                  <span className="mt-2 flex items-center gap-2">
                    <span className="relative h-[5px] flex-1 overflow-hidden rounded-full bg-neutral-200/70 dark:bg-white/10">
                      <span className="absolute inset-y-0 left-0 rounded-full bg-[#16b364]" style={{ width: pctPaid + '%' }} />
                    </span>
                    <span className="text-[10.5px] font-medium text-neutral-400">{pctPaid}% paid{b.overdue > 0 ? ' · overdue' : ''}</span>
                  </span>
                </button>
              );
            })}
            {stats.balances.length === 0 && <p className="rounded-2xl bg-neutral-50 px-3.5 py-4 text-center text-[12px] text-neutral-400 dark:bg-white/[0.04]">No client has a balance — all clear 🎉</p>}
          </div>
        </Card>

        {/* 6-month collections */}
        <Card className="h-full p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <IconBadge><BarChart3 size={15} /></IconBadge>
              <span className="text-[13.5px] font-semibold text-neutral-800 dark:text-neutral-100">Collections — 6 months</span>
            </div>
            <span className="text-[11px] font-medium text-neutral-400">billed vs collected</span>
          </div>
          <div className="mt-6 flex items-end gap-3">
            {stats.months.map((m, i) => {
              const barH = Math.max(6, (Math.max(m.billed, m.collected) / maxBar) * 86);
              return (
              <div key={m.key} className="flex min-w-0 flex-1 flex-col items-center gap-2" title={`${m.label}: billed ${fmtM(m.billed, settings)} · collected ${fmtM(m.collected, settings)}`}>
                <span className="flex h-[108px] w-full max-w-[44px] flex-col items-center justify-end">
                  <span className="mb-1.5 whitespace-nowrap text-[9.5px] font-bold text-neutral-500 dark:text-neutral-400">{m.collected > 0 ? fmtCompact(m.collected, settings) : ''}</span>
                  <span className="relative block w-full overflow-hidden rounded-b-[10px] rounded-t-[14px]" style={{ height: barH }}>
                    <span className="absolute inset-x-0 bottom-0 block w-full bg-neutral-100 dark:bg-white/[0.06]" style={{ height: Math.max(4, (m.billed / maxBar) * 86) }} />
                    <motion.span initial={{ height: 0 }} animate={{ height: (m.collected / maxBar) * 86 }} transition={{ duration: 0.8, delay: i * 0.06 }}
                      className={`absolute inset-x-0 bottom-0 block ${i === 5 ? 'bg-[#2248f5]' : 'bg-[#7aa2ff]'}`} />
                  </span>
                </span>
                <span className={`text-[10px] font-semibold tracking-wide ${i === 5 ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'}`}>{m.label}</span>
              </div>
              );
            })}
          </div>
        </Card>

        {/* Needs attention */}
        <Card className="flex h-full flex-col p-4">
          <div className="flex items-center justify-between">
            <span className="text-[13.5px] font-semibold text-neutral-800 dark:text-neutral-100">Needs attention</span>
            <span className="rounded-full bg-[#fdeceb] px-2 py-0.5 text-[10.5px] font-bold text-[#e5484d] dark:bg-red-500/15">{stats.overdueInvs.length} overdue</span>
          </div>
          <div className="mt-3 space-y-2">
            {stats.overdueInvs.slice(0, 4).map((inv) => (
              <div key={inv.id} className="rounded-2xl bg-neutral-50 px-3.5 py-3 dark:bg-white/[0.04]">
                <div className="flex items-center gap-2.5">
                  <b className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-100">{clientName(inv.clientId)}</b>
                  <b className="shrink-0 whitespace-nowrap text-[12.5px] text-[#e5484d]">{fmtM(remainingOf(inv, payments), settings)}</b>
                  <button onClick={() => onRecordPayment(inv)} className="shrink-0 whitespace-nowrap rounded-full bg-[#2248f5] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#1a3bd0]">Record</button>
                </div>
                <p className="mt-1 truncate text-[11px] text-neutral-400">{inv.no} · {daysLate(inv.due)}d overdue · due {fmtDate(inv.due)}</p>
              </div>
            ))}
            {stats.overdueInvs.length === 0 && <p className="rounded-2xl bg-neutral-50 px-3.5 py-4 text-center text-[12px] text-neutral-400 dark:bg-white/[0.04]">No overdue invoices. All good ✅</p>}
          </div>
          <button onClick={() => goPage('payments')} className="mt-auto pt-3 text-left text-[12px] font-semibold text-[#2248f5] hover:underline">View all invoices →</button>
        </Card>

        {/* Recent payments */}
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <IconBadge><Wallet size={14} /></IconBadge>
              <span className="text-[13.5px] font-semibold text-neutral-800 dark:text-neutral-100">Recent payments</span>
            </div>
            <button onClick={() => goPage('payments')} className="text-[12px] font-semibold text-[#2248f5] hover:underline">View all →</button>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[320px] text-left sm:min-w-[520px]">
              <thead>
                <tr className="text-[10px] font-semibold tracking-[0.08em] text-neutral-400">
                  <th className="whitespace-nowrap pb-2 pr-3">DATE</th><th className="pb-2 pr-3">CLIENT</th><th className="hidden pb-2 pr-3 sm:table-cell">INVOICE</th><th className="hidden pb-2 pr-3 sm:table-cell">METHOD</th><th className="whitespace-nowrap pb-2 text-right">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentPays.map((p) => (
                  <tr key={p.id} className="border-t border-neutral-100 transition hover:bg-neutral-50 dark:border-white/[0.05] dark:hover:bg-white/[0.03]">
                    <td className="whitespace-nowrap py-2.5 pr-3 text-[12px] text-neutral-500 dark:text-neutral-400">{fmtDate(p.date)}</td>
                    <td className="py-2.5 pr-3 text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-100"><span className="block max-w-[120px] truncate sm:max-w-[240px]">{clientName(p.clientId)}</span></td>
                    <td className="hidden whitespace-nowrap py-2.5 pr-3 text-[12px] text-neutral-500 dark:text-neutral-400 sm:table-cell">{invoiceNo(p.invoiceId)}</td>
                    <td className="hidden py-2.5 pr-3 text-[12px] text-neutral-500 dark:text-neutral-400 sm:table-cell">{p.method}</td>
                    <td className="whitespace-nowrap py-2.5 text-right text-[12.5px] font-bold text-[#149e55]">+{fmtM(p.amount, settings)}</td>
                  </tr>
                ))}
                {stats.recentPays.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-[12px] text-neutral-400">No payments recorded yet. Create your first invoice to get started.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
