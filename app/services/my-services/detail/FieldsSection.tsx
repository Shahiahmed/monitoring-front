'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../../../lib/api';

interface ServiceFormat {
  id: number;
  serviceId: number;
  name: string;
  sortOrder: number;
}

interface FieldRow {
  id: number;
  serviceId: number;
  direction: string;
  sortOrder: number;
  groupName: string | null;
  fieldNumber: string | null;
  nameRu: string | null;
  tagName: string | null;
  formatInfo: string | null;
  sizeInfo: string | null;
  isRequired: string | null;
  notes: string | null;
  formatId: number | null;
}

type FieldForm = Omit<FieldRow, 'id'>;

const emptyForm = (serviceId: number, direction: string, sortOrder = 0, formatId: number | null = null): FieldForm => ({
  serviceId, direction, sortOrder, formatId,
  groupName: null, fieldNumber: null, nameRu: null, tagName: null,
  formatInfo: null, sizeInfo: null, isRequired: null, notes: null,
});

const inputCls =
  'w-full px-2 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-600 ' +
  'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 ' +
  'placeholder:text-slate-300 dark:placeholder:text-slate-600 ' +
  'focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-400';

function InlineForm({
  form, onChange, onSave, onCancel, saving, error, isNew, colSpan,
}: {
  form: FieldForm;
  onChange: (f: Partial<FieldForm>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string;
  isNew: boolean;
  colSpan: number;
}) {
  const field = (key: keyof FieldForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ [key]: e.target.value || null });

  return (
    <tr>
      <td colSpan={colSpan} className="p-0 border-b border-blue-100 dark:border-blue-900/50">
        <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30">
          <div className="mb-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Группа (раздел)</label>
            <input value={form.groupName ?? ''} onChange={field('groupName')}
              placeholder="Служебная информация / Персональные данные заявителя..."
              className={inputCls} />
          </div>
          <div className="grid grid-cols-4 gap-2 mb-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">№</label>
              <input value={form.fieldNumber ?? ''} onChange={field('fieldNumber')}
                placeholder="1 / 1.1"
                className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Наименование</label>
              <input value={form.nameRu ?? ''} onChange={field('nameRu')}
                placeholder="ИИН гражданина..."
                className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Обязательность</label>
              <input value={form.isRequired ?? ''} onChange={field('isRequired')}
                placeholder="Да / Нет / О / +"
                className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Поле / Тэг</label>
              <input value={form.tagName ?? ''} onChange={field('tagName')}
                placeholder="iin"
                className={`${inputCls} font-mono`} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Формат</label>
              <input value={form.formatInfo ?? ''} onChange={field('formatInfo')}
                placeholder="Строка / Дата..."
                className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Размерность</label>
              <input value={form.sizeInfo ?? ''} onChange={field('sizeInfo')}
                placeholder="12 / char(12)..."
                className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Примечание</label>
              <input value={form.notes ?? ''} onChange={field('notes')}
                placeholder="Описание поля..."
                className={inputCls} />
            </div>
          </div>
          {error && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{error}</p>}
          <div className="flex gap-2">
            <button onClick={onSave} disabled={saving}
              className="px-4 py-1.5 text-xs font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Сохранение...' : isNew ? 'Добавить' : 'Сохранить'}
            </button>
            <button onClick={onCancel}
              className="px-3 py-1.5 text-xs rounded-md text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              Отмена
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

function RequiredBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-slate-300 dark:text-slate-600">—</span>;
  const v = value.toLowerCase();
  const cls =
    ['да', 'о', '+', 'yes'].includes(v)
      ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 ring-1 ring-inset ring-rose-200 dark:ring-rose-800/60'
    : v === 'уо'
      ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-200 dark:ring-amber-800/60'
    : ['н', 'нет', 'no'].includes(v)
      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-800/60'
    : v.startsWith('да (')
      ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 ring-1 ring-inset ring-violet-200 dark:ring-violet-800/60'
      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 ring-1 ring-inset ring-slate-200 dark:ring-slate-700';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${cls}`}>{value}</span>
  );
}

function fieldDepth(fieldNumber: string | null): number {
  if (!fieldNumber) return 0;
  return (fieldNumber.match(/\./g) ?? []).length;
}

type GroupedItem =
  | { type: 'group'; groupName: string; key: string }
  | { type: 'row'; row: FieldRow; key: string };

function ExpandableNote({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current && !expanded) {
      setIsClamped(ref.current.scrollHeight > ref.current.clientHeight + 1);
    }
  }, [text, expanded]);

  const clampStyle: React.CSSProperties = expanded ? {} : {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 3,
    overflow: 'hidden',
  };

  return (
    <div>
      <span
        ref={ref}
        style={clampStyle}
        className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed"
      >
        {text}
      </span>
      {(isClamped || expanded) && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="inline-flex items-center gap-0.5 mt-0.5 text-[10px] text-blue-500 dark:text-blue-400 opacity-60 hover:opacity-100 transition-opacity"
        >
          {expanded ? (
            <>
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Свернуть
            </>
          ) : (
            <>
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Раскрыть
            </>
          )}
        </button>
      )}
    </div>
  );
}

