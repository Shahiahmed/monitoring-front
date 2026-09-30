'use client';

import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AiChatWidget() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const next: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await apiFetch('ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.body) throw new Error('no stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';
      let firstChunk = true;
      let streaming = true;

      while (streaming) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') { streaming = false; break; }
          try {
            const token: string = JSON.parse(data);
            accumulated += token;
            if (firstChunk) {
              firstChunk = false;
              setLoading(false);
              setMessages(prev => [...prev, { role: 'assistant', content: accumulated }]);
            } else {
              setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: 'assistant', content: accumulated };
                return copy;
              });
            }
          } catch { /* ignore parse errors */ }
        }
      }

      if (firstChunk) {
        setLoading(false);
        setMessages(prev => [...prev, { role: 'assistant', content: 'Нет ответа от ИИ.' }]);
      }
    } catch (e) {
      // Показываем ошибку только если ещё не получили ни одного токена
      setLoading(false);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last.content.length > 0) return prev;
        return [...prev, { role: 'assistant', content: 'Ошибка соединения с ИИ.' }];
      });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px';
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-6 z-50 flex flex-col ai-chat-panel rounded-2xl overflow-hidden"
          style={{ width: 400, height: 520 }}>

          {/* Header */}
          <div className="ai-chat-header flex items-center justify-between px-4 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M9 9a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1m6 0a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1z"/>
                </svg>
              </div>
              <span className="text-sm font-semibold text-slate-100">ИИ Ассистент</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium leading-none">qwen3</span>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button onClick={() => setMessages([])} title="Очистить"
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              )}
              <button onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2 ai-messages-area">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M9 9a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1m6 0a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-300 mb-1">Привет! Я ИИ-ассистент SARAP</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">Задай вопрос о системе — помогу разобраться с инцидентами, серверами, статистикой.</p>
                </div>
                <div className="flex flex-col gap-1.5 w-full mt-1">
                  {['Как добавить инцидент?', 'Что такое тревога PRTG?', 'Как смотреть статистику?'].map(q => (
                    <button key={q} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                      className="text-[11px] text-left px-3 py-1.5 rounded-lg border border-slate-600/40 text-slate-400 hover:text-slate-200 hover:border-blue-500/40 hover:bg-blue-500/5 transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-xl px-3 py-2 text-[12px] leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'ai-msg-assistant text-slate-200'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="ai-msg-assistant rounded-xl px-3 py-2.5">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }}/>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }}/>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }}/>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="ai-chat-footer px-3 py-2.5 shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Напишите сообщение..."
                rows={1}
                disabled={loading}
                className="flex-1 resize-none rounded-xl border border-slate-600/40 bg-slate-700/40 text-slate-100 placeholder-slate-500 text-[12px] px-3 py-2 focus:outline-none focus:border-blue-500/50 focus:bg-slate-700/60 transition-colors"
                style={{ minHeight: 36, maxHeight: 80 }}
              />
              <button onClick={sendMessage} disabled={!input.trim() || loading}
                className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-slate-600 mt-1.5 text-center">Enter — отправить · Shift+Enter — перенос строки</p>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button onClick={() => setOpen(v => !v)} data-tour="ai-chat"
        className="fixed bottom-6 right-6 z-50 w-13 h-13 rounded-2xl flex items-center justify-center ai-fab-btn transition-all duration-200 hover:scale-110 active:scale-95"
        title="ИИ Ассистент">
        <div className={`transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`}>
          {open
            ? <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/>
              </svg>
            : <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M9 9a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1m6 0a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1z"/>
              </svg>
          }
        </div>
      </button>

      <style jsx global>{`
        .ai-chat-panel {
          background: rgba(10, 16, 30, 0.97);
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: 0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.08);
          backdrop-filter: blur(24px);
        }
        .ai-chat-header {
          background: rgba(20, 30, 50, 0.9);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .ai-chat-footer {
          background: rgba(10, 16, 30, 0.95);
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .ai-messages-area { scrollbar-width: thin; scrollbar-color: rgba(100,116,139,0.3) transparent; }
        .ai-msg-assistant {
          background: rgba(30, 41, 60, 0.85);
          border: 1px solid rgba(255,255,255,0.05);
        }
        .ai-fab-btn {
          width: 52px; height: 52px;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          box-shadow: 0 8px 28px rgba(37,99,235,0.50);
        }
        .ai-fab-btn:hover {
          box-shadow: 0 12px 36px rgba(37,99,235,0.65);
        }
      `}</style>
    </>
  );
}
