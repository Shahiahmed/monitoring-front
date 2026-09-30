'use client';

import { useEffect, useState } from 'react';
import { apiFetch, apiUrl } from '../../../lib/api';

interface SbFile {
  fileType: string;
  filename: string;
}

const FILE_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  xml_request:  { label: 'Пример запроса',  icon: '📄' },
  xml_response: { label: 'Пример ответа',   icon: '📄' },
  xsd:          { label: 'XSD схема',        icon: '📋' },
  wsdl:         { label: 'WSDL',             icon: '🔗' },
  data_format:  { label: 'Формат данных',    icon: '📊' },
};

const FILE_TYPE_ORDER = ['xml_request', 'xml_response', 'xsd', 'wsdl', 'data_format'];

export function SbFilesSection({ serviceKey }: { serviceKey: string }) {
  const [files, setFiles] = useState<SbFile[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiFetch(`my-service-sb-files/service/${serviceKey}`)
      .then(r => r.json())
      .then((data: SbFile[]) => { setFiles(data); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [serviceKey]);

  if (!loaded || files.length === 0) return null;

  const sorted = FILE_TYPE_ORDER
    .map(key => files.find(f => f.fileType === key))
    .filter(Boolean) as SbFile[];

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Файлы Smart Bridge</span>
        <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
          {sorted.length + 1}
        </span>
      </div>

      <div className="p-3 flex flex-wrap gap-2">
        {sorted.map(f => {
          const meta = FILE_TYPE_LABELS[f.fileType] ?? { label: f.fileType, icon: '📎' };
          const href = apiUrl(`my-service-sb-files/download/${serviceKey}/${f.fileType}`);
          return (
            <a
              key={f.fileType}
              href={href}
              download={f.filename}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                text-slate-700 dark:text-slate-200
                hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700
                dark:hover:bg-blue-900/30 dark:hover:border-blue-600 dark:hover:text-blue-300
                transition-colors"
            >
              <span>{meta.icon}</span>
              <span>{meta.label}</span>
              <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          );
        })}

        {/* Форматы ШЭП — общий файл для всех сервисов, раздаётся с нашего сервера */}
        <a
          href={apiUrl('my-service-sb-files/shep-formats')}
          download="shep_formats.zip"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
            bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700
            text-slate-700 dark:text-slate-200
            hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700
            dark:hover:bg-blue-900/30 dark:hover:border-blue-600 dark:hover:text-blue-300
            transition-colors"
        >
          <span>📑</span>
          <span>Форматы ШЭП</span>
          <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </a>
      </div>
    </div>
  );
}
