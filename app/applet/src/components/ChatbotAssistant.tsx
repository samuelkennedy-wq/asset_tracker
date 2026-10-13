import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, 
  Send, 
  X, 
  Sparkles, 
  Minimize2, 
  Maximize2, 
  Cpu, 
  MapPin, 
  FileText, 
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  ShieldCheck,
  ChevronRight,
  Database,
  ArrowRight,
  Loader2,
  Layers,
  Search,
  Hash,
  UserCheck,
  Terminal,
  Activity
} from 'lucide-react';
import { Asset, MovementTicket } from '../types';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  type?: 'stats' | 'asset' | 'ticket' | 'floor' | 'help' | 'error';
  rawQuery?: string;
  data?: any;
}

interface ChatbotAssistantProps {
  onNavigateTicket?: (ticketNo: string) => void;
  onNavigateSerial?: (serial: string) => void;
  isManagerOnly?: boolean;
}

export default function ChatbotAssistant({ onNavigateTicket, onNavigateSerial, isManagerOnly = false }: ChatbotAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: "👋 **Welcome, IT Manager.** I am your **[24]7.ai Neural Asset Intelligence Engine**.\n\nI provide real-time querying across the asset registry, custody logs, and ticket approvals.\n\nTry asking me:\n• *\"Where is serial S/N-78F8A2 located?\"*\n• *\"What is the status of ticket IT012346?\"*\n• *\"List all active CPUs deployed on floor 7\"*\n• *\"Show asset custody summary & pending approvals\"*",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'help'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized, messages]);

  const handleSend = async (queryText?: string) => {
    const q = (queryText || input).trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chatbot/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      });

      if (!res.ok) {
        throw new Error('API responded with code ' + res.status);
      }

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: 'bot-' + Date.now(),
        sender: 'bot',
        text: data.answer || "No response received.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: data.type,
        data: data,
        rawQuery: q
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: 'bot-err-' + Date.now(),
          sender: 'bot',
          text: `⚠️ **System Error:** Could not contact server: ${err.message || 'Unknown network issue'}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'error'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    "Where is serial S/N-78F8A2 located?",
    "Status of ticket IT012346",
    "List assets on floor 7",
    "Show asset custody summary"
  ];

  // High-precision formatting parser with executive AI engineer bold hierarchy
  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      const isBullet = line.trim().startsWith('•');
      const parts = [];
      let temp = line;
      const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
      let match;
      let lastIdx = 0;

      while ((match = regex.exec(temp)) !== null) {
        if (match.index > lastIdx) {
          parts.push(temp.substring(lastIdx, match.index));
        }

        const token = match[0];
        if (token.startsWith('**') && token.endsWith('**')) {
          parts.push(
            <strong key={match.index} className="font-extrabold text-slate-950 tracking-tight text-[12.5px] bg-indigo-50/70 px-1 py-0.5 rounded border border-indigo-100">
              {token.slice(2, -2)}
            </strong>
          );
        } else if (token.startsWith('`') && token.endsWith('`')) {
          parts.push(
            <code 
              key={match.index} 
              className="bg-slate-900 text-amber-300 font-mono text-[11px] px-1.5 py-0.5 rounded-md border border-slate-800 font-bold tracking-wider shadow-2xs"
            >
              {token.slice(1, -1)}
            </code>
          );
        } else if (token.startsWith('*') && token.endsWith('*')) {
          parts.push(
            <em key={match.index} className="italic font-semibold text-indigo-950">
              {token.slice(1, -1)}
            </em>
          );
        }

        lastIdx = regex.lastIndex;
      }

      if (lastIdx < temp.length) {
        parts.push(temp.substring(lastIdx));
      }

      return (
        <div 
          key={idx} 
          className={`${isBullet ? 'pl-2 py-0.5 text-slate-900 font-medium flex items-start' : 'my-1 text-slate-900 font-medium'} ${!line.trim() ? 'h-2' : ''}`}
        >
          {parts}
        </div>
      );
    });
  };

  return (
    <>
      {/* Floating Launcher Button - Styled like a High-Tech AI Engineering HUD */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0.85, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 text-white pl-4 pr-5 py-3 rounded-full shadow-2xl shadow-indigo-950/60 border border-indigo-500/40 flex items-center gap-3 cursor-pointer group transition-all"
          title="Open AI Engineering Assistant"
        >
          <div className="relative flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-400/30 group-hover:bg-indigo-500/40 transition-all">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-slate-950 animate-pulse" />
          </div>

          <div className="text-left font-sans">
            <div className="text-[12px] font-black tracking-tight text-white flex items-center gap-1.5 uppercase font-mono">
              <span>Neural AI Copilot</span>
              <span className="text-[9px] font-mono font-black bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-400/30">
                ACTIVE
              </span>
            </div>
            <div className="text-[10px] text-slate-300 font-bold tracking-wide">
              Real-Time Custody Intelligence
            </div>
          </div>
        </motion.button>
      )}

      {/* Main Intelligent Chatbot Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? 'auto' : '580px'
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-50 w-[94vw] sm:w-[480px] bg-white rounded-3xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden font-sans ring-1 ring-slate-900/10"
            style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
          >
            {/* Professional AI Engineer Header Bar */}
            <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-4 py-3.5 flex items-center justify-between text-white shrink-0 border-b border-indigo-900/50">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 border border-white/20">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-xs tracking-tight text-white uppercase font-mono">
                      [24]7.ai Asset Copilot
                    </h3>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LLM ONLINE
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 font-bold tracking-tight mt-0.5">
                    Real-time Hardware Location, Switch Ports & Sign-off Audits
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  title={isMinimized ? "Expand Window" : "Minimize Window"}
                >
                  {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  title="Close Assistant"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            {!isMinimized && (
              <>
                {/* Message Log */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs bg-slate-50/70 border-b border-slate-200">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[92%] rounded-2xl p-3.5 leading-relaxed shadow-sm transition-all ${
                          m.sender === 'user'
                            ? 'bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white rounded-tr-none font-bold text-[12px] tracking-tight shadow-md shadow-indigo-600/10'
                            : 'bg-white text-slate-900 border border-slate-300 rounded-tl-none font-medium text-[12px] shadow-sm'
                        }`}
                      >
                        {m.sender === 'bot' ? (
                          <div className="space-y-2">
                            {renderFormattedText(m.text)}

                            {/* Rich Asset Card if matched */}
                            {m.data?.asset && (
                              <div className="mt-3 pt-3 border-t border-slate-200 bg-slate-50/90 rounded-xl p-3 flex items-center justify-between border">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-100 border border-indigo-200 text-indigo-800 flex items-center justify-center shrink-0">
                                    <Cpu className="w-4 h-4 text-indigo-700" />
                                  </div>
                                  <div>
                                    <div className="font-extrabold text-slate-950 font-mono text-xs">
                                      {m.data.asset.serial_number}
                                    </div>
                                    <div className="text-[10px] text-slate-600 font-bold">
                                      {m.data.asset.model} • Tag: {m.data.asset.barcode}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] font-extrabold font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                                    {m.data.asset.current_location}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Rich Ticket Card if matched */}
                            {m.data?.ticket && (
                              <div className="mt-3 pt-3 border-t border-slate-200 bg-slate-50/90 rounded-xl p-3 flex items-center justify-between border">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 text-blue-800 flex items-center justify-center shrink-0">
                                    <FileText className="w-4 h-4 text-blue-700" />
                                  </div>
                                  <div>
                                    <div className="font-extrabold text-slate-950 font-mono text-xs">
                                      Ticket: {m.data.ticket.ticket_no || '#' + m.data.ticket.id}
                                    </div>
                                    <div className="text-[10px] text-slate-600 font-bold">
                                      Dest: {m.data.ticket.destination_floor} • Port: {m.data.ticket.port_number || 'N/A'}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                                    m.data.ticket.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                                    m.data.ticket.status === 'PENDING' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                                    'bg-rose-100 text-rose-900 border-rose-300'
                                  }`}>
                                    {m.data.ticket.status}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>{m.text}</div>
                        )}
                      </div>

                      {/* Timestamp & Sender Badge */}
                      <span className="text-[9.5px] font-bold text-slate-600 px-1 mt-1 font-mono uppercase tracking-wider">
                        {m.sender === 'bot' ? 'CO-PILOT AI' : 'MANAGER'} • {m.timestamp}
                      </span>
                    </div>
                  ))}

                  {/* Typing / Reasoning Indicator */}
                  {isLoading && (
                    <div className="flex items-start gap-2 pt-1">
                      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3 shadow-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                        <span className="text-[11px] font-black text-indigo-950 font-mono tracking-tight">
                          ENGINEER REASONING ACROSS INVENTORY REGISTRY...
                        </span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Suggestion Chips */}
                <div className="p-2.5 bg-slate-100/90 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="text-[10px] font-extrabold uppercase text-slate-700 tracking-wider shrink-0 mr-1 flex items-center gap-1 font-mono">
                    <Terminal className="w-3 h-3 text-indigo-700" />
                    Queries:
                  </span>
                  {quickPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(p)}
                      disabled={isLoading}
                      className="shrink-0 text-[11px] bg-white hover:bg-indigo-600 hover:text-white text-slate-900 px-3 py-1 rounded-lg border border-slate-300 transition-all font-bold cursor-pointer shadow-2xs hover:shadow-sm"
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* Input Bar */}
                <div className="p-3 bg-white shrink-0 flex items-center gap-2 border-t border-slate-100">
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Ask about a serial (e.g. S/N-78F8A2), ticket, or floor..."
                      disabled={isLoading}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3.5 pr-8 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 focus:bg-white text-slate-950 placeholder-slate-500 transition-all font-bold tracking-tight"
                    />
                    <Search className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
                  </div>

                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isLoading}
                    className="bg-indigo-700 hover:bg-indigo-800 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-700/20 flex items-center justify-center cursor-pointer font-bold shrink-0"
                    title="Send Query"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
