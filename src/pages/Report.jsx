import { useRef } from 'react';
import { Download, Upload, FileText, Wallet, Printer } from 'lucide-react';
import { Card, IconBadge, PageHeader } from '../components/ui';
import { fmtM, clientTotals, remainingOf, statusOf, paidOf, lastMonths } from '../data';

function download(name, content, type = 'text/csv') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export default function Report({ clients, invoices, payments, projects = [], settings, toast, onReplaceData }) {
  const fileRef = useRef(null);

  const billed = invoices.reduce((a, i) => a + Number(i.amount || 0), 0);
  const paid = payments.reduce((a, p) => a + Number(p.amount || 0), 0);
  const outstanding = invoices.reduce((a, i) => a + remainingOf(i, payments), 0);
  const overdue = invoices.filter((i) => statusOf(i, payments) === 'Overdue').reduce((a, i) => a + remainingOf(i, payments), 0);
  const rate = billed > 0 ? Math.round((paid / billed) * 100) : 0;
  const months = lastMonths(payments, invoices, 6);
  const clientName = (id) => clients.find((c) => c.id === id)?.name || '';

  const exportClients = () => {
    download('clients.csv', 'Name,Company,Phone,Email,City,Status,Billed,Paid,Balance\n' + clients.map((c) => {
      const t = clientTotals(c.id, invoices, payments);
      return [c.name, c.company, c.phone, c.email, c.city, c.status, t.billed, t.paid, t.balance].join(',');
    }).join('\n'));
    toast('Clients CSV downloaded');
  };
  const exportInvoices = () => {
    download('invoices.csv', 'Invoice,Title,Client,Date,Due,Amount,Paid,Remaining,Status\n' + invoices.map((i) =>
      [i.no, `"${i.title}"`, clientName(i.clientId), i.date, i.due, i.amount, paidOf(i.id, payments), remainingOf(i, payments), statusOf(i, payments)].join(',')
    ).join('\n'));
    toast('Invoices CSV downloaded');
  };
  const exportPayments = () => {
    download('payments.csv', 'Date,Client,Invoice,Method,Amount,Note\n' + payments.map((p) =>
      [p.date, clientName(p.clientId), invoices.find((i) => i.id === p.invoiceId)?.no || '', p.method, p.amount, `"${p.note || ''}"`].join(',')
    ).join('\n'));
    toast('Payments CSV downloaded');
  };
  const exportBackup = () => {
    download('business-backup.json', JSON.stringify({ app: 'mads-crm-v2', exportedAt: new Date().toISOString(), clients, invoices, payments, projects, settings }, null, 2), 'application/json');
    toast('Full backup downloaded');
  };
  const importBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.clients) || !Array.isArray(data.invoices) || !Array.isArray(data.payments)) throw new Error('bad');
        if (!window.confirm('Restoring this backup will replace your existing data. Continue?')) return;
        onReplaceData(data);
        toast('Backup restored');
      } catch { toast('This file is not a valid backup'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const btn = 'flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[12.5px] font-semibold transition active:scale-[0.98]';
  const summary = [
    ['Total billed', billed], ['Total collected', paid], ['Outstanding', outstanding], ['Overdue', overdue],
  ];

  return (
    <div>
      <PageHeader title="Reports & Backup" subtitle="Business summary report, Excel (CSV) exports and full data backup" badge={false}>
        <button onClick={() => window.print()} className={btn + ' bg-[#17171a] text-white hover:bg-black dark:bg-white dark:text-black'}><Printer size={14} /> Print summary</button>
      </PageHeader>

      <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2.5">
            <IconBadge><FileText size={14} /></IconBadge>
            <span className="text-[14px] font-bold text-neutral-900 dark:text-white">{settings.businessName} — Summary</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {summary.map(([label, v]) => (
              <div key={label} className="rounded-2xl bg-neutral-50 px-3.5 py-3 dark:bg-white/[0.04]">
                <p className="text-[10.5px] font-semibold tracking-wide text-neutral-400">{label.toUpperCase()}</p>
                <p className={`mt-1 truncate text-[17px] font-bold ${label === 'Overdue' && v > 0 ? 'text-[#e5484d]' : 'text-neutral-900 dark:text-white'}`}>{fmtM(v, settings)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-[12px] font-medium text-neutral-500">Collection rate</span>
            <span className="h-[7px] flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
              <span className="block h-full rounded-full bg-[#16b364]" style={{ width: rate + '%' }} />
            </span>
            <b className="text-[13px] text-[#149e55]">{rate}%</b>
          </div>
          <p className="mt-3 text-[12px] text-neutral-400">{clients.length} clients · {invoices.length} invoices · {payments.length} payments · {projects.length} projects on record.</p>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[300px] text-left">
              <thead>
                <tr className="border-b border-neutral-100 text-[10px] font-semibold tracking-[0.08em] text-neutral-400 dark:border-white/[0.06]">
                  <th className="pb-2 pr-3">MONTH</th><th className="pb-2 pr-3">BILLED</th><th className="pb-2 pr-3">COLLECTED</th><th className="pb-2 text-right">DIFFERENCE</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.key} className="border-b border-neutral-50 last:border-0 dark:border-white/[0.04]">
                    <td className="py-2.5 pr-3 text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-100">{m.label}</td>
                    <td className="py-2.5 pr-3 text-[12px] text-neutral-600 dark:text-neutral-300">{fmtM(m.billed, settings)}</td>
                    <td className="py-2.5 pr-3 text-[12px] font-semibold text-[#149e55]">{fmtM(m.collected, settings)}</td>
                    <td className={`py-2.5 text-right text-[12px] font-bold ${m.collected - m.billed >= 0 ? 'text-[#149e55]' : 'text-[#e8912d]'}`}>{m.collected - m.billed >= 0 ? '+' : '−'}{fmtM(Math.abs(m.collected - m.billed), settings)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2.5">
              <IconBadge tone="blueSoft"><Download size={14} /></IconBadge>
              <span className="text-[14px] font-bold text-neutral-900 dark:text-white">Exports (Excel / CSV)</span>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-400">These files open in Excel or Google Sheets — ideal for sending to your accountant or keeping records.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <button onClick={exportClients} className={btn + ' bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-white/[0.07] dark:text-neutral-200'}>Clients CSV</button>
              <button onClick={exportInvoices} className={btn + ' bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-white/[0.07] dark:text-neutral-200'}>Invoices CSV</button>
              <button onClick={exportPayments} className={btn + ' bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-white/[0.07] dark:text-neutral-200'}>Payments CSV</button>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2.5">
              <IconBadge tone="black"><Wallet size={14} /></IconBadge>
              <span className="text-[14px] font-bold text-neutral-900 dark:text-white">Backup & Restore</span>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-400">
              Your data is saved in this browser. <b className="text-neutral-600 dark:text-neutral-200">Download a backup</b> once a week and keep it safe — if you change browser or phone, import the same file here and all your data comes back.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button onClick={exportBackup} className={btn + ' bg-[#2248f5] text-white hover:bg-[#1a3bd0]'}><Download size={14} /> Backup download</button>
              <button onClick={() => fileRef.current?.click()} className={btn + ' bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-white/[0.07] dark:text-neutral-200'}><Upload size={14} /> Backup restore</button>
              <input ref={fileRef} type="file" accept="application/json" onChange={importBackup} className="hidden" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
