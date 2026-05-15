'use client';
import { useState, useEffect } from 'react';

/**
 * Reads the active pharmacy ID from localStorage in a Next.js-safe way.
 *
 * Returns `null` while the value is still being determined (first render, SSR),
 * `''` if localStorage has no pharmacy_id (redirect to /setup), or the real ID.
 *
 * This three-state contract lets callers distinguish "loading" from "not set":
 *   null  → still hydrating, hold off on redirects and queries
 *   ''    → definitely not set, redirect to /setup
 *   'ph_' → ready, fire queries
 */
export function usePharmacyId(): string | null {
  const [pharmacyId, setPharmacyId] = useState<string | null>(null);

  useEffect(() => {
    setPharmacyId(localStorage.getItem('pharmacy_id') ?? '');
  }, []);

  return pharmacyId;
}
