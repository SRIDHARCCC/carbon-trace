import { useState, useRef, useEffect } from 'react';
import { functions } from '../firebase/config';
import { httpsCallable } from 'firebase/functions';
import { Send, Sparkles, X, Loader2, Bot } from 'lucide-react';
import type { FootprintDocument } from '../utils/carbonCalculators';
import { containsPromptInjection, sanitizeHTML } from '../utils/security';

interface ChatMessage {
  sender: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

interface EcoAgentPanelProps {
  activeFootprint: FootprintDocument | null;
  activeTab: string;
  isMobileDrawerOpen: boolean;
  onMobileDrawerClose: () => void;
}

export default function EcoAgentPanel({
  activeFootprint,
  activeTab,
  isMobileDrawerOpen,
  onMobileDrawerClose,
}: EcoAgentPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'agent',
      text: "Namaste! I am EcoAgent India. I analyze your carbon footprint metrics real-time and provide suggestions. Try filling out your logs or click one of the quick question tokens below!",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const quickTokens = [
    { label: "Why is my footprint high?", query: "Why is my total carbon footprint high compared to the Indian benchmark? What is driving it?" },
    { label: "What if I switch AC to 24°C?", query: "Calculate my exact emission and cost savings if I switch my AC baseline to 24°C this month." },
    { label: "Compare transport footprint", query: "How does my transport footprint compare to typical Indian urban commuting statistics?" },
    { label: "Rooftop solar benefits", query: "How much carbon emissions would I offset if I install a 2 kW rooftop solar system in my city?" }
  ];

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    // Check for prompt injection
    if (containsPromptInjection(textToSend)) {
      const warningMsg: ChatMessage = {
        sender: 'agent',
        text: "Security Check Failed: Your input contains potential prompt injection patterns. Please rephrase your query.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, warningMsg]);
      return;
    }

    const cleanText = sanitizeHTML(textToSend);

    // Add user message
    const userMsg: ChatMessage = {
      sender: 'user',
      text: cleanText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Call Firebase Cloud Function
      const chatFn = httpsCallable(functions, 'ecoAgentChat');
      const result = await chatFn({
        message: cleanText,
        activeFootprint,
        activeTab
      });

      const data = result.data as { response: string };
      
      const agentMsg: ChatMessage = {
        sender: 'agent',
        text: data.response || "Sorry, I couldn't process that query.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, agentMsg]);
    } catch (err) {
      console.error(err);
      
      // Fallback message
      const errorMsg: ChatMessage = {
        sender: 'agent',
        text: "I encountered a connection issue while contacting the Cloud Functions backend. Please ensure your project triggers are active, or try again later.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const renderChatContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      
      {/* Panel Header */}
      <div className="px-4 py-3 bg-zinc-50 dark:bg-[#0e0e12] border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-brand-600 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-1">
              EcoAgent AI Panel
            </h4>
            <p className="text-[10px] text-zinc-400 font-medium">Context: Active {activeTab} Metrics</p>
          </div>
        </div>

        {/* Close button for mobile bottom drawer */}
        <button 
          onClick={onMobileDrawerClose}
          className="md:hidden text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
        {messages.map((msg, index) => (
          <div 
            key={index}
            className={`flex gap-2.5 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
          >
            {msg.sender === 'agent' && (
              <div className="w-7 h-7 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 shrink-0 flex items-center justify-center border border-brand-100 dark:border-brand-900/30">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div className={`rounded-xl p-3 text-xs leading-relaxed ${
              msg.sender === 'user'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-medium'
                : 'bg-zinc-100 dark:bg-[#141419] text-zinc-800 dark:text-zinc-200 border border-zinc-200/40 dark:border-zinc-800/30'
            }`}>
              {/* Parse basic markdown bullet points for standard styling */}
              <div className="whitespace-pre-line">
                {msg.text}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5 max-w-[85%]">
            <div className="w-7 h-7 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 shrink-0 flex items-center justify-center border border-brand-100 dark:border-brand-900/30">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-zinc-100 dark:bg-[#141419] text-zinc-550 dark:text-zinc-400 rounded-xl p-3 text-xs flex items-center gap-1.5 border border-zinc-200/40 dark:border-zinc-800/30">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Agent is analyzing emission formulas...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Questions tokens */}
      <div className="p-3 bg-zinc-50/50 dark:bg-[#0c0c0f]/50 border-t border-zinc-150 dark:border-zinc-800/50">
        <p className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider mb-2">Suggested Action Tokens</p>
        <div className="flex flex-wrap gap-1.5">
          {quickTokens.map((token, i) => (
            <button
              key={i}
              type="button"
              disabled={loading}
              onClick={() => handleSendMessage(token.query)}
              className="text-[10px] font-medium bg-white hover:bg-zinc-100 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-750 rounded-full px-2.5 py-1 transition-colors disabled:opacity-50"
            >
              {token.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input bar */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0f] flex gap-2 items-center">
        <input
          type="text"
          placeholder="Ask EcoAgent anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(input)}
          disabled={loading}
          className="flex-1 bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 disabled:opacity-50"
        />
        <button
          onClick={() => handleSendMessage(input)}
          disabled={loading || !input.trim()}
          className="bg-brand-600 hover:bg-brand-700 text-white p-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Column Layout (Hidden on Mobile) */}
      <div className="hidden md:block h-full min-h-[500px]">
        {renderChatContent()}
      </div>

      {/* Mobile Drawer (Only visible on mobile when active) */}
      <div className={`fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-zinc-950/50 backdrop-blur-sm transition-opacity duration-300 ${
        isMobileDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}>
        <div className={`bg-white dark:bg-[#0c0c0f] rounded-t-2xl h-[80vh] flex flex-col transition-transform duration-300 transform ${
          isMobileDrawerOpen ? 'translate-y-0' : 'translate-y-full'
        }`}>
          {/* Drag Handle indicator */}
          <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto my-3 shrink-0" />
          
          <div className="flex-1 overflow-hidden p-2">
            {renderChatContent()}
          </div>
        </div>
      </div>
    </>
  );
}
