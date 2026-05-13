// ─── Auth ────────────────────────────────────────────────────────────────────
export interface Principal {
  id: string;
  phone_e164: string;
  email: string | null;
  is_verified: boolean;
  is_active: boolean;
}

// ─── User ────────────────────────────────────────────────────────────────────
export interface Profile {
  principal_id: string;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  profile_photo_url: string | null;
  preferred_language: string;
  phone?: string | null;
  city?: string | null;
  order_count?: number;
  rx_count?: number;
}

export interface Address {
  id: string;
  principal_id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

export interface FamilyMember {
  id: string;
  full_name: string;
  relationship: string;
  date_of_birth: string | null;
  gender: string | null;
  is_minor: boolean | null;
  allergies: string[] | null;
}

// ─── Catalog ─────────────────────────────────────────────────────────────────
export interface Medicine {
  id: string;
  brand_name: string;
  generic_name: string;
  form: string;
  strength: string | null;
  pack_size: number;
  pack_unit: string;
  mrp_paise: number;
  gst_rate_bps: number;
  schedule: 'OTC' | 'G' | 'H' | 'H1' | 'X' | 'GENERAL' | null;
  rx_required: boolean;
  is_discontinued: boolean;
  is_active: boolean;
}

export interface MedicineWarning {
  id: string;
  medicine_id: string;
  warning_type: string;
  description: string;
  severity: string;
}

export interface Substitute {
  id: string;
  brand_name: string;
  generic_name: string;
  form: string;
  strength: string | null;
  mrp_paise: number;
  rank: number;
}

// ─── Inventory ───────────────────────────────────────────────────────────────
export interface InventoryItem {
  pharmacy_id: string;
  medicine_id: string;
  qty_available: number | null;
  selling_price_paise: number;
  mrp_paise: number;
  discount_bps: number | null;
  is_listed: boolean;
}

// ─── Geo ─────────────────────────────────────────────────────────────────────
export interface NearbyPharmacy {
  pharmacy_id: string;
  name: string;
  address_line1: string;
  city: string;
  phone: string;
  is_open_now: boolean;
  distance_m: number;
  eta_minutes: number;
  lat: number;
  lon: number;
  medicine_id?: string;
  qty_available?: number;
  selling_price_paise?: number;
  mrp_paise?: number;
}

// ─── Cart ────────────────────────────────────────────────────────────────────
export interface Cart {
  id: string;
  principal_id: string;
  pharmacy_id: string | null;
  state: 'active' | 'checked_out' | 'abandoned' | 'converted';
  coupon_code: string | null;
  expires_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  medicine_id: string;
  qty: number;
  unit_price_paise: number;
}

// ─── Order ───────────────────────────────────────────────────────────────────
export interface Order {
  id: string;
  short_code: string;
  principal_id: string;
  pharmacy_id: string;
  status: string;
  delivery_address: Record<string, unknown>;
  subtotal_paise: number;
  discount_paise: number;
  delivery_fee_paise: number;
  platform_fee_paise: number;
  tax_paise: number;
  total_paise: number;
  sla_target_at: string;
  placed_at: string;
  confirmed_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  medicine_id: string;
  medicine_name: string;
  qty: number;
  unit_price_paise: number;
  total_paise: number;
  is_rx_item: boolean;
}

// ─── Rx ──────────────────────────────────────────────────────────────────────
export interface Prescription {
  id: string;
  principal_id: string;
  family_member_id: string | null;
  doctor_name: string | null;
  hospital_name: string | null;
  prescribed_at: string | null;
  ocr_status: string;
  ocr_confidence_bps: number | null;
  is_verified: boolean;
  retention_class: string;
  created_at: string;
  updated_at: string;
}

export interface RxItem {
  id: string;
  rx_id: string;
  medicine_id: string | null;
  raw_medicine_name: string;
  dosage: string | null;
  frequency: string | null;
  duration_days: number | null;
  qty_prescribed: number | null;
}

export interface RxFlag {
  id: string;
  rx_id: string;
  flag_type: string;
  description: string;
  severity: string;
  created_at: string;
}

export interface PrescriptionDetail extends Prescription {
  items: RxItem[];
  flags: RxFlag[];
}

// ─── Pharmacy ────────────────────────────────────────────────────────────────
export interface Pharmacy {
  id: string;
  name: string;
  dl_number: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  status: string;
  is_open_now: boolean;
}

// ─── Logistics ───────────────────────────────────────────────────────────────
export interface Assignment {
  id: string;
  order_id: string;
  rider_id: string;
  status: string;
  distance_m: number | null;
  eta_seconds: number | null;
  assigned_at: string;
  picked_up_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
}

export interface Rider {
  id: string;
  principal_id: string;
  full_name: string;
  phone_e164: string;
  vehicle_type: string;
  vehicle_number: string;
  status: string;
  rating: number | null;
}

export interface RiderShift {
  id: string;
  rider_id: string;
  started_at: string;
  ended_at: string | null;
  orders_completed: number;
  earnings_paise: number;
}

// ─── Notification ─────────────────────────────────────────────────────────────
export interface DeliveryLog {
  id: string;
  channel: string;
  status: string;
  created_at: string;
}

// ─── Payment ─────────────────────────────────────────────────────────────────
export interface Payment {
  id: string;
  order_id: string;
  amount_paise: number;
  method: string;
  status: string;
  provider: string;
}

export interface PharmacyPayout {
  id: string;
  pharmacy_id: string;
  gross_paise: number;
  net_paise: number;
  commission_paise: number;
  status: string;
  cycle_start: string;
  cycle_end: string;
  paid_at: string | null;
}
