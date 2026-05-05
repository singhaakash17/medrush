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
  is_verified: boolean;
  retention_class: string;
  created_at: string;
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
}

// ─── Notification ────────────────────────────────────────────────────────────
export interface DeliveryLog {
  id: string;
  channel: string;
  status: string;
  created_at: string;
}
