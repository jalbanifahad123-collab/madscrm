import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';



/* Animated counter — numbers tick up like in the V16 video */
export function CountUp({ value, format = (v) => Math.round(v).toLocaleString('en-US'), duration = 1200, className = '' }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(value * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);
  return <span className={className}>{format(display)}</span>;
}


export function Card({ children, className = '', hover = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={hover ? { y: -5 } : undefined}
      className={`min-w-0 rounded-[20px] border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-[#070b18] ${className}`}
    >
      {children}
    </motion.div>
  );
}

/* small circular icon badge used in card headers */
export function IconBadge({ children, tone = 'gray', className = '' }) {
  const tones = {
    gray: 'bg-[#f1f1f4] text-[#2b59ff] dark:bg-white/[0.07]',
    blue: 'bg-[#2b59ff] text-white',
    green: 'bg-[#22bc5f] text-white shadow-[0_8px_18px_-6px_rgba(34,188,95,0.65)]',
    red: 'bg-[#f04438] text-white shadow-[0_8px_18px_-6px_rgba(240,68,56,0.6)]',
    black: 'bg-[#232327] text-white dark:bg-white dark:text-black',
    limeSoft: 'bg-[#ecfbd2] text-[#5da30f] dark:bg-[#c6f542]/15',
    redSoft: 'bg-[#fdeceb] text-[#f04438] dark:bg-[#f04438]/15',
    blueSoft: 'bg-[#e8eeff] text-[#2b59ff] dark:bg-[#2b59ff]/15',
  };
  return (
    <span className={`inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}


export function Avatar({ initials, color, size = 30, className = '' }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ${className}`}
      style={{ background: color, width: size, height: size, fontSize: size * 0.34 }}>
      {initials}
    </span>
  );
}


export const stageStyles = {
  Customer: 'bg-[#e7f9ec] text-[#149e55] dark:bg-emerald-500/15 dark:text-emerald-400',
  Churned: 'bg-[#fdeceb] text-[#e5484d] dark:bg-red-500/15 dark:text-red-400',
  Prospect: 'bg-[#fff3e0] text-[#e8912d] dark:bg-amber-500/15 dark:text-amber-400',
  Lead: 'bg-[#e8eeff] text-[#2b59ff] dark:bg-blue-500/15 dark:text-blue-400',
  Won: 'bg-[#e7f9ec] text-[#149e55] dark:bg-emerald-500/15 dark:text-emerald-400',
  Lost: 'bg-[#fdeceb] text-[#e5484d] dark:bg-red-500/15 dark:text-red-400',
  'In progress': 'bg-[#e8eeff] text-[#2b59ff] dark:bg-blue-500/15 dark:text-blue-400',
  New: 'bg-[#fff3e0] text-[#e8912d] dark:bg-amber-500/15 dark:text-amber-400',
  Paid: 'bg-[#e7f9ec] text-[#149e55] dark:bg-emerald-500/15 dark:text-emerald-400',
  Partial: 'bg-[#fff3e0] text-[#e8912d] dark:bg-amber-500/15 dark:text-amber-400',
  Unpaid: 'bg-[#e8eeff] text-[#2b59ff] dark:bg-blue-500/15 dark:text-blue-400',
  Overdue: 'bg-[#fdeceb] text-[#e5484d] dark:bg-red-500/15 dark:text-red-400',
  Active: 'bg-[#e7f9ec] text-[#149e55] dark:bg-emerald-500/15 dark:text-emerald-400',
  Inactive: 'bg-neutral-100 text-neutral-500 dark:bg-white/[0.08] dark:text-neutral-400',
  Leads: 'bg-[#e8eeff] text-[#2b59ff] dark:bg-blue-500/15 dark:text-[#7aa2ff]',
  Convert: 'bg-[#fff3e0] text-[#e8912d] dark:bg-amber-500/15 dark:text-amber-400',
  Working: 'bg-[#e3ecff] text-[#1f56e0] dark:bg-[#2f6bff]/20 dark:text-[#7aa2ff]',
  Completed: 'bg-[#e7f9ec] text-[#149e55] dark:bg-emerald-500/15 dark:text-[#23c26f]',
};

export function StagePill({ stage }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11px] font-semibold ${stageStyles[stage] || stageStyles.Lead}`}>
      <span className="h-[5px] w-[5px] rounded-full bg-current" />{stage}
    </span>
  );
}

/* Centered modal */
export function Modal({ open, onClose, title, subtitle, children, wide = false, xwide = false }) {
  useEffect(() => {
    if (!open) return;
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div initial={{ y: 24, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 16, opacity: 0, scale: 0.98 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={`relative max-h-[92vh] w-full overflow-y-auto rounded-[22px] bg-white p-6 shadow-2xl dark:bg-[#1b1b20] ${xwide ? 'max-w-[880px]' : wide ? 'max-w-[680px]' : 'max-w-[460px]'}`}>
            <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition hover:bg-neutral-200 dark:bg-white/10 dark:text-neutral-300"><X size={15} /></button>
            <h3 className="pr-10 text-[18px] font-bold tracking-tight text-neutral-900 dark:text-white">{title}</h3>
            {subtitle && <p className="mt-0.5 pr-10 text-[12.5px] text-neutral-400">{subtitle}</p>}
            <div className="mt-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-neutral-500 dark:text-neutral-400">{label}</span>
      {children}
    </label>
  );
}

export const inputCls = 'w-full rounded-xl border border-black/[0.08] bg-neutral-50 px-3 py-2.5 text-[13px] font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#2b59ff] focus:bg-white focus:ring-4 focus:ring-[#2b59ff]/10 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:focus:bg-white/[0.07]';

/* Toast */
export function Toasts({ toasts }) {
  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} initial={{ y: 16, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 8, opacity: 0 }}
            className="flex max-w-[92vw] items-center gap-2 rounded-full bg-[#17171a] px-4 py-2.5 text-[13px] font-semibold text-white shadow-xl dark:bg-white dark:text-black">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#16b364] text-[10px] text-white">✓</span><span className="min-w-0">{t.msg}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function PageHeader({ title, subtitle, children, badge = true }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-[22px] font-bold tracking-tight text-neutral-900 dark:text-white">
          {title}
          {badge && <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#2b59ff] text-[11px] font-bold text-white">?</span>}
        </h1>
        <p className="mt-0.5 text-[12.5px] text-neutral-400">{subtitle}</p>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
