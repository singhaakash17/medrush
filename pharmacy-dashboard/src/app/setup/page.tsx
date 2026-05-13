'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface PharmacyInfo {
  id: string;
  name: string;
  city: string;
  status: string;
}

export default function SetupPage() {
  const router = useRouter();
  const [pharmacyId, setPharmacyId] = useState('');
  const [userId, setUserId]       = useState('');
  const [pharmacy, setPharmacy]   = useState<PharmacyInfo | null>(null);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Pre-fill from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('pharmacy_id');
    const uid    = localStorage.getItem('user_id');
    if (stored) setPharmacyId(stored);
    if (uid)    setUserId(uid);
  }, []);

  const verifyPharmacy = async () => {
    if (!pharmacyId.trim()) return;
    setVerifying(true);
    setError('');
    setPharmacy(null);
    try {
      const res = await api.get(`/pharmacies/${pharmacyId.trim()}`, {
        headers: {
          'x-pharmacy-id': pharmacyId.trim(),
          'x-user-id': userId.trim() || 'setup',
        },
      });
      setPharmacy(res.data);
    } catch {
      setError('Pharmacy not found. Check the ID and try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!pharmacyId.trim()) {
      setError('Pharmacy ID is required.');
      return;
    }
    setLoading(true);
    try {
      localStorage.setItem('pharmacy_id', pharmacyId.trim());
      if (userId.trim()) localStorage.setItem('user_id', userId.trim());
      router.push('/dashboard/orders');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-900 mb-4">
            <span className="text-2xl">💊</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">MedRush Pharmacy</h1>
          <p className="text-sm text-slate-500 mt-1">Dashboard Setup</p>
        </div>

        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Connect Your Pharmacy</h2>
            <p className="text-sm text-slate-500">
              Enter your pharmacy ID to start receiving and managing orders.
            </p>
          </div>

          {/* Pharmacy ID input */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
              Pharmacy ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={pharmacyId}
                onChange={(e) => {
                  setPharmacyId(e.target.value);
                  setPharmacy(null);
                  setError('');
                }}
                placeholder="e.g. ph_ind_01"
                className="flex-1 px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent font-mono"
                required
              />
              <button
                type="button"
                onClick={verifyPharmacy}
                disabled={verifying || !pharmacyId.trim()}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {verifying ? '…' : 'Verify'}
              </button>
            </div>
          </div>

          {/* Pharmacy card */}
          {pharmacy && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-emerald-800 truncate">{pharmacy.name}</p>
                <p className="text-xs text-emerald-600">{pharmacy.city} · Status: {pharmacy.status}</p>
              </div>
            </div>
          )}

          {/* User ID input */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
              Pharmacist / Staff ID
              <span className="ml-1 font-normal text-slate-400 normal-case">(optional)</span>
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g. ph_user_01"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent font-mono"
            />
            <p className="mt-1 text-xs text-slate-400">
              Used for audit logs. Leave blank to use pharmacy ID as the actor.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Save button */}
          <button
            type="submit"
            disabled={loading || !pharmacyId.trim()}
            className="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving…' : 'Save & Open Dashboard →'}
          </button>

          {/* Hint */}
          <p className="text-xs text-center text-slate-400">
            These credentials are stored locally in your browser and never sent to third parties.
          </p>
        </form>

        {/* Dev shortcut */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setPharmacyId('ph_ind_01');
              setUserId('ph_user_01');
            }}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            Use demo pharmacy (ph_ind_01)
          </button>
        </div>
      </div>
    </div>
  );
}
