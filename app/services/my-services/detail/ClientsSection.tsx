'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api';

interface ServiceClient {
  id: number;
  serviceId: number;
  organizationName: string;
  informationSystem: string | null;
  isPaid: boolean;
  notes: string | null;
  smartBridgeTicket: string | null;
  connectionBasis: string | null;
  connectionDate: string | null;
  contractFileName: string | null;
}

type ClientForm = Omit<ServiceClient, 'id' | 'contractFileName'>;

const emptyForm = (serviceId: number): ClientForm => ({
  serviceId,
  organizationName: '',
  informationSystem: null,
  isPaid: false,
  notes: null,
  smartBridgeTicket: null,
  connectionBasis: null,
  connectionDate: null,
});

const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 ' +
  'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 ' +
  'placeholder:text-slate-400 dark:placeholder:text-slate-500 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500';

const labelCls = 'block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1';

function ClientModal({
  form, onChange, onSave, onClose, saving, isNew,
}: {
  form: ClientForm;
  onChange: (f: Partial<ClientForm>) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  isNew: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-app-reveal">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            {isNew ? 'Добавить клиента' : 'Редактировать клиента'}
          </h3>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>Наименование организации *</label>
            <input value={form.organizationName}
              onChange={e => onChange({ organizationName: e.target.value })}
              placeholder="АО «НИТ» / ГКП «БСМП»..."
              className={inputCls} autoFocus />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Информационная система</label>
            <input value={form.informationSystem ?? ''}
              onChange={e => onChange({ informationSystem: e.target.value || null })}
              placeholder="АИС БДКИ / ЕСУТД..."
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Заявка Smart Bridge</label>
            <input value={form.smartBridgeTicket ?? ''}
              onChange={e => onChange({ smartBridgeTicket: e.target.value || null })}
              placeholder="SB-12345..."
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Дата подключения</label>
            <input type="date" value={form.connectionDate ?? ''}
              onChange={e => onChange({ connectionDate: e.target.value || null })}
              className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Основание для подключения</label>
            <input value={form.connectionBasis ?? ''}
              onChange={e => onChange({ connectionBasis: e.target.value || null })}
              placeholder="Договор №... / письмо..."
              className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Примечание</label>
            <input value={form.notes ?? ''}
              onChange={e => onChange({ notes: e.target.value || null })}
              placeholder="Дополнительная информация..."
              className={inputCls} />
          </div>
          <div className="col-span-2 flex items-center gap-2.5 pt-1">
            <input id="client-paid" type="checkbox" checked={form.isPaid}
              onChange={e => onChange({ isPaid: e.target.checked })}
              className="h-4 w-4 accent-amber-500" />
            <label htmlFor="client-paid" className="text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
              Платный
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <button onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            Отмена
          </button>
          <button onClick={onSave} disabled={saving || !form.organizationName.trim()}
            className="px-5 py-2 text-sm font-semibold rounded-lg text-white bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all">
            {saving ? 'Сохранение...' : isNew ? 'Добавить' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ClientsSection({ serviceId, isAdmin }: { serviceId: number; isAdmin: boolean }) {
  const router = useRouter();
  const [clients, setClients] = useState<ServiceClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm(serviceId));
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    apiFetch(`my-service-clients/service/${serviceId}`)
      .then(r => r.json())
      .then((data: ServiceClient[]) => {
        setClients([...data].sort((a, b) => (b.isPaid ? 1 : 0) - (a.isPaid ? 1 : 0)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [serviceId]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm(serviceId));
    setModalOpen(true);
  };

  const openEdit = (c: ServiceClient) => {
    setEditingId(c.id);
    setForm({
      serviceId: c.serviceId, organizationName: c.organizationName,
      informationSystem: c.informationSystem, isPaid: c.isPaid,
      notes: c.notes, smartBridgeTicket: c.smartBridgeTicket,
      connectionBasis: c.connectionBasis, connectionDate: c.connectionDate,
    });
    setModalOpen(true);
  };

  const close = () => { setModalOpen(false); setEditingId(null); };

  const save = async () => {
    if (!form.organizationName.trim()) return;
    setSaving(true);
    try {
      const res = editingId
        ? await apiFetch(`my-service-clients/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          })
        : await apiFetch('my-service-clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
      if (!res.ok) throw new Error();
      close();
      load();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const deleteClient = async (id: number) => {
    if (!confirm('Удалить клиента?')) return;
    await apiFetch(`my-service-clients/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <>
      {/* Модальное окно — рендерится в body через портал */}
      {modalOpen && createPortal(
        <ClientModal
          form={form}
          onChange={delta => setForm(p => ({ ...p, ...delta }))}
          onSave={save}
          onClose={close}
          saving={saving}
          isNew={editingId === null}
        />,
        document.body
      )}

      <div className="glass-card overflow-hidden">
        {/* Заголовок */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Клиенты сервиса</p>
            {!loading && (
              <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">{clients.length}</span>
            )}
          </div>
          {isAdmin && (
            <button onClick={openAdd}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Добавить
            </button>
          )}
        </div>

        {/* Список клиентов */}
        {loading ? (
          <div className="px-5 py-6 text-center text-slate-400 text-sm">Загрузка...</div>
        ) : clients.length === 0 ? (
          <div className="px-5 py-6 text-center">
            <p className="text-sm text-slate-400">{isAdmin ? 'Нет клиентов. Нажмите «Добавить».' : 'Клиенты не добавлены.'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {clients.map(c => (
              <li key={c.id}
                onClick={() => router.push(`/services/my-services/client?id=${c.id}`)}
                className="flex items-start justify-between gap-3 px-5 py-3.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors group cursor-pointer">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-snug truncate">
                    {c.organizationName}
                  </p>
                  {c.informationSystem && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{c.informationSystem}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {c.isPaid
                    ? <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">Платный</span>
                    : <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">Бесплатный</span>
                  }
                  {isAdmin && (
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEdit(c)}
                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => deleteClient(c.id)}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
