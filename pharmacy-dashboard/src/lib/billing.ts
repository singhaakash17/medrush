/**
 * Billing — types, calculations, and local IndexedDB storage.
 *
 * Bills are generated client-side and stored in IndexedDB.
 * The bill number is a per-pharmacy sequential counter kept in localStorage.
 *
 * GST model (Indian pharma):
 *   MRP is GST-inclusive.
 *   D.Price = MRP × (1 − discount%)
 *   GST in item = D.Price × gst_rate / (100 + gst_rate)   [backed out]
 *   CGST = SGST = total_gst / 2
 */

import { openDB, IDBPDatabase } from 'idb';

/* ─── Types ──────────────────────────────────────────────────────────── */

export interface PharmacyProfile {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  mobile: string;
  gstin: string;
  pan: string;
  license20: string;   // Drug License No. 20
  license21: string;   // Drug License No. 21
  affiliated_with?: string;
}

export interface BillLineItem {
  medicine_id: string;
  item_name: string;
  packing: string;       // e.g. "30 Tablet"
  batch_no: string;
  expiry_date: string;   // "MM/YY"
  mrp_paise: number;     // MRP in paise (GST inclusive)
  qty: number;
  discount_pct: number;  // 0–100
  gst_rate_pct: number;  // 0 / 5 / 12
  // Derived (pre-computed on save):
  d_price_paise: number;   // mrp * (1 - disc/100), paise
  gst_paise: number;       // GST backed out from d_price
  amount_paise: number;    // d_price * qty
}

export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'GrowthRx' | 'Credit';
export type BillType = 'walk_in' | 'online';

export interface Bill {
  id: string;
  bill_no: number;
  pharmacy_id: string;
  bill_type: BillType;
  order_id?: string;
  pharmacy: PharmacyProfile;
  patient_name: string;
  patient_mobile: string;
  patient_address: string;
  billed_by: string;
  payment_method: PaymentMethod;
  items: BillLineItem[];
  // Totals (all in paise)
  total_mrp_paise: number;
  total_amount_paise: number;   // sum of amounts (before round-off)
  total_discount_paise: number;
  total_gst_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  round_off_paise: number;      // can be negative
  net_paise: number;            // rounded to nearest rupee
  created_at: string;           // ISO
}

/* ─── Calculations ───────────────────────────────────────────────────── */

/** Round to nearest paisa (2 decimal places in rupees → integer paise) */
function r(n: number): number { return Math.round(n); }

export function computeLineItem(
  medicine_id: string,
  item_name: string,
  packing: string,
  batch_no: string,
  expiry_date: string,
  mrp_paise: number,
  qty: number,
  discount_pct: number,
  gst_rate_pct: number = 5,
): BillLineItem {
  const d_price_paise = r(mrp_paise * (1 - discount_pct / 100));
  const amount_paise  = d_price_paise * qty;
  // Back out GST from inclusive price: gst = amount × rate / (100 + rate)
  const gst_paise = r(amount_paise * gst_rate_pct / (100 + gst_rate_pct));

  return {
    medicine_id, item_name, packing, batch_no, expiry_date,
    mrp_paise, qty, discount_pct, gst_rate_pct,
    d_price_paise, gst_paise, amount_paise,
  };
}

export function computeBillTotals(items: BillLineItem[]) {
  const total_mrp_paise    = items.reduce((s, i) => s + i.mrp_paise * i.qty, 0);
  const total_amount_paise = items.reduce((s, i) => s + i.amount_paise, 0);
  const total_discount_paise = total_mrp_paise - total_amount_paise;
  const total_gst_paise    = items.reduce((s, i) => s + i.gst_paise, 0);
  const cgst_paise         = r(total_gst_paise / 2);
  const sgst_paise         = total_gst_paise - cgst_paise;
  const net_paise          = Math.round(total_amount_paise / 100) * 100; // round to rupee
  const round_off_paise    = net_paise - total_amount_paise;

  return {
    total_mrp_paise, total_amount_paise, total_discount_paise,
    total_gst_paise, cgst_paise, sgst_paise, round_off_paise, net_paise,
  };
}

/* ─── Bill number ────────────────────────────────────────────────────── */

const BILL_NO_KEY = (pharmacyId: string) => `medrush_bill_no_${pharmacyId}`;

export function getNextBillNo(pharmacyId: string): number {
  const stored = localStorage.getItem(BILL_NO_KEY(pharmacyId));
  const next   = stored ? parseInt(stored, 10) + 1 : 10001;
  localStorage.setItem(BILL_NO_KEY(pharmacyId), String(next));
  return next;
}

/* ─── Pharmacy profile (localStorage) ───────────────────────────────── */

const PROFILE_KEY = 'medrush_pharmacy_profile';

export function loadPharmacyProfile(): Partial<PharmacyProfile> {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function savePharmacyProfile(profile: Partial<PharmacyProfile>): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

/* ─── IndexedDB (bills) ──────────────────────────────────────────────── */

interface BillsDB {
  bills: { key: string; value: Bill; indexes: { by_pharmacy: string; by_created_at: string } };
}

let _billsDB: IDBPDatabase<BillsDB> | null = null;

async function getBillsDB(): Promise<IDBPDatabase<BillsDB>> {
  if (_billsDB) return _billsDB;
  _billsDB = await openDB<BillsDB>('medrush_bills_v1', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('bills')) {
        const s = db.createObjectStore('bills', { keyPath: 'id' });
        s.createIndex('by_pharmacy',   'pharmacy_id');
        s.createIndex('by_created_at', 'created_at');
      }
    },
  });
  return _billsDB;
}

export async function saveBill(bill: Bill): Promise<void> {
  const db = await getBillsDB();
  await db.put('bills', bill);
}

export async function getBill(billId: string): Promise<Bill | undefined> {
  const db = await getBillsDB();
  return db.get('bills', billId);
}

export async function listBills(pharmacyId: string, limit = 50): Promise<Bill[]> {
  const db  = await getBillsDB();
  const all = await db.getAllFromIndex('bills', 'by_pharmacy', pharmacyId);
  return all.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
}

/* ─── Formatting helpers ─────────────────────────────────────────────── */

export function rupeesFromPaise(paise: number): string {
  return (paise / 100).toFixed(2);
}

export function formatExpiry(dateStr: string): string {
  // Takes "YYYY-MM-DD" → "MM/YY"
  if (!dateStr) return '';
  const [y, m] = dateStr.split('-');
  return `${m}/${y.slice(2)}`;
}
