import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun, Moon, ChevronDown, LayoutGrid, Users, FolderKanban, Wallet, BarChart3, FileText,
  Settings, Bell, Trash2, Download
} from 'lucide-react';
import { Avatar, Modal, Field, inputCls, Toasts } from './components/ui';
import {
  defaultSettings, PALETTE,
  initialsOf, fmtM, fmtDate, todayISO, paidOf, remainingOf, statusOf, METHODS, CLIENT_STATUSES,
  PROJECT_STAGES, SERVICES, SOURCES
} from './data';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Projects from './pages/Projects';
import Payments from './pages/Payments';
import Analytic from './pages/Analytic';
import Report from './pages/Report';

const pages = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'payments', label: 'Payments', icon: Wallet },
  { id: 'analytic', label: 'Analytics', icon: BarChart3 },
  { id: 'report', label: 'Reports', icon: FileText },
];

function load(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
}
// Always a safe array: missing key -> fallback, corrupt value -> empty array — never crashes
function loadArray(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : [];
  } catch { return []; }
}
const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// translate any leftover sample-data notes to English (exact matches only)
const NOTE_FIX = {
  'Instagram se aayi. Branding + photos.': 'Came via Instagram. Branding + photos.',
  'App project — bara client.': 'App project — big client.',
  '3 installments mein payment.': 'Payment in 3 installments.',
  'Menu + online booking chahiye. Call pending.': 'Needs menu + online booking. Call pending.',
  '12 reels per month puch raha hai.': 'Asking for 12 reels per month.',
  'Advance milte hi shuru karna hai.': 'Start as soon as the advance arrives.',
  'Final screens review par hain.': 'Final screens are in review.',
  'Delivered aur full paid.': 'Delivered and fully paid.',
};
// an old design-template fake profile name must never appear — force the default instead
const cleanOwnerName = (s) => {
  const v = (s || '').toLowerCase();
  const fake = [[107, 97, 109, 97, 108], [100, 97, 118, 105, 100]].map((codes) => codes.map((c) => String.fromCharCode(c)).join(''));
  return fake.some((w) => v.includes(w)) ? 'Mads Team' : s;
};

