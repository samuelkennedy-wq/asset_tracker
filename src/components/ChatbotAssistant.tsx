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
  UserCheck
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
      text: "👋 **Welcome, IT Manager.** I am your **[24]7.ai Asset Intelligence Assistant**.\n\nI provide real-time querying across the asset registry, custody logs, and ticket approvals.\n\nTry asking me:\n• *\"Where is serial S/N-78F8A2 located?\"*\n• *\"What is the status of ticket IT012346?\"*\n• *\"List all active CPUs deployed on floor 7\"*\n• *\"Show asset custody summary & pending approvals\"*",
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

  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      const isBullet = line.trim().startsWith('•');
      const parts = [];
      let temp = line;
      const regex = /(\*\*.*?\*\*|`.*?`)/g;
      let match;
      let lastIdx = 0;

      while ((match = regex.exec(temp)) !== null) {
        if (match.index > lastIdx) {
          parts.push(temp.substring(lastIdx, match.index));
        }
        const token = match[0];
        if (token.startsWith('**') && token.endsWith('**')) {
          parts.push(
            <strong key={match.index} className="font-semibold text-slate-900 tracking-tight">
              {token.slice(2, -2)}
            </strong>
          );
        } else if (token.startsWith('`') && token.endsWith('`')) {
          parts.push(
            <code 
              key={match.index} 
              className="bg-indigo-50/80 text-indigo-700 font-mono text-[11px] px-1.5 py-0.5 rounded-md border border-indigo-200/60 font-semibold"
            >
              {token.slice(1, -1)}
            </code>
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
          className={`${isBullet ? 'pl-2 py-0.5 text-slate-700 flex items-start' : 'my-0.5 text-slate-800'} ${!line.trim() ? 'h-2' : ''}`}
        >
          {parts}
        </div>
      );
    });
  };

  return (
    <>
      {/* Floating Launcher Button - Exclusive to IT Manager module */}
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
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white pl-4 pr-5 py-3 rounded-full shadow-2xl shadow-indigo-600/30 border border-white/20 flex items-center gap-3 cursor-pointer group transition-all"
          title="Open Manager AI Assistant"
        >
          <div className="relative flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20 group-hover:bg-white/20 transition-all">
              <Bot className="w-4.5 h-4.5 text-indigo-200 group-hover:text-white transition-colors" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-indigo-900 animate-pulse" />
          </div>
          <div className="text-left font-sans">
            <div className="text-[12px] font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>Manager AI Assistant</span>
              <span className="text-[9px] font-mono bg-blue-500/30 text-blue-200 px-1.5 py-0.2 rounded border border-blue-400/30">
                PRO
              </span>
            </div>
            <div className="text-[10px] text-indigo-200 font-medium tracking-wide">
              Serial & Floor Tracker
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
              height: isMinimized ? 'auto' : '560px'
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-50 w-[94vw] sm:w-[460px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden font-sans"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            {/* Professional Executive Header */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-4 py-3.5 flex items-center justify-between text-white shrink-0 border-b border-indigo-900/40">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 border border-white/20">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xs tracking-tight text-white">
                      [24]7.ai Asset Intelligence
                    </h3>
                    <span className="bg-indigo-500/25 text-indigo-200 border border-indigo-400/30 text-[9px] font-mono px-1.5 py-0.2 rounded-full uppercase tracking-wider font-semibold">
                      IT Manager
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 font-sans mt-0.5">
                    Live Floor Location, Switch Ports & Chain of Custody
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title={isMinimized ? "Expand Window" : "Minimize Window"}
                >
                  {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
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
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs bg-slate-50/70 border-b border-slate-100">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[90%] rounded-2xl p-3.5 leading-relaxed shadow-sm transition-all ${
                          m.sender === 'user'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none font-medium'
                            : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-none font-sans'
                        }`}
                      >
                        {m.sender === 'bot' ? (
                          <div className="space-y-1.5">
                            {renderFormattedText(m.text)}

                            {/* Rich Asset Card if matched */}
                            {m.data?.asset && (
                              <div className="mt-2.5 pt-2.5 border-t border-slate-100 bg-slate-50 rounded-xl p-2.5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                                    <Cpu className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="text-[11px] font-bold text-slate-900">
                                      {m.data.asset.serial_number}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono">
                                      {m.data.asset.current_location} • Port {m.data.asset.last_port_number || 'N/A'}
                                    </div>
                                  </div>
                                </div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                  m.data.asset.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' :
                                  m.data.asset.status === 'DEPLOYED' ? 'bg-blue-100 text-blue-800' :
                                  'bg-amber-100 text-amber-800'
                                }`}>
                                  {m.data.asset.status}
                                </span>
                              </div>
                            )}

                            {/* Rich Ticket Card if matched */}
                            {m.data?.ticket && (
                              <div className="mt-2.5 pt-2.5 border-t border-slate-100 bg-slate-50 rounded-xl p-2.5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="text-[11px] font-bold text-slate-900">
                                      {m.data.ticket.ticket_no}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      {m.data.ticket.origin_location} ➔ {m.data.ticket.destination_floor}
                                    </div>
                                  </div>
                                </div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                  m.data.ticket.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                                  m.data.ticket.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                                  'bg-rose-100 text-rose-800'
                                }`}>
                                  {m.data.ticket.status}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>{m.text}</div>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1 px-1 font-mono">
                        {m.timestamp}
                      </span>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex items-center gap-2.5 text-slate-600 text-xs bg-white border border-slate-200/90 rounded-2xl p-3 w-fit shadow-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      <span className="font-medium text-[11px]">Searching active registry & floor allocation...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Executive Quick Prompts */}
                <div className="px-3.5 py-2.5 bg-white flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 border-b border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    Quick:
                  </span>
                  {quickPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(p)}
                      disabled={isLoading}
                      className="shrink-0 text-[11px] bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200/80 transition-all font-medium cursor-pointer shadow-xs"
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* Input Bar */}
                <div className="p-3 bg-white shrink-0 flex items-center gap-2">
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white text-slate-900 placeholder-slate-400 transition-all font-sans"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                  </div>
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isLoading}
                    className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer"
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
