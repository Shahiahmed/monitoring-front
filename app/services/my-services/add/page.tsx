'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api';

interface FormState {
  publishedAt: string;
  serviceKey: string;
  informationSystem: string;
  serviceName: string;
  sortOrder: number;
  isPaid: boolean;
  smartBridgeTicket: string;
  contractExpiresAt: string;
}

const EMPTY: FormState = { publishedAt: '', serviceKey: '', informationSystem: '', serviceName: '', sortOrder: 0, isPaid: false, smartBridgeTicket: '', contractExpiresAt: '' };

function toInputDate(s: string): string {
  const m = s.match(/^(\d{4})\.(\d{2})\.(\d{2}) (\d{2}):(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}` : '';
}
function fromInputDate(s: string): string {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return m ? `${m[1]}.${m[2]}.${m[3]} ${m[4]}:${m[5]}` : '';
}

const inputCls = 'w-full px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelCls = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5';

function AddServiceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get('id');

  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editId) return;
    apiFetch(`my-services/${editId}`)
      .then(r => r.json())
      .then((d: any) => {
        setForm({
          publishedAt: d.publishedAt ?? '',
          serviceKey: d.serviceKey ?? '',
          informationSystem: d.informationSystem ?? '',
          serviceName: d.serviceName ?? '',
          sortOrder: d.sortOrder ?? 0,
          isPaid: d.isPaid ?? false,
          smartBridgeTicket: d.smartBridgeTicket ?? '',
          contractExpiresAt: d.contractExpiresAt ?? '',
        });
        setLoading(false);
      })
      .catch(() => { setError('Не удалось загрузить данные'); setLoading(false); });
  }, [editId]);

  const f = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    if (!form.serviceKey.trim()) { setError('Укажите ключ сервиса'); return; }
    if (!form.serviceName.trim()) { setError('Укажите наименование сервиса'); return; }
    setSaving(true); setError('');
    try {
      const res = await apiFetch(editId ? `my-services/${editId}` : 'my-services', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publishedAt: form.publishedAt || null,
          serviceKey: form.serviceKey.trim(),
          informationSystem: form.informationSystem.trim() || null,
          serviceName: form.serviceName.trim(),
          sortOrder: form.sortOrder,
          isPaid: form.isPaid,
          smartBridgeTicket: form.smartBridgeTicket.trim() || null,
          contractExpiresAt: form.contractExpiresAt.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      router.push('/services/my-services');
    } catch { setError('Ошибка при сохранении'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 animate-app-reveal max-w-2xl">

      {/* Навигация */}
      <button onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-5 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Мои сервисы
      </button>

      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight mb-6">
        {editId ? 'Редактировать сервис' : 'Добавить сервис'}
      </h1>

      <div className="glass-card p-6 space-y-5">

        {/* Ключ + Порядок + Дата */}
        <div className="grid grid-cols-[1fr_6rem_1fr] gap-4">
          <div>
            <label className={labelCls}>Ключ сервиса <span className="text-red-500">*</span></label>
            <input type="text" value={form.serviceKey} onChange={f('serviceKey')}
              placeholder="my-service-key"
              className={`${inputCls} font-mono`} />
          </div>
          <div>
            <label className={labelCls}>Порядок</label>
            <input type="number" min={0} value={form.sortOrder}
              onChange={e => setForm(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Дата публикации</label>
            <input type="datetime-local"
              value={toInputDate(form.publishedAt)}
              onChange={e => setForm(prev => ({ ...prev, publishedAt: fromInputDate(e.target.value) }))}
              className={inputCls} />
          </div>
        </div>

        {/* Наименование */}
        <div>
          <label className={labelCls}>Наименование сервиса <span className="text-red-500">*</span></label>
          <textarea value={form.serviceName} onChange={f('serviceName')}
            placeholder="Введите полное наименование сервиса..."
            rows={2}
            className={`${inputCls} resize-none`} />
        </div>

        {/* ИС */}
        <div>
          <label className={labelCls}>Информационная система</label>
          <input type="text" value={form.informationSystem} onChange={f('informationSystem')}
            placeholder="Название информационной системы..."
            className={inputCls} />
        </div>

        {/* Smart Bridge + Платный */}
        <div className="grid grid-cols-2 gap-4 items-end">
          <div>
            <label className={labelCls}>Номер заявки Smart Bridge</label>
            <input type="text" value={form.smartBridgeTicket} onChange={f('smartBridgeTicket')}
              placeholder="202400000000"
              className={`${inputCls} font-mono`} />
          </div>
          <div className="pb-0.5">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div className="relative" onClick={() => setForm(prev => ({ ...prev, isPaid: !prev.isPaid }))}>
                <div className={`w-11 h-6 rounded-full transition-colors ${form.isPaid ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isPaid ? 'translate-x-5' : ''}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Платный сервис</p>
                {form.isPaid && <p className="text-xs text-amber-600 dark:text-amber-400">Договор и срок загружаются в карточке</p>}
              </div>
            </label>
          </div>
        </div>

        {/* Ошибка */}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {/* Кнопки */}
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button onClick={() => router.back()}
            className="px-4 py-2 text-sm rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            Отмена
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all shadow-sm">
            {saving ? 'Сохранение...' : editId ? 'Сохранить изменения' : 'Добавить сервис'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AddServicePage() {
  return <Suspense><AddServiceContent /></Suspense>;
}