const trNote = (s) => {
  if (!s) return s;
  if (NOTE_FIX[s]) return NOTE_FIX[s];
  if (s.startsWith('Project se bana: ')) return 'Converted from project: ' + s.slice(17);
  return s;
};

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [dark, setDark] = useState(() => load('v16-dark', false));
  const rawSettings = load('bizcrm-settings', {});
  const storedSettings = { ...defaultSettings, ...(rawSettings && typeof rawSettings === 'object' && !Array.isArray(rawSettings) ? rawSettings : {}) };
  // One-time "start from zero" gate: if a previous version left data in this
  // browser, ask once whether to delete it or keep it. Fresh browsers start empty.
  const hadLegacyData = (storedSettings.dataVersion || 0) < 3 &&
    ['bizcrm-clients', 'bizcrm-invoices', 'bizcrm-payments', 'bizcrm-projects'].some((k) => loadArray(k, []).length > 0);
  const [clients, setClients] = useState(() => loadArray('bizcrm-clients', []).map((c) => ({ ...c, notes: trNote(c.notes) })));
  const [invoices, setInvoices] = useState(() => loadArray('bizcrm-invoices', []).map((i) => ({ ...i, note: trNote(i.note) })));
  const [payments, setPayments] = useState(() => loadArray('bizcrm-payments', []).map((p) => ({ ...p, note: trNote(p.note) })));
  const [projects, setProjects] = useState(() => loadArray('bizcrm-projects', []).map((x) => ({ ...x, note: trNote(x.note), stage: PROJECT_STAGES.includes(x.stage) ? x.stage : 'Leads' })));
  const [settings, setSettings] = useState(() => ({
    ...storedSettings,
    businessName: !storedSettings.businessName || storedSettings.businessName === 'My Business' ? 'Mads Agency' : storedSettings.businessName,
    ownerName: cleanOwnerName(storedSettings.ownerName),
    sampleData: false,
    dataVersion: 3,
  }));
  const [freshGate, setFreshGate] = useState(hadLegacyData);
  const [toasts, setToasts] = useState([]);
  const [clientModal, setClientModal] = useState({ open: false, editing: null });
  const [invoiceModal, setInvoiceModal] = useState({ open: false, editing: null, presetClientId: null });
  const [paymentModal, setPaymentModal] = useState({ open: false, invoice: null });
  const [projectModal, setProjectModal] = useState({ open: false, editing: null });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('v16-dark', JSON.stringify(dark));
  }, [dark]);
  useEffect(() => localStorage.setItem('bizcrm-clients', JSON.stringify(clients)), [clients]);
  useEffect(() => localStorage.setItem('bizcrm-invoices', JSON.stringify(invoices)), [invoices]);
  useEffect(() => localStorage.setItem('bizcrm-payments', JSON.stringify(payments)), [payments]);
  useEffect(() => localStorage.setItem('bizcrm-projects', JSON.stringify(projects)), [projects]);
  useEffect(() => localStorage.setItem('bizcrm-settings', JSON.stringify(settings)), [settings]);
  useEffect(() => { window.scrollTo({ top: 0 }); setBellOpen(false); setProfileOpen(false); }, [page]);
  useEffect(() => {
    if (!bellOpen && !profileOpen) return;
    const close = () => { setBellOpen(false); setProfileOpen(false); };
    const onDocClick = (e) => { if (!e.target.closest('[data-menu]')) close(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onKey); };
  }, [bellOpen, profileOpen]);

  const toast = (msg) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  };

  const clientName = (id) => clients.find((c) => c.id === id)?.name || '—';

  /* ── notifications: overdue + upcoming dues ── */
  const alerts = useMemo(() => {
    const list = invoices
      .map((inv) => ({ inv, rem: remainingOf(inv, payments), st: statusOf(inv, payments) }))
      .filter((x) => x.rem > 0 && (x.st === 'Overdue' || (x.inv.due >= todayISO() && x.inv.due <= new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-CA'))))
      .sort((a, b) => (a.inv.due < b.inv.due ? -1 : 1));
    return list;
  }, [invoices, payments]);
  const overdueCount = alerts.filter((x) => x.st === 'Overdue').length;

  /* ── handlers ── */
  const openAddClient = () => setClientModal({ open: true, editing: null });
  const openEditClient = (c) => setClientModal({ open: true, editing: c });
  const saveClient = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const name = f.get('name').toString().trim();
    if (!name) return;
    const data = {
      name,
      company: f.get('company').toString().trim(),
      phone: f.get('phone').toString().trim(),
      email: f.get('email').toString().trim(),
      city: f.get('city').toString().trim(),
      status: f.get('status'),
      since: f.get('since') || todayISO(),
      notes: f.get('notes').toString().trim(),
    };
    if (clientModal.editing) {
      setClients(clients.map((c) => (c.id === clientModal.editing.id ? { ...c, ...data, initials: initialsOf(name) } : c)));
      toast(`${name} updated`);
    } else {
      setClients([{ id: uid('c'), ...data, initials: initialsOf(name), color: PALETTE[clients.length % PALETTE.length] }, ...clients]);
      toast(`${name} added as client`);
    }
    setClientModal({ open: false, editing: null });
  };
  const deleteClient = (c) => {
    if (!window.confirm(`Delete ${c.name}? All their invoices and payments will also be deleted.`)) return;
    setClients(clients.filter((x) => x.id !== c.id));
    setInvoices(invoices.filter((i) => i.clientId !== c.id));
    setPayments(payments.filter((p) => p.clientId !== c.id));
    toast(`${c.name} deleted`);
  };

  const nextInvoiceNo = () => {
    const max = invoices.reduce((m, i) => {
      const n = parseInt((i.no || '').replace(/\D/g, ''), 10);
      return Number.isFinite(n) ? Math.max(m, n) : m;
    }, 0);
    return 'INV-' + String(max + 1).padStart(3, '0');
  };
  const openAddInvoice = (clientId, preset) => {
    if (clients.length === 0) { toast('Add a client first'); openAddClient(); return; }
    setInvoiceModal({ open: true, editing: null, presetClientId: clientId || clients[0].id, presetTitle: preset?.title || '', presetAmount: preset?.amount || '' });
  };
  const openEditInvoice = (inv) => setInvoiceModal({ open: true, editing: inv, presetClientId: inv.clientId });
  const saveInvoice = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const data = {
      clientId: f.get('clientId'),
      title: f.get('title').toString().trim(),
      amount: Math.max(0, Number(f.get('amount')) || 0),
      date: f.get('date') || todayISO(),
      due: f.get('due') || todayISO(),
      note: f.get('note').toString().trim(),
    };
    if (!data.title || data.amount <= 0) return;
    if (invoiceModal.editing) {
      setInvoices(invoices.map((i) => (i.id === invoiceModal.editing.id ? { ...i, ...data } : i)));
      // if the client changed, move the payments to the new client too
      if (data.clientId !== invoiceModal.editing.clientId) {
        setPayments(payments.map((p) => (p.invoiceId === invoiceModal.editing.id ? { ...p, clientId: data.clientId } : p)));
      }
      toast('Invoice updated');
    } else {
      setInvoices([{ id: uid('i'), no: nextInvoiceNo(), ...data }, ...invoices]);
      toast(`Invoice created — ${clientName(data.clientId)}`);
    }
    setInvoiceModal({ open: false, editing: null, presetClientId: null });
  };
  const deleteInvoice = (inv) => {
    if (!window.confirm(`Delete ${inv.no} (${inv.title})? Its payments will also be deleted.`)) return;
    setInvoices(invoices.filter((i) => i.id !== inv.id));
    setPayments(payments.filter((p) => p.invoiceId !== inv.id));
    toast(`${inv.no} deleted`);
  };

  const openRecordPayment = (inv) => setPaymentModal({ open: true, invoice: inv });
  const savePayment = (e) => {
    e.preventDefault();
    const inv = paymentModal.invoice;
    if (!inv) return;
    const f = new FormData(e.target);
    const rem = remainingOf(inv, payments);
    const amount = Math.min(rem, Math.max(0, Number(f.get('amount')) || 0));
    if (amount <= 0) return;
    setPayments([{
      id: uid('p'), invoiceId: inv.id, clientId: inv.clientId,
      amount, date: f.get('date') || todayISO(), method: f.get('method'), note: f.get('note').toString().trim(),
    }, ...payments]);
    toast(`${fmtM(amount, settings)} payment recorded — ${clientName(inv.clientId)}`);
    setPaymentModal({ open: false, invoice: null });
  };
  const deletePayment = (p) => {
    if (!window.confirm(`Delete this ${fmtM(p.amount, settings)} payment? The invoice balance will increase.`)) return;
    setPayments(payments.filter((x) => x.id !== p.id));
    toast('Payment deleted');
  };

  /* ── Projects pipeline ── */
  const openAddProject = () => setProjectModal({ open: true, editing: null });
  const openEditProject = (pr) => setProjectModal({ open: true, editing: pr });
  const saveProject = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const clientNameVal = f.get('clientName').toString().trim();
    const found = clients.find((c) => c.name.toLowerCase() === clientNameVal.toLowerCase());
    const data = {
      title: f.get('title').toString().trim(),
      clientName: clientNameVal,
      clientId: found ? found.id : null,
      service: f.get('service'),
      value: Math.max(0, Number(f.get('value')) || 0),
      stage: f.get('stage'),
      source: f.get('source'),
      date: f.get('date') || todayISO(),
      deadline: f.get('deadline') || '',
      note: f.get('note').toString().trim(),
    };
    if (!data.title) return;
    if (projectModal.editing) {
      setProjects(projects.map((x) => (x.id === projectModal.editing.id ? { ...x, ...data } : x)));
      toast('Project updated');
    } else {
      setProjects([{ id: uid('pr'), ...data }, ...projects]);
      toast(`Project added — ${data.stage}`);
    }
    setProjectModal({ open: false, editing: null });
  };
  const deleteProject = (pr) => {
    if (!window.confirm(`Delete the project "${pr.title}"?`)) return;
    setProjects(projects.filter((x) => x.id !== pr.id));
    toast('Project deleted');
  };
  const moveProject = (pr, stage, beforeId = null) => {
    setProjects((prev) => {
      const without = prev.filter((x) => x.id !== pr.id);
      const item = { ...pr, stage };
      if (!beforeId) return [...without, item];
      const bi = without.findIndex((x) => x.id === beforeId);
      if (bi < 0) return [...without, item];
      const copy = [...without];
      copy.splice(bi, 0, item);
      return copy;
    });
    if (pr.stage !== stage) toast(`${pr.title} → ${stage}`);
  };
  const ensureClient = (pr) => {
    if (pr.clientId) return pr.clientId;
    const found = clients.find((c) => c.name.toLowerCase() === (pr.clientName || '').toLowerCase());
    if (found) {
      setProjects(projects.map((x) => (x.id === pr.id ? { ...x, clientId: found.id } : x)));
      return found.id;
    }
    const nc = { id: uid('c'), name: pr.clientName || 'New Client', company: '', phone: '', email: '', city: '', status: 'Active', since: todayISO(), notes: `Converted from project: ${pr.title}`, initials: initialsOf(pr.clientName || 'NC'), color: PALETTE[clients.length % PALETTE.length] };
    setClients([nc, ...clients]);
    setProjects(projects.map((x) => (x.id === pr.id ? { ...x, clientId: nc.id, stage: x.stage === 'Leads' ? 'Convert' : x.stage } : x)));
    return nc.id;
  };
  const convertToClient = (pr) => {
    const id = ensureClient(pr);
    if (id) toast(`${pr.clientName} is now a client`);
  };
  const createInvoiceFromProject = (pr) => {
    const cid = ensureClient(pr);
    openAddInvoice(cid, { title: pr.title, amount: pr.value });
  };

  const saveSettings = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    setSettings({
      ...settings,
      businessName: f.get('businessName').toString().trim() || 'My Business',
      ownerName: f.get('ownerName').toString().trim(),
      currency: f.get('currency'),
      monthlyGoal: Math.max(0, Number(f.get('monthlyGoal')) || 0),
      paymentDetails: (f.get('paymentDetails') || '').toString().trim(),
    });
    setSettingsOpen(false);
    toast('Settings saved');
  };

  // ── One-time fresh-start gate actions ──
  const downloadGateBackup = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ app: 'mads-crm-v2', exportedAt: new Date().toISOString(), clients, invoices, payments, projects, settings }, null, 2)], { type: 'application/json' }));
    a.download = 'business-backup.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Backup downloaded — now you can safely delete everything');
  };
  const wipeAllData = () => {
    setClients([]); setInvoices([]); setPayments([]); setProjects([]);
    setFreshGate(false);
    setPage('dashboard');
    toast('All data cleared — starting from zero');
  };
  const replaceData = (data) => {
    setClients(data.clients); setInvoices(data.invoices); setPayments(data.payments); setProjects(data.projects || []);
    if (data.settings) setSettings({ ...defaultSettings, ...data.settings, sampleData: false, dataVersion: 3 });
  };

  const navCls = (id) =>
    `relative z-10 flex items-center gap-1.5 rounded-full px-3.5 py-[5px] text-[12.5px] font-semibold transition-colors duration-200 sm:px-4 lg:gap-1 lg:px-2.5 lg:text-[12px] xl:gap-1.5 xl:px-4 xl:text-[12.5px] ${
      page === id ? 'text-white dark:text-black' : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
    }`;
  const navIcon = (p) => { const Icon = p.icon; return <Icon size={13} strokeWidth={2.2} className="shrink-0" />; };

  const payInv = paymentModal.invoice;
  const payRem = payInv ? remainingOf(payInv, payments) : 0;
  const payPaid = payInv ? paidOf(payInv.id, payments) : 0;

  return (
    <div className="min-h-screen bg-[#f3f3f5] text-neutral-900 transition-colors duration-300 dark:bg-transparent dark:text-white">
      {/* ── Top bar ─────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#f3f3f5]/85 backdrop-blur-xl dark:bg-[#030405]/85">
        <div className="mx-auto flex max-w-[1380px] items-center justify-between gap-3 px-4 py-1.5 sm:px-5 lg:px-8">
          <button onClick={() => setPage('dashboard')} className="flex shrink-0 items-center" title={settings.businessName} aria-label={settings.businessName}>
            <img src={dark ? '/mads-logo-white.png' : '/mads-logo-black.png'} alt={settings.businessName} draggable="false" className="h-[20px] w-auto select-none sm:h-[22px]" />
          </button>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center rounded-full bg-white p-1 lg:flex dark:border dark:border-white/[0.06] dark:bg-[#070b18]">
            {pages.map((p) => (
              <button key={p.id} onClick={() => setPage(p.id)} className={navCls(p.id)}>
                {page === p.id && (
                  <motion.span layoutId="nav-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute inset-0 -z-10 rounded-full bg-[#17171a] dark:bg-white" />
                )}
                {navIcon(p)}{p.label}
              </button>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <div className="group relative">
              <div className="flex items-center rounded-full border border-black/[0.05] bg-white p-[3px] shadow-sm dark:border-white/[0.07] dark:bg-[#070b18]">
                <button onClick={() => setDark(false)} aria-label="Light mode" className={`flex h-6 w-6 items-center justify-center rounded-full transition ${!dark ? 'bg-[#17171a] text-white' : 'text-neutral-400 hover:text-neutral-200'}`}><Sun size={12} /></button>
                <button onClick={() => setDark(true)} aria-label="Dark mode" className={`flex h-6 w-6 items-center justify-center rounded-full transition ${dark ? 'bg-white text-black' : 'text-neutral-400 hover:text-neutral-700'}`}><Moon size={12} /></button>
              </div>
              <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#17171a] px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100 dark:bg-white dark:text-black">
                {dark ? 'Light mode' : 'Dark mode'}
              </span>
            </div>

            <button onClick={() => setSettingsOpen(true)} title="Business settings" className="hidden h-8 w-8 items-center justify-center rounded-full border border-black/[0.05] bg-white text-neutral-500 shadow-sm transition hover:text-neutral-900 sm:flex dark:border-white/[0.07] dark:bg-[#070b18] dark:text-neutral-300">
              <Settings size={13} />
            </button>

            <div className="relative" data-menu>
              <button onClick={() => { setBellOpen(!bellOpen); setProfileOpen(false); }} className="relative hidden h-8 w-8 items-center justify-center rounded-full border border-black/[0.05] bg-white text-neutral-500 shadow-sm transition hover:text-neutral-900 sm:flex dark:border-white/[0.07] dark:bg-[#070b18] dark:text-neutral-300">
                <Bell size={13} />
                {overdueCount > 0 && <i className="absolute right-[6px] top-[5px] flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-[#f04438] px-0.5 text-[8.5px] font-bold not-italic text-white">{overdueCount}</i>}
              </button>
              <AnimatePresence>
                {bellOpen && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="absolute right-0 top-full z-50 mt-2 w-[320px] rounded-2xl border border-black/[0.05] bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-[#0a1024]">
                    <p className="px-2 pb-1 pt-1.5 text-[12px] font-bold dark:text-white">Payment reminders</p>
                    {alerts.slice(0, 6).map(({ inv, rem, st }) => (
                      <button key={inv.id} onClick={() => { setBellOpen(false); setPage('payments'); }} className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-neutral-50 dark:hover:bg-white/[0.04]">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: st === 'Overdue' ? '#f04438' : '#f5a524' }} />
                        <span className="min-w-0 flex-1">
                          <b className="block truncate text-[12px] font-semibold leading-snug dark:text-neutral-100">{clientName(inv.clientId)} — {fmtM(rem, settings)} remaining</b>
                          <span className="text-[10.5px] text-neutral-400">{inv.no} · {st === 'Overdue' ? 'overdue since' : 'due'} {fmtDate(inv.due)}</span>
                        </span>
                      </button>
                    ))}
                    {alerts.length === 0 && <p className="px-2 py-3 text-[12px] text-neutral-400">No payments due. Everything is clear ✅</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative" data-menu>
              <button onClick={() => { setProfileOpen(!profileOpen); setBellOpen(false); }} className="flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-1 transition hover:bg-white dark:hover:bg-white/[0.06]">
                <Avatar initials={initialsOf(settings.ownerName || 'Owner')} color="#c47b4a" size={29} />
                <span className="hidden max-w-[120px] truncate text-[12.5px] font-semibold xl:inline">{settings.ownerName || 'Owner'}</span>
                <ChevronDown size={13} className="hidden text-neutral-400 xl:inline" />
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="absolute right-0 top-full z-50 mt-2 w-[220px] rounded-2xl border border-black/[0.05] bg-white p-1.5 shadow-2xl dark:border-white/10 dark:bg-[#0a1024]">
                    <div className="px-2.5 pb-2 pt-1.5"><p className="text-[12.5px] font-bold dark:text-white">{settings.ownerName || 'Owner'}</p><p className="text-[10.5px] text-neutral-400">{settings.businessName}</p></div>
                    <button onClick={() => { setProfileOpen(false); setSettingsOpen(true); }} className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[12px] font-semibold text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/[0.06]"><Settings size={14} />Business settings</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <nav className="no-scrollbar flex items-center gap-1 overflow-x-auto px-4 pb-2.5 lg:hidden">
          {pages.map((p) => (
            <button key={p.id} onClick={() => setPage(p.id)} className={navCls(p.id) + ' shrink-0'}>
              {page === p.id && <motion.span layoutId="nav-pill-m" className="absolute inset-0 -z-10 rounded-full bg-[#17171a] dark:bg-white" />}
              {navIcon(p)}{p.label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Page ─────────────────────────────── */}
      <main className="mx-auto max-w-[1380px] px-4 pb-5 pt-3 sm:px-5 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div key={page} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
            {page === 'dashboard' && <Dashboard clients={clients} invoices={invoices} payments={payments} projects={projects} settings={settings} toast={toast} goPage={setPage} onAddClient={openAddClient} onAddInvoice={openAddInvoice} onRecordPayment={openRecordPayment} onOpenSettings={() => setSettingsOpen(true)} />}
            {page === 'clients' && <Clients clients={clients} invoices={invoices} payments={payments} settings={settings} toast={toast} onAddClient={openAddClient} onEditClient={openEditClient} onDeleteClient={deleteClient} onAddInvoice={openAddInvoice} onEditInvoice={openEditInvoice} onDeleteInvoice={deleteInvoice} onRecordPayment={openRecordPayment} onDeletePayment={deletePayment} />}
            {page === 'projects' && <Projects projects={projects} settings={settings} onAddProject={openAddProject} onEditProject={openEditProject} onDeleteProject={deleteProject} onMoveProject={moveProject} onConvertToClient={convertToClient} onCreateInvoice={createInvoiceFromProject} />}
            {page === 'payments' && <Payments clients={clients} invoices={invoices} payments={payments} settings={settings} toast={toast} onAddInvoice={openAddInvoice} onEditInvoice={openEditInvoice} onDeleteInvoice={deleteInvoice} onRecordPayment={openRecordPayment} onDeletePayment={deletePayment} />}
            {page === 'analytic' && <Analytic clients={clients} invoices={invoices} payments={payments} settings={settings} toast={toast} />}
            {page === 'report' && <Report clients={clients} invoices={invoices} payments={payments} projects={projects} settings={settings} toast={toast} onReplaceData={replaceData} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Client add/edit ─────────────────────────────── */}
      <Modal open={clientModal.open} onClose={() => setClientModal({ open: false, editing: null })}
        title={clientModal.editing ? 'Edit client' : 'Add client'} subtitle="Client details — you can edit them anytime.">
        <form key={clientModal.editing?.id || 'new-client'} onSubmit={saveClient} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="FULL NAME *"><input name="name" required defaultValue={clientModal.editing?.name || ''} placeholder="e.g. Ahmed Raza" className={inputCls} /></Field>
            <Field label="COMPANY / SHOP"><input name="company" defaultValue={clientModal.editing?.company || ''} placeholder="e.g. Raza Traders" className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="PHONE / WHATSAPP"><input name="phone" defaultValue={clientModal.editing?.phone || ''} placeholder="0300-1234567" className={inputCls} /></Field>
            <Field label="EMAIL"><input name="email" type="email" defaultValue={clientModal.editing?.email || ''} placeholder="name@email.com" className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="CITY"><input name="city" defaultValue={clientModal.editing?.city || ''} placeholder="Karachi" className={inputCls} /></Field>
            <Field label="STATUS"><select name="status" defaultValue={clientModal.editing?.status || 'Active'} className={inputCls}>{CLIENT_STATUSES.map((s) => <option key={s} className="dark:bg-[#1f1f24]">{s}</option>)}</select></Field>
            <Field label="CLIENT SINCE"><input name="since" type="date" defaultValue={clientModal.editing?.since || todayISO()} className={inputCls} /></Field>
          </div>
          <Field label="NOTES"><textarea name="notes" rows={2} defaultValue={clientModal.editing?.notes || ''} placeholder="Anything special — referral, preferences, payment habits…" className={inputCls} /></Field>
          <button type="submit" className="w-full rounded-full bg-[#2248f5] py-3 text-[13px] font-bold text-white transition hover:bg-[#1a3bd0] active:scale-[0.99]">{clientModal.editing ? 'Save changes' : 'Add client'}</button>
        </form>
      </Modal>

      {/* ── Invoice add/edit ─────────────────────────────── */}
      <Modal open={invoiceModal.open} onClose={() => setInvoiceModal({ open: false, editing: null, presetClientId: null })}
        title={invoiceModal.editing ? `Edit ${invoiceModal.editing.no}` : 'New invoice'} subtitle="It is added to the client's balance as soon as it is created.">
        <form key={invoiceModal.editing?.id || 'new-inv'} onSubmit={saveInvoice} className="space-y-3.5">
          <Field label="CLIENT *">
            <select name="clientId" defaultValue={invoiceModal.editing?.clientId || invoiceModal.presetClientId || ''} className={inputCls}>
              {clients.map((c) => <option key={c.id} value={c.id} className="dark:bg-[#1f1f24]">{c.name}{c.company ? ' — ' + c.company : ''}</option>)}
            </select>
          </Field>
          <Field label="WORK / ITEM *"><input name="title" required defaultValue={invoiceModal.editing?.title || invoiceModal.presetTitle || ''} placeholder="e.g. Website design, Monthly retainer…" className={inputCls} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label={`AMOUNT (${settings.currency}) *`}><input name="amount" type="number" min="1" required defaultValue={invoiceModal.editing?.amount || invoiceModal.presetAmount || ''} placeholder="50000" className={inputCls} /></Field>
            <Field label="INVOICE DATE"><input name="date" type="date" defaultValue={invoiceModal.editing?.date || todayISO()} className={inputCls} /></Field>
            <Field label="DUE DATE"><input name="due" type="date" defaultValue={invoiceModal.editing?.due || new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-CA')} className={inputCls} /></Field>
          </div>
          <Field label="NOTE"><input name="note" defaultValue={invoiceModal.editing?.note || ''} placeholder="(optional)" className={inputCls} /></Field>
          <button type="submit" className="w-full rounded-full bg-[#2248f5] py-3 text-[13px] font-bold text-white transition hover:bg-[#1a3bd0] active:scale-[0.99]">{invoiceModal.editing ? 'Save changes' : 'Create invoice'}</button>
        </form>
      </Modal>

      {/* ── Record payment ─────────────────────────────── */}
      <Modal open={paymentModal.open} onClose={() => setPaymentModal({ open: false, invoice: null })}
        title="Record payment" subtitle={payInv ? `${payInv.no} · ${clientName(payInv.clientId)} — ${payInv.title}` : ''}>
        {payInv && (
          <form key={payInv.id + payRem} onSubmit={savePayment} className="space-y-3.5">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['Invoice', payInv.amount], ['Paid', payPaid], ['Remaining', payRem]].map(([label, v], idx) => (
                <div key={label} className="rounded-2xl bg-neutral-50 px-2 py-2.5 dark:bg-white/[0.04]">
                  <p className="text-[10px] font-semibold tracking-wide text-neutral-400">{label.toUpperCase()}</p>
                  <p className={`mt-0.5 truncate text-[13px] font-bold ${idx === 2 ? 'text-[#e5484d]' : 'text-neutral-800 dark:text-neutral-100'}`}>{fmtM(v, settings)}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`AMOUNT (${settings.currency}) *`}><input name="amount" type="number" min="1" max={payRem} required defaultValue={payRem} className={inputCls} /></Field>
              <Field label="DATE"><input name="date" type="date" defaultValue={todayISO()} className={inputCls} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="METHOD"><select name="method" className={inputCls}>{METHODS.map((m) => <option key={m} className="dark:bg-[#1f1f24]">{m}</option>)}</select></Field>
              <Field label="NOTE"><input name="note" placeholder="(optional)" className={inputCls} /></Field>
            </div>
            <button type="submit" className="w-full rounded-full bg-[#16b364] py-3 text-[13px] font-bold text-white transition hover:bg-[#129a55] active:scale-[0.99]">Save payment</button>
          </form>
        )}
      </Modal>

      {/* ── Project add/edit ─────────────────────────────── */}
      <Modal open={projectModal.open} onClose={() => setProjectModal({ open: false, editing: null })}
        title={projectModal.editing ? 'Edit project' : 'Add project / lead'} subtitle="Lead or confirmed project — change its stage anytime from the board." wide>
        <form key={projectModal.editing?.id || 'new-project'} onSubmit={saveProject} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="PROJECT TITLE *"><input name="title" required defaultValue={projectModal.editing?.title || ''} placeholder="e.g. E-commerce website" className={inputCls} /></Field>
            <Field label="CLIENT / LEAD NAME">
              <input name="clientName" list="client-names" defaultValue={projectModal.editing?.clientName || ''} placeholder="Type a name — existing clients auto-link" className={inputCls} />
              <datalist id="client-names">{clients.map((c) => <option key={c.id} value={c.name} />)}</datalist>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="SERVICE">
              <select name="service" defaultValue={projectModal.editing?.service || SERVICES[0]} className={inputCls}>
                {SERVICES.map((x) => <option key={x} className="dark:bg-[#0a1024]">{x}</option>)}
              </select>
            </Field>
            <Field label={`VALUE (${settings.currency})`}><input name="value" type="number" min="0" defaultValue={projectModal.editing?.value ?? ''} placeholder="150000" className={inputCls} /></Field>
            <Field label="STAGE">
              <select name="stage" defaultValue={projectModal.editing?.stage || 'Leads'} className={inputCls}>
                {PROJECT_STAGES.map((x) => <option key={x} className="dark:bg-[#0a1024]">{x}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="SOURCE">
              <select name="source" defaultValue={projectModal.editing?.source || SOURCES[0]} className={inputCls}>
                {SOURCES.map((x) => <option key={x} className="dark:bg-[#0a1024]">{x}</option>)}
              </select>
            </Field>
            <Field label="START DATE"><input name="date" type="date" defaultValue={projectModal.editing?.date || todayISO()} className={inputCls} /></Field>
            <Field label="DEADLINE"><input name="deadline" type="date" defaultValue={projectModal.editing?.deadline || ''} className={inputCls} /></Field>
          </div>
          <Field label="NOTE"><input name="note" defaultValue={projectModal.editing?.note || ''} placeholder="(optional)" className={inputCls} /></Field>
          <button type="submit" className="w-full rounded-full bg-[#2248f5] py-3 text-[13px] font-bold text-white transition hover:bg-[#1a3bd0] active:scale-[0.99]">{projectModal.editing ? 'Save changes' : 'Add project'}</button>
        </form>
      </Modal>

      {/* ── Settings ─────────────────────────────── */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Business settings" subtitle="Set up the app for your business.">
        <form key={JSON.stringify(settings)} onSubmit={saveSettings} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="BUSINESS NAME"><input name="businessName" defaultValue={settings.businessName} placeholder="My Business" className={inputCls} /></Field>
            <Field label="YOUR NAME"><input name="ownerName" defaultValue={settings.ownerName} placeholder="Your name" className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CURRENCY">
              <select name="currency" defaultValue={settings.currency} className={inputCls}>
                <option value="PKR" className="dark:bg-[#1f1f24]">PKR — Pakistani Rupee</option>
                <option value="USD" className="dark:bg-[#1f1f24]">USD — Dollar</option>
                <option value="EUR" className="dark:bg-[#1f1f24]">EUR — Euro</option>
                <option value="GBP" className="dark:bg-[#1f1f24]">GBP — Pound</option>
                <option value="AED" className="dark:bg-[#1f1f24]">AED — Dirham</option>
              </select>
            </Field>
            <Field label="MONTHLY COLLECTION GOAL"><input name="monthlyGoal" type="number" min="0" defaultValue={settings.monthlyGoal} placeholder="300000" className={inputCls} /></Field>
          </div>
          <Field label="PAYMENT DETAILS (PRINTED ON INVOICES — OPTIONAL)"><textarea name="paymentDetails" rows={3} defaultValue={settings.paymentDetails || ''} placeholder="e.g. Meezan Bank — Account title: Mads Agency — IBAN: PK00 MEZN 0000 0000 0000 0000" className={inputCls + ' resize-none'} /></Field>
          <p className="rounded-xl bg-neutral-50 px-3 py-2 text-[11.5px] leading-relaxed text-neutral-500 dark:bg-white/[0.04] dark:text-neutral-400">
            The monthly goal appears on the Dashboard gauge — your collection target for each month. Changing the currency updates the symbol shown on all amounts. Payment details (bank / JazzCash / Easypaisa) print at the bottom of every invoice you download.
          </p>
          <button type="submit" className="w-full rounded-full bg-[#2248f5] py-3 text-[13px] font-bold text-white transition hover:bg-[#1a3bd0] active:scale-[0.99]">Save settings</button>
        </form>
      </Modal>

      {/* ── One-time fresh-start gate: a previous version left data in this browser ── */}
      {freshGate && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
          <div className="relative w-full max-w-[460px] rounded-[22px] bg-white p-6 shadow-2xl dark:bg-[#1b1b20]">
            <h3 className="text-[18px] font-bold tracking-tight text-neutral-900 dark:text-white">Start from zero?</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              This updated version is set to start with a clean slate. This browser still has data from before:
              <b className="text-neutral-700 dark:text-neutral-200"> {clients.length} client{clients.length === 1 ? '' : 's'} · {invoices.length} invoice{invoices.length === 1 ? '' : 's'} · {payments.length} payment{payments.length === 1 ? '' : 's'} · {projects.length} project{projects.length === 1 ? '' : 's'}</b>.
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              <b className="text-[#e5484d]">"Delete everything" cannot be undone.</b> Download a backup first if you might need this data later — it can be restored anytime from Reports. Your business settings (name, monthly goal, payment details) stay either way.
            </p>
            <div className="mt-5 space-y-2">
              <button onClick={downloadGateBackup} className="flex w-full items-center justify-center gap-1.5 rounded-full bg-neutral-100 py-2.5 text-[13px] font-semibold text-neutral-700 transition hover:bg-neutral-200 active:scale-[0.99] dark:bg-white/[0.07] dark:text-neutral-200"><Download size={14} /> Download backup first</button>
              <button onClick={wipeAllData} className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#e5484d] py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#d1363c] active:scale-[0.99]"><Trash2 size={14} /> Delete everything — start from zero</button>
              <button onClick={() => { setFreshGate(false); toast('Your existing data was kept'); }} className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#2248f5] py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#1a3bd0] active:scale-[0.99]">Keep my data</button>
            </div>
          </div>
        </div>
      )}

      <Toasts toasts={toasts} />
    </div>
  );
}
