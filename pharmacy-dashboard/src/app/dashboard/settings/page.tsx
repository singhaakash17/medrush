'use client';
import { useState, useEffect } from 'react';
import { loadPharmacyProfile, savePharmacyProfile, type PharmacyProfile } from '@/lib/billing';
import { CheckCircle, Settings } from 'lucide-react';

type Field = keyof PharmacyProfile;

const FIELDS: { key: Field; label: string; placeholder: string; required?: boolean }[] = [
  { key: 'name',           label: 'Pharmacy Name',       placeholder: 'e.g. Apollo Pharmacy Indiranagar', required: true },
  { key: 'affiliated_with',label: 'Affiliated With',     placeholder: 'e.g. Apollo HealthCo Ltd' },
  { key: 'line1',          label: 'Address Line 1',      placeholder: 'No. 123, 12th Main Road, HAL 2nd Stage', required: true },
  { key: 'line2',          label: 'Address Line 2',      placeholder: 'Indiranagar, Bengaluru' },
  { key: 'city',           label: 'City',                placeholder: 'Bengaluru', required: true },
  { key: 'mobile',         label: 'Contact Number',      placeholder: '9876543210', required: true },
  { key: 'gstin',          label: 'GSTIN',               placeholder: '29AALFL3281B1ZB', required: true },
  { key: 'pan',            label: 'PAN',                 placeholder: 'AALFL3281B' },
  { key: 'license20',      label: 'Drug License No. 20', placeholder: 'KA-B61-200317' },
  { key: 'license21',      label: 'Drug License No. 21', placeholder: 'KA-B61-200317' },
];

export default function SettingsPage() {
  const [form, setForm]       = useState<Partial<PharmacyProfile>>({});
  const [saved, setSaved]     = useState(false);

  useEffect(() => { setForm(loadPharmacyProfile()); }, []);

  const handleSave = () => {
    savePharmacyProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Settings size={18} className="text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pharmacy Profile</h1>
          <p className="text-sm text-slate-500 mt-0.5">Details printed on every invoice</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        {FIELDS.map(({ key, label, placeholder, required }) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              {label}{required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            <input
              type="text"
              value={(form[key] as string) ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              placeholder={placeholder}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0c4a6e]"
            />
          </div>
        ))}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-[#0c4a6e] text-white rounded-xl font-bold text-sm hover:bg-[#0a3d5c] transition-colors"
          >
            Save Profile
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
              <CheckCircle size={15} /> Saved!
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
        <strong>Note:</strong> These details are stored locally in your browser and printed on every invoice. Make sure GSTIN and Drug License numbers are accurate for compliance.
      </div>
    </div>
  );
}
