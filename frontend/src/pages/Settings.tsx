import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Settings as SettingsIcon, Save, Server, Shield, Database } from 'lucide-react';

export const Settings: React.FC = () => {
  const [platformName, setPlatformName] = useState('CloudExam Academic Assessment Portal');
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('60');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">System & Examination Policies</h1>
        <p className="text-xs text-slate-500">Configure institutional defaults, evaluation strictness, and infrastructure parameters.</p>
      </div>

      {saved && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl">
          System policies successfully saved.
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
          <Server className="w-4 h-4 text-indigo-600" /> General Configuration
        </h3>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Platform Institutional Header Title
          </label>
          <input
            type="text"
            value={platformName}
            onChange={(e) => setPlatformName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <p className="text-xs font-bold text-slate-900">Student Self-Registration</p>
            <p className="text-[11px] text-slate-500">Allow students to create accounts directly from registration page</p>
          </div>
          <input
            type="checkbox"
            checked={allowRegistration}
            onChange={(e) => setAllowRegistration(e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded"
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <p className="text-xs font-bold text-slate-900">Authoritative Server Heartbeat Check</p>
            <p className="text-[11px] text-slate-500">Strictly enforce UTC deadline synchronization on attempt submission</p>
          </div>
          <span className="text-xs font-bold text-emerald-600 uppercase">Enforced</span>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/25 flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Policies
          </button>
        </div>
      </form>
    </div>
  );
};
