import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Plus, LayoutGrid, LayoutList, Pencil, Trash2,
  FileText, UserPlus, Layers, Activity, Wallet, CheckCircle2, GripVertical
} from 'lucide-react';
import { Card, IconBadge, CountUp, PageHeader } from '../components/ui';
import { fmtM, fmtCompact, fmtDate, todayISO, PROJECT_STAGES, STAGE_PROGRESS, STAGE_COLORS, SERVICES } from '../data';

export default function Projects({ projects, settings, onAddProject, onEditProject, onDeleteProject, onMoveProject, onConvertToClient, onCreateInvoice }) {
  const [query, setQuery] = useState('');
  const [service, setService] = useState('All');
  const [view, setView] = useState('board');
  const [drag, setDrag] = useState(null); // {id, x, y, w, dx, dy, active, overStage, beforeId}
  const dragRef = useRef(null);
  const colRefs = useRef({});

  const shown = projects.filter((p) =>
    (service === 'All' || p.service === service) &&
    (p.title + p.clientName + p.service).toLowerCase().includes(query.toLowerCase())
  );

  const byStage = useMemo(() => {
    const map = {};
    PROJECT_STAGES.forEach((s) => { map[s] = shown.filter((p) => p.stage === s); });
    return map;
  }, [shown]);

  const openValue = projects.filter((p) => p.stage !== 'Completed').reduce((a, p) => a + Number(p.value || 0), 0);
  const completedValue = projects.filter((p) => p.stage === 'Completed').reduce((a, p) => a + Number(p.value || 0), 0);
  const convRate = projects.length ? Math.round((projects.filter((p) => p.stage !== 'Leads').length / projects.length) * 100) : 0;

  const stats = [
    { icon: <Layers size={14} />, tone: 'blueSoft', label: 'Total projects', value: projects.length, fmt: (v) => Math.round(v), sub: `${byStage.Leads?.length ?? 0} new leads` },
    { icon: <Wallet size={14} />, tone: 'black', label: 'Pipeline value', value: openValue, fmt: (v) => fmtM(v, settings), sub: 'Leads + Convert + Working' },
    { icon: <Activity size={14} />, tone: 'limeSoft', label: 'Conversion rate', value: convRate, fmt: (v) => Math.round(v) + '%', sub: 'Leads turned into clients' },
    { icon: <CheckCircle2 size={14} />, tone: 'limeSoft', label: 'Completed value', value: completedValue, fmt: (v) => fmtM(v, settings), sub: `${byStage.Completed?.length ?? 0} projects delivered` },
  ];

  /* ── real drag & drop (pointer based) ── */
  const locate = (cx, cy, dragId) => {
    for (const stage of PROJECT_STAGES) {
      const el = colRefs.current[stage];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) {
        let beforeId = null;
        const cards = el.querySelectorAll('[data-card-id]');
        for (const c of cards) {
          if (c.dataset.cardId === dragId) continue;
          const cr = c.getBoundingClientRect();
          if (cy < cr.top + cr.height / 2) { beforeId = c.dataset.cardId; break; }
        }
        return { overStage: stage, beforeId };
      }
    }
    return { overStage: null, beforeId: null };
  };

  const startDrag = (e, p) => {
    if (e.button != null && e.button !== 0) return;
    if (e.target.closest('button, select, input, a, textarea')) return;
    const cardEl = e.currentTarget;
    const rect = cardEl.getBoundingClientRect();
    const start = {
      id: p.id, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY,
      w: rect.width, dx: e.clientX - rect.left, dy: e.clientY - rect.top,
      active: false, overStage: null, beforeId: null,
    };
    dragRef.current = start;

    const onMove = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      const moved = Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy);
      const active = d.active || moved > 5;
      const loc = active ? locate(ev.clientX, ev.clientY, d.id) : { overStage: null, beforeId: null };
      const next = { ...d, x: ev.clientX, y: ev.clientY, active, ...loc };
      dragRef.current = next;
      setDrag(next);
      if (active) ev.preventDefault?.();
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (d?.active && d.overStage) {
        const proj = projects.find((x) => x.id === d.id);
        if (proj && (proj.stage !== d.overStage || d.beforeId)) onMoveProject(proj, d.overStage, d.beforeId);
      }
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  useEffect(() => () => { dragRef.current = null; }, []);

  const draggedProject = drag?.active ? projects.find((x) => x.id === drag.id) : null;
  const smallBtn = 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 transition hover:bg-white hover:shadow-sm dark:bg-white/[0.06] dark:hover:bg-white/10';

  const cardInner = (p, ghost = false) => {
    const late = p.deadline && p.deadline < todayISO() && p.stage !== 'Completed';
    return (
      <>
        <div className="flex items-start justify-between gap-2">
          <b className="min-w-0 flex-1 break-words text-[13px] font-semibold leading-snug text-neutral-800 dark:text-neutral-100">{p.title}</b>
          <b className="shrink-0 whitespace-nowrap text-[12px] font-bold text-neutral-900 dark:text-white">{fmtM(p.value, settings)}</b>
        </div>
        <p className="mt-1 truncate text-[11.5px] text-neutral-500 dark:text-neutral-400">
          {p.clientName}{p.clientId ? '' : ' · lead'} · {p.source}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="whitespace-nowrap rounded-full px-2 py-[3px] text-[10px] font-bold text-white" style={{ background: STAGE_COLORS[p.stage] }}>{p.service}</span>
          {p.deadline && <span className={`whitespace-nowrap text-[10.5px] font-medium ${late ? 'font-bold text-[#e5484d]' : 'text-neutral-400'}`}>due {fmtDate(p.deadline)}{late ? ' · late' : ''}</span>}
        </div>
        {p.note && !ghost && <p className="mt-2 line-clamp-2 text-[11px] italic leading-snug text-neutral-400">“{p.note}”</p>}
        <div className="mt-3 flex items-center gap-2">
          <span className="relative h-[5px] flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
            <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: STAGE_PROGRESS[p.stage] + '%', background: STAGE_COLORS[p.stage] }} />
          </span>
          <span className="text-[10px] font-semibold text-neutral-400">{STAGE_PROGRESS[p.stage]}%</span>
        </div>
        {!ghost && (
          <div className="mt-3 flex items-center gap-1.5 border-t border-black/[0.04] pt-2.5 dark:border-white/[0.06]">
            <span className="flex items-center gap-1 text-[10px] font-medium text-neutral-400"><GripVertical size={12} /> drag me</span>
            <span className="flex-1" />
            {!p.clientId && <button onClick={() => onConvertToClient(p)} className={smallBtn + ' hover:!text-[#149e55]'} title="Convert to client"><UserPlus size={12} /></button>}
            <button onClick={() => onCreateInvoice(p)} className={smallBtn + ' hover:!text-[#2248f5]'} title="Create invoice"><FileText size={12} /></button>
            <button onClick={() => onEditProject(p)} className={smallBtn} title="Edit"><Pencil size={12} /></button>
            <button onClick={() => onDeleteProject(p)} className={smallBtn + ' hover:!text-red-500'} title="Delete"><Trash2 size={12} /></button>
          </div>
        )}
      </>
    );
  };

  return (
    <div>
      <PageHeader title="Projects Pipeline" subtitle="From lead to delivery — drag cards to change stage" badge={false}>
        <label className="hidden items-center gap-2 rounded-full border border-black/[0.05] bg-white px-3.5 py-2 dark:border-white/10 dark:bg-white/[0.05] md:flex">
          <Search size={14} className="text-neutral-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search project, client…" className="w-44 bg-transparent text-[12.5px] font-medium text-neutral-700 outline-none placeholder:text-neutral-400 dark:text-neutral-200" />
        </label>
        <select value={service} onChange={(e) => setService(e.target.value)} className="rounded-full border border-black/[0.05] bg-white px-3 py-2 text-[12px] font-semibold text-neutral-600 outline-none dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-200">
          <option value="All" className="dark:bg-[#0a1024]">All services</option>
          {SERVICES.map((s) => <option key={s} value={s} className="dark:bg-[#0a1024]">{s}</option>)}
        </select>
        <div className="flex rounded-full bg-neutral-200/60 p-[3px] dark:bg-white/[0.07]">
          <button onClick={() => setView('board')} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition ${view === 'board' ? 'bg-[#17171a] text-white shadow dark:bg-white dark:text-black' : 'text-neutral-500 dark:text-neutral-400'}`}><LayoutGrid size={13} /> Board</button>
          <button onClick={() => setView('table')} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition ${view === 'table' ? 'bg-[#17171a] text-white shadow dark:bg-white dark:text-black' : 'text-neutral-500 dark:text-neutral-400'}`}><LayoutList size={13} /> Table</button>
        </div>
        <button onClick={onAddProject} className="flex items-center gap-1.5 rounded-full bg-[#2248f5] px-4 py-2.5 text-[12.5px] font-semibold text-white transition hover:bg-[#1a3bd0] active:scale-[0.98]"><Plus size={15} /> Add project</button>
      </PageHeader>
      <label className="mb-4 flex items-center gap-2 rounded-full border border-black/[0.05] bg-white px-3.5 py-2.5 dark:border-white/10 dark:bg-white/[0.05] md:hidden">
        <Search size={14} className="text-neutral-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects…" className="w-full bg-transparent text-[12.5px] font-medium outline-none placeholder:text-neutral-400 dark:text-neutral-200" />
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

      {view === 'board' ? (
        <div className="mt-4 grid gap-3 [&>*]:min-w-0 sm:grid-cols-2 lg:flex">
          {PROJECT_STAGES.map((stage) => {
            const list = byStage[stage] || [];
            const total = list.reduce((a, p) => a + Number(p.value || 0), 0);
            const isOver = drag?.active && drag.overStage === stage;
            return (
              <div
                key={stage}
                ref={(el) => { colRefs.current[stage] = el; }}
                className={`flex min-h-[240px] flex-col rounded-[20px] border p-3 transition-colors lg:min-w-0 lg:flex-1 ${isOver ? 'border-[#2248f5] bg-blue-50/70 dark:border-[#2f6bff] dark:bg-[#2f6bff]/10' : 'border-black/[0.04] bg-white/60 dark:border-white/[0.06] dark:bg-white/[0.02]'}`}
              >
                <div className="flex items-center justify-between gap-2 px-1 pb-2.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <i className="h-[9px] w-[9px] shrink-0 rounded-full" style={{ background: STAGE_COLORS[stage] }} />
                    <b className="truncate text-[13px] font-bold text-neutral-800 dark:text-neutral-100">{stage}</b>
                  </span>
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-neutral-100 px-2 py-0.5 text-[10.5px] font-bold text-neutral-500 dark:bg-white/[0.07] dark:text-neutral-300">{list.length} · {fmtCompact(total, settings)}</span>
                </div>
                <div className="space-y-2.5">
                  {list.map((p) => (
                    <div key={p.id}>
                      {isOver && drag.beforeId === p.id && drag.id !== p.id && (
                        <div className="mb-2.5 h-[3px] rounded-full bg-[#2248f5] dark:bg-[#2f6bff]" />
                      )}
                      <motion.div
                        data-card-id={p.id}
                        onPointerDown={(e) => startDrag(e, p)}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        style={{ touchAction: 'pan-y' }}
                        className={`select-none rounded-2xl border p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-md ${drag?.active && drag.id === p.id
                          ? 'border-dashed border-[#2248f5]/50 bg-blue-50/40 opacity-40 dark:border-[#2f6bff]/50 dark:bg-[#2f6bff]/5'
                          : 'cursor-grab border-black/[0.04] bg-white active:cursor-grabbing dark:border-white/[0.07] dark:bg-white/[0.04]'}`}
                      >
                        {cardInner(p)}
                      </motion.div>
                    </div>
                  ))}
                  {isOver && !drag.beforeId && list.length > 0 && (
                    <div className="h-[3px] rounded-full bg-[#2248f5] dark:bg-[#2f6bff]" />
                  )}
                  {list.length === 0 && (
                    <p className={`rounded-2xl border border-dashed px-3 py-8 text-center text-[11.5px] ${isOver ? 'border-[#2248f5] text-[#2248f5] dark:border-[#2f6bff]' : 'border-neutral-200 text-neutral-400 dark:border-white/10'}`}>
                      {isOver ? 'Drop here' : 'Drag a card here'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="mt-4 p-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-neutral-100 text-[10px] font-semibold tracking-[0.08em] text-neutral-400 dark:border-white/[0.06]">
                  <th className="pb-2.5 pr-3">PROJECT</th><th className="pb-2.5 pr-3">CLIENT</th><th className="pb-2.5 pr-3">SERVICE</th>
                  <th className="pb-2.5 pr-3">VALUE</th><th className="pb-2.5 pr-3">DEADLINE</th><th className="pb-2.5 pr-3">STAGE</th><th className="pb-2.5" />
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => {
                  const late = p.deadline && p.deadline < todayISO() && p.stage !== 'Completed';
                  return (
                    <tr key={p.id} className="border-b border-neutral-50 transition last:border-0 hover:bg-neutral-50 dark:border-white/[0.04] dark:hover:bg-white/[0.03]">
                      <td className="py-3 pr-3"><b className="block max-w-[260px] truncate text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-100">{p.title}</b></td>
                      <td className="py-3 pr-3 text-[12.5px] text-neutral-600 dark:text-neutral-300"><span className="block max-w-[180px] truncate">{p.clientName}</span></td>
                      <td className="py-3 pr-3"><span className="whitespace-nowrap rounded-full px-2 py-[3px] text-[10px] font-bold text-white" style={{ background: STAGE_COLORS[p.stage] }}>{p.service}</span></td>
                      <td className="whitespace-nowrap py-3 pr-3 text-[12.5px] font-bold text-neutral-800 dark:text-neutral-100">{fmtM(p.value, settings)}</td>
                      <td className={`whitespace-nowrap py-3 pr-3 text-[12px] ${late ? 'font-bold text-[#e5484d]' : 'text-neutral-500 dark:text-neutral-400'}`}>{p.deadline ? fmtDate(p.deadline) : '—'}</td>
                      <td className="py-3 pr-3">
                        <select value={p.stage} onChange={(e) => onMoveProject(p, e.target.value)} className="rounded-full border border-black/[0.06] bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-neutral-700 outline-none dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-200">
                          {PROJECT_STAGES.map((s) => <option key={s} value={s} className="dark:bg-[#0a1024]">{s}</option>)}
                        </select>
                      </td>
                      <td className="py-3">
                        <span className="flex justify-end gap-1.5">
                          {!p.clientId && <button onClick={() => onConvertToClient(p)} className={smallBtn + ' hover:!text-[#149e55]'} title="Convert to client"><UserPlus size={12} /></button>}
                          <button onClick={() => onCreateInvoice(p)} className={smallBtn + ' hover:!text-[#2248f5]'} title="Create invoice"><FileText size={12} /></button>
                          <button onClick={() => onEditProject(p)} className={smallBtn} title="Edit"><Pencil size={12} /></button>
                          <button onClick={() => onDeleteProject(p)} className={smallBtn + ' hover:!text-red-500'} title="Delete"><Trash2 size={12} /></button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {shown.length === 0 && <p className="py-10 text-center text-[13px] text-neutral-400">No project found. <button onClick={onAddProject} className="font-semibold text-[#2248f5] hover:underline">Add your first project</button></p>}
          </div>
        </Card>
      )}

      {/* floating drag card */}
      {draggedProject && (
        <div
          className="pointer-events-none fixed z-[70] rounded-2xl border border-[#2248f5]/40 bg-white p-3.5 shadow-2xl dark:border-[#2f6bff]/50 dark:bg-[#0a1024]"
          style={{ left: drag.x - drag.dx, top: drag.y - drag.dy, width: drag.w, transform: 'rotate(-2deg) scale(1.03)' }}
        >
          {cardInner(draggedProject, true)}
        </div>
      )}
    </div>
  );
}
