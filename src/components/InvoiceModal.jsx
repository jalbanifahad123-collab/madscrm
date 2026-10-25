import { useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Modal } from './ui';
import { buildInvoiceHtml, getLogoDataUrl, downloadInvoiceHtml, printInvoiceHtml, invoiceFileName } from '../invoice';

// Invoice preview popup: shows the exact document, with Download (a file
// you can send to the client) and Print / Save as PDF actions.
export default function InvoiceModal({ invoice, client, payments, settings, onClose, toast }) {
  const [html, setHtml] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const logo = await getLogoDataUrl();
      if (!alive) return;
      setHtml(buildInvoiceHtml({ invoice, client, payments, settings, logo, toolbar: false }));
    })();
    return () => { alive = false; };
  }, [invoice, client, payments, settings]);

  const fullHtml = async () =>
    buildInvoiceHtml({ invoice, client, payments, settings, logo: await getLogoDataUrl(), toolbar: true });

  const doDownload = async () => {
    downloadInvoiceHtml(await fullHtml(), invoiceFileName(invoice, client));
    toast?.(`Invoice ${invoice.no} downloaded`);
  };

  const doPrint = () => {
    const w = window.open('', '_blank'); // open synchronously so popup blockers allow it
    fullHtml().then((h) => {
      if (!printInvoiceHtml(h, w)) {
        downloadInvoiceHtml(h, invoiceFileName(invoice, client));
        toast?.('Popup blocked — invoice downloaded instead. Open it and press Ctrl+P to save as PDF.');
      }
    });
  };

  return (
    <Modal
      open
      xwide
      onClose={onClose}
      title={`Invoice ${invoice.no}`}
      subtitle={client ? `${client.name}${client.company ? ' · ' + client.company : ''}` : 'Client invoice'}
    >
      <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-[#eceff3] dark:border-white/10">
        {html ? (
          <iframe title={`Invoice ${invoice.no}`} srcDoc={html} className="block h-[56vh] w-full" />
        ) : (
          <div className="flex h-[56vh] items-center justify-center text-[13px] text-neutral-400">Preparing invoice…</div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button onClick={doDownload} className="flex items-center gap-1.5 rounded-full bg-[#2248f5] px-4 py-2.5 text-[12.5px] font-semibold text-white transition hover:bg-[#1a3bd0] active:scale-[0.98]">
          <Download size={15} /> Download invoice
        </button>
        <button onClick={doPrint} className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-4 py-2.5 text-[12.5px] font-semibold text-neutral-700 transition hover:bg-neutral-200 active:scale-[0.98] dark:bg-white/[0.07] dark:text-neutral-200 dark:hover:bg-white/10">
          <Printer size={15} /> Print / Save as PDF
        </button>
        <span className="flex-1" />
        <p className="text-[11px] leading-snug text-neutral-400">Send the downloaded file to your client on WhatsApp or email.</p>
      </div>
    </Modal>
  );
}