function DirectionSection({
  serviceId, direction, label, isAdmin, formatId, allRows, onReload,
}: {
  serviceId: number;
  direction: string;
  label: string;
  isAdmin: boolean;
  formatId: number | null;
  allRows: FieldRow[];
  onReload: () => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<FieldForm>(emptyForm(serviceId, direction, 0, formatId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Filter rows by direction and formatId
  const rows = allRows.filter(r => r.direction === direction && r.formatId === formatId);

  const startAdd = () => {
    setAdding(true);
    setEditingId(null);
    setForm(emptyForm(serviceId, direction, rows.length, formatId));
    setError('');
  };

  const startEdit = (row: FieldRow) => {
    setEditingId(row.id);
    setAdding(false);
    setForm({ ...row });
    setError('');
  };

  const cancel = () => { setEditingId(null); setAdding(false); setError(''); };

  const save = async () => {
    setSaving(true); setError('');
    try {
      const res = editingId
        ? await apiFetch(`my-service-fields/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          })
        : await apiFetch('my-service-fields', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, sortOrder: rows.length }),
          });
      if (!res.ok) throw new Error();
      cancel();
      onReload();
    } catch { setError('Ошибка при сохранении'); }
    finally { setSaving(false); }
  };

  const deleteRow = async (id: number) => {
    if (!confirm('Удалить поле?')) return;
    await apiFetch(`my-service-fields/${id}`, { method: 'DELETE' });
    onReload();
  };

  const grouped: GroupedItem[] = [];
  rows.forEach((row, i) => {
    const prevGroup = i > 0 ? rows[i - 1].groupName : null;
    if (row.groupName && row.groupName !== prevGroup) {
      grouped.push({ type: 'group', groupName: row.groupName, key: `g-${i}-${row.groupName}` });
    }
    grouped.push({ type: 'row', row, key: `r-${row.id}` });
  });

  const show = {
    fieldNumber: rows.some(r => r.fieldNumber),
    nameRu:      true,
    tagName:     rows.some(r => r.tagName),
    formatInfo:  rows.some(r => r.formatInfo),
    sizeInfo:    rows.some(r => r.sizeInfo),
    isRequired:  rows.some(r => r.isRequired),
    notes:       rows.some(r => r.notes),
  };

  if (rows.length === 0) {
    (Object.keys(show) as (keyof typeof show)[]).forEach(k => { show[k] = true; });
  }

  const colSpan =
    (show.fieldNumber ? 1 : 0) + 1 +
    (show.tagName ? 1 : 0) +
    (show.formatInfo ? 1 : 0) +
    (show.sizeInfo ? 1 : 0) +
    (show.isRequired ? 1 : 0) +
    (show.notes ? 1 : 0) +
    (isAdmin ? 1 : 0);

  const isRequest = direction === 'REQUEST';

  return (
    <div className="glass-card overflow-hidden mb-4">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className={`w-1 h-4 rounded-full shrink-0 ${isRequest ? 'bg-blue-400 dark:bg-blue-500' : 'bg-emerald-400 dark:bg-emerald-500'}`} />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</h3>
          <span className="text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
            {rows.length}
          </span>
        </div>
        {isAdmin && (
          <button onClick={startAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Добавить поле
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs table-fixed min-w-96">
          <colgroup>
            {show.fieldNumber  && <col style={{ width: '2.5rem' }} />}
            <col />
            {show.tagName      && <col style={{ width: '13%' }} />}
            {show.formatInfo   && <col style={{ width: '11%' }} />}
            {show.sizeInfo     && <col style={{ width: '10%' }} />}
            {show.isRequired   && <col style={{ width: '16%' }} />}
            {show.notes        && <col style={{ width: '22%' }} />}
            {isAdmin           && <col style={{ width: '3.5rem' }} />}
          </colgroup>
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700/60">
              {show.fieldNumber  && <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">№</th>}
              <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Наименование</th>
              {show.tagName      && <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Поле / Тэг</th>}
              {show.formatInfo   && <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Формат</th>}
              {show.sizeInfo     && <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Размер</th>}
              {show.isRequired   && <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Обяз.</th>}
              {show.notes        && <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Примечание</th>}
              {isAdmin           && <th className="px-2 py-2" />}
            </tr>
          </thead>
          <tbody>
            {grouped.length === 0 && !adding ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-slate-400 text-sm">
                  {isAdmin ? 'Поля не добавлены. Нажмите «Добавить поле».' : 'Поля не заданы.'}
                </td>
              </tr>
            ) : (
              grouped.map((item, idx) => {
                if (item.type === 'group') {
                  return (
                    <tr key={item.key}>
                      <td colSpan={colSpan} className="p-0">
                        <div className="flex items-center gap-2.5 px-4 py-2 bg-linear-to-r from-indigo-50/90 via-indigo-50/40 to-transparent dark:from-indigo-950/40 dark:via-indigo-950/10 dark:to-transparent border-y border-indigo-100 dark:border-indigo-900/40">
                          <div className="w-1 h-4 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0" />
                          <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 leading-snug">{item.groupName}</span>
                        </div>
                      </td>
                    </tr>
                  );
                }

                const { row } = item;
                const depth = fieldDepth(row.fieldNumber);
                const rowIdx = grouped.slice(0, idx).filter(i => i.type === 'row').length;
                return (
                  <React.Fragment key={item.key}>
                    <tr className={`border-b border-slate-100 dark:border-slate-800/40 transition-colors group/row ${
                      editingId === row.id
                        ? 'bg-blue-50/50 dark:bg-blue-900/15'
                        : rowIdx % 2 === 0
                          ? 'bg-white/70 dark:bg-transparent hover:bg-blue-50/40 dark:hover:bg-blue-900/10'
                          : 'bg-slate-50/70 dark:bg-slate-800/10 hover:bg-blue-50/40 dark:hover:bg-blue-900/10'
                    }`}>
                      {show.fieldNumber && (
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">{row.fieldNumber ?? '—'}</span>
                        </td>
                      )}
                      <td className="px-3 py-2.5">
                        <div style={{ paddingLeft: `${depth * 14}px` }} className="flex items-start gap-1.5">
                          {depth > 0 && (
                            <span className="text-slate-300 dark:text-slate-600 mt-0.5 shrink-0 text-[10px]">└</span>
                          )}
                          <span className={`text-slate-700 dark:text-slate-200 leading-relaxed ${depth === 0 ? 'font-medium' : 'text-[12px]'}`}>
                            {row.nameRu ?? <span className="text-slate-300 dark:text-slate-600">—</span>}
                          </span>
                        </div>
                      </td>
                      {show.tagName && (
                        <td className="px-3 py-2.5">
                          {row.tagName
                            ? <span className="font-mono text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-md border border-blue-100 dark:border-blue-800/40 break-all">{row.tagName}</span>
                            : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                      )}
                      {show.formatInfo && (
                        <td className="px-3 py-2.5">
                          {row.formatInfo
                            ? <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-1.5 py-0.5 rounded-md">{row.formatInfo}</span>
                            : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                      )}
                      {show.sizeInfo && (
                        <td className="px-3 py-2.5">
                          {row.sizeInfo
                            ? <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{row.sizeInfo}</span>
                            : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                      )}
                      {show.isRequired  && <td className="px-3 py-2.5"><RequiredBadge value={row.isRequired} /></td>}
                      {show.notes && (
                        <td className="px-3 py-2.5">
                          {row.notes ? <ExpandableNote text={row.notes} /> : ''}
                        </td>
                      )}
                      {isAdmin && (
                        <td className="px-2 py-2.5">
                          <div className="flex gap-0.5 justify-end opacity-0 group-hover/row:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(row)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button onClick={() => deleteRow(row.id)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                    {editingId === row.id && (
                      <InlineForm
                        form={form}
                        onChange={delta => setForm(p => ({ ...p, ...delta }))}
                        onSave={save}
                        onCancel={cancel}
                        saving={saving}
                        error={error}
                        isNew={false}
                        colSpan={colSpan}
                      />
                    )}
                  </React.Fragment>
                );
              })
            )}
            {adding && (
              <InlineForm
                form={form}
                onChange={delta => setForm(p => ({ ...p, ...delta }))}
                onSave={save}
                onCancel={cancel}
                saving={saving}
                error={error}
                isNew
                colSpan={colSpan}
              />
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FieldsSection({ serviceId, isAdmin }: { serviceId: number; isAdmin: boolean }) {
  const [formats, setFormats] = useState<ServiceFormat[]>([]);
  const [activeFormatId, setActiveFormatId] = useState<number | null>(null);
  const [allRows, setAllRows] = useState<FieldRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);

  // Format creation state
  const [addingFormat, setAddingFormat] = useState(false);
  const [newFormatName, setNewFormatName] = useState('');
  const [savingFormat, setSavingFormat] = useState(false);

  // Format rename state
  const [renamingFormatId, setRenamingFormatId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const loadFormats = useCallback(() => {
    return apiFetch(`my-service-formats/service/${serviceId}`)
      .then(r => r.json())
      .then((data: ServiceFormat[]) => {
        setFormats(data);
        if (data.length > 0) {
          setActiveFormatId(prev => {
            if (prev !== null && data.some(f => f.id === prev)) return prev;
            return data[0].id;
          });
        } else {
          setActiveFormatId(null);
        }
      })
      .catch(() => {});
  }, [serviceId]);

  const loadRows = useCallback(() => {
    apiFetch(`my-service-fields/service/${serviceId}`)
      .then(r => r.json())
      .then((data: FieldRow[]) => { setAllRows(data); setLoadingRows(false); })
      .catch(() => setLoadingRows(false));
  }, [serviceId]);

  useEffect(() => {
    loadFormats();
    loadRows();
  }, [loadFormats, loadRows]);

  const createFormat = async () => {
    const name = newFormatName.trim();
    if (!name) return;
    setSavingFormat(true);
    try {
      const res = await apiFetch('my-service-formats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, name, sortOrder: formats.length }),
      });
      if (!res.ok) throw new Error();
      setNewFormatName('');
      setAddingFormat(false);
      await loadFormats();
    } catch { /* ignore */ }
    finally { setSavingFormat(false); }
  };

  const deleteFormat = async (id: number) => {
    if (!confirm('Удалить формат и все его поля?')) return;
    const res = await apiFetch(`my-service-formats/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      alert(`Ошибка удаления: ${res.status}`);
      return;
    }
    await loadFormats();
    loadRows();
  };

  const startRename = (f: ServiceFormat) => {
    setRenamingFormatId(f.id);
    setRenameValue(f.name);
  };

  const commitRename = async (f: ServiceFormat) => {
    const name = renameValue.trim();
    if (!name || name === f.name) { setRenamingFormatId(null); return; }
    await apiFetch(`my-service-formats/${f.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceId, name, sortOrder: f.sortOrder }),
    });
    setRenamingFormatId(null);
    loadFormats();
  };

  const hasFormats = formats.length > 0;
  // When no formats: show fields where formatId=null
  const currentFormatId = hasFormats ? activeFormatId : null;

  if (loadingRows) {
    return (
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Форматы данных</p>
        <div className="glass-card p-6 text-center text-slate-400 text-sm">Загрузка...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Форматы данных</p>
        {isAdmin && !addingFormat && (
          <button onClick={() => setAddingFormat(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Добавить формат
          </button>
        )}
      </div>

      {/* Format tabs */}
      {(hasFormats || addingFormat) && (
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {formats.map(f => (
            <div key={f.id} className="flex items-center gap-0.5">
              {renamingFormatId === f.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={() => commitRename(f)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitRename(f);
                    if (e.key === 'Escape') setRenamingFormatId(null);
                  }}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-blue-400 dark:border-blue-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 w-32"
                />
              ) : (
                <button
                  onClick={() => setActiveFormatId(f.id)}
                  onDoubleClick={() => isAdmin && startRename(f)}
                  title={isAdmin ? 'Двойной клик — переименовать' : undefined}
                  className={`px-3 py-1.5 text-xs font-medium rounded-l-lg transition-all ${
                    activeFormatId === f.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}>
                  {f.name?.trim() || 'Без названия'}
                </button>
              )}
              {isAdmin && renamingFormatId !== f.id && (
                <button
                  onClick={() => deleteFormat(f.id)}
                  className={`px-1.5 py-1.5 text-xs rounded-r-lg transition-all ${
                    activeFormatId === f.id
                      ? 'bg-blue-600 text-blue-200 hover:text-white hover:bg-blue-700'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                  }`}
                  title="Удалить формат">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}

          {/* Inline format creation form */}
          {addingFormat && (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={newFormatName}
                onChange={e => setNewFormatName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createFormat(); if (e.key === 'Escape') { setAddingFormat(false); setNewFormatName(''); } }}
                placeholder="requestType: 1"
                className="px-2.5 py-1.5 text-xs rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 w-40"
              />
              <button onClick={createFormat} disabled={savingFormat || !newFormatName.trim()}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                OK
              </button>
              <button onClick={() => { setAddingFormat(false); setNewFormatName(''); }}
                className="px-2 py-1.5 text-xs rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                Отмена
              </button>
            </div>
          )}
        </div>
      )}

      <DirectionSection
        serviceId={serviceId}
        direction="REQUEST"
        label="Запрос"
        isAdmin={isAdmin}
        formatId={currentFormatId}
        allRows={allRows}
        onReload={loadRows}
      />
      <DirectionSection
        serviceId={serviceId}
        direction="RESPONSE"
        label="Ответ"
        isAdmin={isAdmin}
        formatId={currentFormatId}
        allRows={allRows}
        onReload={loadRows}
      />
    </div>
  );
}
