'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Dictionary } from '@/i18n/getDictionary';
import type { Locale } from '@/i18n/config';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatApp({ dict, lang }: { dict: Dictionary; lang: Locale }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const content = text || input.trim();
    if (!content || isLoading) return;

    setShowWelcome(false);
    setInput('');
    const userMsg: Message = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, lang }),
      });

      if (!res.ok) throw new Error('Failed to send message');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let displayedLen = 0;
      let buffer = '';
      let streamDone = false;

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      // Typing effect: render chars at natural speed
      const CHAR_DELAY = 80; // ms per character, ~12 chars/sec like normal typing
      const typeInterval = setInterval(() => {
        if (displayedLen < fullContent.length) {
          displayedLen += 1;
          const content = fullContent.slice(0, displayedLen);
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content };
            return updated;
          });
        } else if (streamDone) {
          clearInterval(typeInterval);
        }
      }, CHAR_DELAY);

      // Read stream into fullContent buffer
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
            }
          } catch {
            // skip parse errors
          }
        }
      }

      streamDone = true;
      // Wait for typing to finish
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (displayedLen >= fullContent.length) {
            clearInterval(check);
            clearInterval(typeInterval);
            resolve();
          }
        }, 50);
      });
    } catch {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: lang === 'zh' ? '抱歉，出了点问题，请稍后再试。' : 'Sorry, something went wrong. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const otherLang = lang === 'zh' ? 'en' : 'zh';

  return (
    <div className="flex flex-col h-dvh max-w-3xl mx-auto w-full">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-pink-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <Link href={`/${lang}`} className="flex items-center gap-3" onClick={() => { setMessages([]); setShowWelcome(true); }}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-lg">
            💕
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">{dict.nav.title}</h1>
            <p className="text-xs text-gray-500">{dict.nav.subtitle}</p>
          </div>
        </Link>
        <Link
          href={`/${otherLang}`}
          className="px-3 py-1.5 text-sm rounded-full border border-pink-200 text-pink-600 hover:bg-pink-50 transition-colors"
        >
          {dict.lang.switch}
        </Link>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {showWelcome && (
          <div className="space-y-6 animate-fadeIn">
            {/* Welcome */}
            <div className="text-center py-6">
              <div className="text-5xl mb-4">💝</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">{dict.chat.welcome}</h2>
              <p className="text-gray-500 text-sm max-w-md mx-auto">{dict.chat.welcomeDesc}</p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '🔍', title: dict.features.analyze, desc: dict.features.analyzeDesc },
                { icon: '💬', title: dict.features.chat, desc: dict.features.chatDesc },
                { icon: '💔', title: dict.features.recover, desc: dict.features.recoverDesc },
                { icon: '🌹', title: dict.features.date, desc: dict.features.dateDesc },
              ].map((f) => (
                <div
                  key={f.title}
                  className="p-3 rounded-xl bg-white border border-pink-100 shadow-sm"
                >
                  <div className="text-2xl mb-1">{f.icon}</div>
                  <div className="font-semibold text-sm text-gray-800">{f.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{f.desc}</div>
                </div>
              ))}
            </div>

            {/* Quick Start */}
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">{dict.quickStart.title}</h3>
              <div className="flex flex-col gap-2">
                {[dict.quickStart.q1, dict.quickStart.q2, dict.quickStart.q3, dict.quickStart.q4].map(
                  (q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-left px-4 py-2.5 rounded-xl bg-white border border-pink-100 text-sm text-gray-700 hover:border-pink-300 hover:bg-pink-50 transition-all shadow-sm"
                    >
                      {q}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-pink-500 to-purple-500 text-white rounded-br-md whitespace-pre-wrap'
                  : 'bg-white border border-pink-100 text-gray-800 rounded-bl-md shadow-sm prose prose-sm prose-pink max-w-none'
              }`}
            >
              {msg.role === 'user' ? (
                msg.content
              ) : (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              )}
              {msg.role === 'assistant' && isLoading && i === messages.length - 1 && (
                <span className="inline-block w-1.5 h-4 bg-pink-400 ml-0.5 animate-pulse rounded" />
              )}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="bg-white border border-pink-100 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
                {dict.chat.thinking}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Disclaimer */}
      <div className="text-center text-xs text-gray-400 px-4 py-1">{dict.chat.disclaimer}</div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-pink-100 bg-white/80 backdrop-blur-sm">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={dict.chat.placeholder}
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-pink-200 px-4 py-3 text-sm focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 placeholder:text-gray-400 max-h-32"
            style={{ minHeight: '44px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 128) + 'px';
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="h-11 px-5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
          >
            {dict.chat.send}
          </button>
        </div>
      </div>
    </div>
  );
}
