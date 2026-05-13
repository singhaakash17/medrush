'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { getBill, rupeesFromPaise, type Bill } from '@/lib/billing';
import { Printer, ArrowLeft, FileText } from 'lucide-react';

export default function BillPrintPage() {
  const { billId } = useParams<{ billId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [bill, setBill] = useState<Bill | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getBill(billId).then((b) => {
      if (b) setBill(b);
      else setNotFound(true);
    });
  }, [billId]);

  useEffect(() => {
    if (bill && searchParams.get('print') === '1') {
      // Small delay so layout renders before print dialog
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [bill, searchParams]);

  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-400">
        <div className="text-center">
          <FileText size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-semibold">Bill not found</p>
          <button onClick={() => router.back()} className="mt-4 text-sm text-blue-600 underline">Go back</button>
        </div>
      </div>
    );
  }

  if (!bill) {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-slate-300 border-t-[#0c4a6e] rounded-full animate-spin" /></div>;
  }

  const p = bill.pharmacy;
  const billDate = new Date(bill.created_at);
  const dateStr = billDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const timeStr = billDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .invoice-wrap { box-shadow: none !important; margin: 0 !important; border: none !important; }
        }
        @page { size: A5 portrait; margin: 8mm; }
      `}</style>

      {/* Top toolbar — hidden on print */}
      <div className="no-print bg-slate-800 text-white px-6 py-3 flex items-center gap-4 print:hidden">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-300 hover:text-white text-sm transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
        <span className="text-slate-500">|</span>
        <span className="text-sm text-slate-300">Bill #{bill.bill_no} · {bill.patient_name}</span>
        <div className="ml-auto flex items-center gap-3">
          {bill.bill_type === 'online' && (
            <span className="text-xs bg-violet-600 text-white px-2 py-1 rounded-full font-medium">Online Order</span>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-[#0c4a6e] rounded-lg text-sm font-semibold hover:bg-[#0a3d5c] transition-colors"
          >
            <Printer size={15} /> Print Invoice
          </button>
        </div>
      </div>

      {/* Invoice — centered on screen, full width on print */}
      <div className="no-print bg-slate-100 min-h-screen p-8 flex justify-center print:p-0 print:bg-white">
        <div className="invoice-wrap bg-white w-full max-w-2xl shadow-lg rounded-sm border border-slate-200 print:shadow-none print:border-0 print:rounded-none">
          <InvoiceBody bill={bill} p={p} dateStr={dateStr} timeStr={timeStr} />
        </div>
      </div>

      {/* For print — no outer wrapper needed */}
      <div className="hidden print:block">
        <InvoiceBody bill={bill} p={p} dateStr={dateStr} timeStr={timeStr} />
      </div>
    </>
  );
}

/* ─── Invoice layout ─────────────────────────────────────────────────── */
function InvoiceBody({ bill, p, dateStr, timeStr }: {
  bill: Bill;
  p: Bill['pharmacy'];
  dateStr: string;
  timeStr: string;
}) {
  return (
    <div className="text-[11px] leading-tight font-sans text-slate-900" style={{ fontFamily: 'Arial, sans-serif' }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex border-b-2 border-slate-800 pb-3 p-4">
        {/* Left: pharmacy info */}
        <div className="flex-1">
          <div className="flex items-start gap-3">
            {/* Logo placeholder */}
            <div className="w-12 h-12 rounded-full border-2 border-slate-300 flex items-center justify-center shrink-0 text-slate-400 text-[9px] font-bold text-center">
              LOGO
            </div>
            <div>
              <h1 className="text-[18px] font-black leading-tight uppercase">{p.name}</h1>
              {p.affiliated_with && (
                <p className="text-[9px] text-slate-500">Affiliated With {p.affiliated_with}</p>
              )}
              <p className="text-[9px] mt-1">{p.line1}</p>
              {p.line2 && <p className="text-[9px]">{p.line2}</p>}
              <p className="text-[9px]">{p.city}</p>
              <p className="text-[9px]">M. {p.mobile}</p>
              <div className="flex gap-4 mt-1 text-[9px]">
                <span>LICENSE 20 : <strong>{p.license20}</strong></span>
                <span>LICENSE 21 : <strong>{p.license21}</strong></span>
              </div>
              <div className="flex gap-4 mt-0.5 text-[9px]">
                <span>GSTIN <strong>{p.gstin}</strong></span>
                <span>PAN <strong>{p.pan}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: invoice meta */}
        <div className="shrink-0 text-right border-l border-slate-200 pl-4 ml-4">
          <p className="text-[16px] font-black">Invoice</p>
          <p className="text-[9px] mt-1">Bill No: <strong>{bill.bill_no}</strong></p>
          <p className="text-[9px]">Payment: <strong>{bill.payment_method}</strong></p>
          {bill.order_id && <p className="text-[9px]">Order: <strong className="font-mono">{bill.order_id.slice(0, 8).toUpperCase()}</strong></p>}
          <p className="text-[9px] mt-1">{dateStr} {timeStr}</p>
          <p className="text-[9px] mt-2 text-slate-500">Billed By: {bill.billed_by}</p>
        </div>
      </div>

      {/* ── Patient bar ─────────────────────────────────────────────── */}
      <div className="flex gap-4 px-4 py-2 bg-slate-50 border-b border-slate-200 text-[10px]">
        <span><strong>PATIENT NAME</strong> {bill.patient_name}</span>
        {bill.patient_mobile && <span><strong>MOBILE</strong> {bill.patient_mobile}</span>}
        {bill.patient_address && <span><strong>ADDRESS</strong> {bill.patient_address}</span>}
      </div>

      {/* ── Items table ─────────────────────────────────────────────── */}
      <div className="px-4 pt-3">
        <table className="w-full text-[9.5px]">
          <thead>
            <tr className="border-b-2 border-slate-700">
              <th className="text-left py-1 font-bold w-5">Sr.</th>
              <th className="text-left py-1 font-bold">Item Name</th>
              <th className="text-center py-1 font-bold w-16">Packing</th>
              <th className="text-center py-1 font-bold w-16">Batch</th>
              <th className="text-center py-1 font-bold w-12">Exp</th>
              <th className="text-right py-1 font-bold w-12">MRP</th>
              <th className="text-right py-1 font-bold w-8">QTY</th>
              <th className="text-right py-1 font-bold w-10">Disc.</th>
              <th className="text-right py-1 font-bold w-12">D.Price</th>
              <th className="text-right py-1 font-bold w-10">GST</th>
              <th className="text-right py-1 font-bold w-14">Amount</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((item, idx) => (
              <tr key={item.medicine_id} className="border-b border-slate-100">
                <td className="py-1.5 text-slate-500">{idx + 1}</td>
                <td className="py-1.5 font-semibold text-blue-800 uppercase">{item.item_name}</td>
                <td className="py-1.5 text-center">{item.packing}</td>
                <td className="py-1.5 text-center font-mono">{item.batch_no}</td>
                <td className="py-1.5 text-center">{item.expiry_date}</td>
                <td className="py-1.5 text-right">{rupeesFromPaise(item.mrp_paise)}</td>
                <td className="py-1.5 text-right">{item.qty}</td>
                <td className="py-1.5 text-right">{item.discount_pct}%</td>
                <td className="py-1.5 text-right">{rupeesFromPaise(item.d_price_paise)}</td>
                <td className="py-1.5 text-right">{item.gst_rate_pct}%</td>
                <td className="py-1.5 text-right font-semibold">{rupeesFromPaise(item.amount_paise)}</td>
              </tr>
            ))}
            {/* Blank rows for visual space (up to 5 items shown) */}
            {bill.items.length < 4 && Array.from({ length: 4 - bill.items.length }).map((_, i) => (
              <tr key={`blank-${i}`} className="border-b border-slate-50">
                <td colSpan={11} className="py-3">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-4">
        <div className="flex gap-3 border-t-2 border-slate-700 pt-2">

          {/* Terms */}
          <div className="flex-1 text-[8.5px] text-slate-600 border-r border-slate-200 pr-3">
            <p className="font-bold text-[9px] text-slate-800 mb-1">Terms &amp; Conditions</p>
            <p>Discount only Applicable on MedRush</p>
            <p>Invoice difference is credited in</p>
            <p>MedRush wallet</p>
            <p>No Returns or No Refund</p>
            <p className="mt-2 font-bold">Sign ___________</p>
          </div>

          {/* GST breakdown */}
          <div className="w-32 text-[9px] border-r border-slate-200 pr-3">
            <table className="w-full">
              <tbody>
                <tr><td className="font-semibold">CGST</td><td className="text-right">{rupeesFromPaise(bill.cgst_paise)}</td></tr>
                <tr><td className="font-semibold">SGST</td><td className="text-right">{rupeesFromPaise(bill.sgst_paise)}</td></tr>
                <tr className="border-t border-slate-200">
                  <td className="font-bold pt-0.5">Total GST</td>
                  <td className="text-right font-bold pt-0.5">{rupeesFromPaise(bill.total_gst_paise)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Item totals */}
          <div className="w-36 text-[9px] border-r border-slate-200 pr-3">
            <table className="w-full">
              <tbody>
                <tr><td>Total Item(s)</td><td className="text-right font-bold">{bill.items.length}</td></tr>
                <tr><td>Total</td><td className="text-right">{rupeesFromPaise(bill.total_amount_paise)}</td></tr>
                <tr><td>MRP</td><td className="text-right">{rupeesFromPaise(bill.total_mrp_paise)}</td></tr>
                <tr><td>Round off</td><td className="text-right">{rupeesFromPaise(bill.round_off_paise)}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Net amount */}
          <div className="w-28 text-right">
            <p className="text-[10px] font-bold">Net</p>
            <p className="text-[22px] font-black leading-none">Rs. {(bill.net_paise / 100).toFixed(0)}</p>
            <div className="mt-2 text-[8.5px] text-slate-600 space-y-0.5">
              <div className="flex justify-between">
                <span>Total Saving:</span>
                <span className="font-semibold">Rs. {(bill.total_discount_paise / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Billed By</span>
                <span className="font-semibold">{bill.billed_by}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Powered by */}
        <p className="text-center text-[8px] text-slate-300 mt-3">Powered by MedRush</p>
      </div>
    </div>
  );
}
