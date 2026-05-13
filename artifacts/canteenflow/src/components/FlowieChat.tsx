import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Menu as MenuIcon, MessageSquare, Sparkles } from "lucide-react";
import { useListMenuItems, useGetCrowdPrediction, useGetBestOrderTime } from "@workspace/api-client-react";

type Mode = "chat" | "menu";

interface Message {
  id: number;
  from: "user" | "flowie";
  text: string;
}

const QUICK_ACTIONS = [
  { label: "What's popular?", intent: "recommend" },
  { label: "How busy is it?", intent: "crowd" },
  { label: "Best time to order?", intent: "besttime" },
  { label: "Veg options?", intent: "veg" },
];

function matchIntent(text: string): string {
  const t = text.toLowerCase();
  if (/recommend|suggest|popular|best dish|what should|today's special/.test(t)) return "recommend";
  if (/crowd|busy|rush|queue|wait time|people/.test(t)) return "crowd";
  if (/best time|when|order time|avoid rush/.test(t)) return "besttime";
  if (/veg|vegetarian/.test(t)) return "veg";
  if (/non.?veg|chicken|meat|egg/.test(t)) return "nonveg";
  if (/price|cheap|cost|affordable|budget/.test(t)) return "price";
  if (/seat|table|reserve|reservation/.test(t)) return "seat";
  if (/order|status|track/.test(t)) return "order";
  if (/help|hi|hello|hey/.test(t)) return "greet";
  return "unknown";
}

function getMenuSummary(items: any[]): string {
  if (!items?.length) return "the full menu";
  const top3 = items.slice(0, 3).map((i: any) => i.name).join(", ");
  return top3;
}

function FlowieResponse({
  intent,
  menuItems,
  crowdData,
  bestTime,
}: {
  intent: string;
  menuItems: any[];
  crowdData: any;
  bestTime: any;
}): string {
  switch (intent) {
    case "recommend": {
      const names = menuItems?.slice(0, 3).map((i: any) => i.name).join(", ");
      return `Today's top picks are: ${names || "Biryani, Dosa, Dal Makhani"}. They're freshly made and crowd-favourite! 🍽️`;
    }
    case "crowd": {
      const level = crowdData?.currentLevel || "medium";
      const levelText = { low: "very light", medium: "moderate", high: "busy", very_high: "very busy" }[level as string] || level;
      return `Right now the canteen is ${levelText}. ${crowdData?.recommendation || "Plan accordingly!"} 📊`;
    }
    case "besttime": {
      const wait = bestTime?.currentWaitMinutes;
      const best = bestTime?.bestTimeMinutes;
      if (wait && best) {
        return `Current wait is ~${wait} min. Best time to order today is in about ${best} min when the rush clears. ${bestTime.suggestion}`;
      }
      return "The best time to order is usually 11 AM–11:30 AM before the lunch rush hits. ⏰";
    }
    case "veg": {
      const vegs = menuItems?.filter((i: any) => i.isVeg).slice(0, 3).map((i: any) => i.name).join(", ");
      return `Veg options include: ${vegs || "Dal Makhani, Paneer Butter Masala, Dosa"}. All freshly prepared! 🌿`;
    }
    case "nonveg": {
      const nonvegs = menuItems?.filter((i: any) => !i.isVeg).slice(0, 3).map((i: any) => i.name).join(", ");
      return `Non-veg options: ${nonvegs || "Chicken Biryani, Chicken Burger"}. Chef recommends the Biryani today! 🍗`;
    }
    case "price": {
      const cheap = menuItems?.sort((a: any, b: any) => a.price - b.price).slice(0, 3).map((i: any) => `${i.name} ₹${i.price}`).join(", ");
      return `Budget-friendly picks: ${cheap || "check the menu for today's prices"}. Great value! 💰`;
    }
    case "seat": {
      return "You can reserve seats in the Seat Map section. Click the 2D or 3D view and reserve for your group! 🪑";
    }
    case "order": {
      return "To track your order, go to the Orders page from the top nav. Live updates are shown there! 📦";
    }
    case "greet": {
      return "Hey! I'm Flowie 🤖, your smart canteen assistant. Ask me about food recommendations, crowd levels, best times, or anything about the canteen!";
    }
    default:
      return `Hmm, I'm not sure about that. Try asking about recommendations, crowd levels, or the menu! 🤔`;
  }
}

export function FlowieChat() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("chat");
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, from: "flowie", text: "Hi! I'm Flowie 🤖 — your AI canteen buddy. Ask me anything about food, crowd, or timing!" }
  ]);
  const [input, setInput] = useState("");
  const [menuSearch, setMenuSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  let nextId = useRef(1);

  const { data: menuItems = [] } = useListMenuItems({});
  const { data: crowdData } = useGetCrowdPrediction({ query: { enabled: true } } as any);
  const { data: bestTime } = useGetBestOrderTime({ query: { enabled: true } } as any);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: Message = { id: nextId.current++, from: "user", text: trimmed };
    const intent = matchIntent(trimmed);
    const reply = FlowieResponse({ intent, menuItems: menuItems as any[], crowdData, bestTime });
    const flowieMsg: Message = { id: nextId.current++, from: "flowie", text: reply };
    setMessages((prev) => [...prev, userMsg, flowieMsg]);
    setInput("");
  }

  const filteredMenu = (menuItems as any[]).filter((i: any) =>
    i.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
    (i.description || "").toLowerCase().includes(menuSearch.toLowerCase())
  );

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-24 left-4 z-50 w-[340px] max-h-[520px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="flex items-center gap-2 p-3 border-b bg-gradient-to-r from-purple-600 to-blue-600">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-white text-sm">Flowie AI</div>
                  <div className="text-white/60 text-xs">Your canteen assistant</div>
                </div>
                <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
                  <button
                    onClick={() => setMode("chat")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${mode === "chat" ? "bg-white text-purple-700" : "text-white/70 hover:text-white"}`}
                  >
                    <MessageSquare className="w-3 h-3" /> Chat
                  </button>
                  <button
                    onClick={() => setMode("menu")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${mode === "menu" ? "bg-white text-purple-700" : "text-white/70 hover:text-white"}`}
                  >
                    <MenuIcon className="w-3 h-3" /> Menu
                  </button>
                </div>
                <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {mode === "chat" ? (
                <>
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"} gap-2`}>
                        {msg.from === "flowie" && (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex-shrink-0 flex items-center justify-center mt-0.5">
                            <Bot className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${msg.from === "user" ? "bg-purple-600 text-white rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="px-3 pb-2 flex gap-2 flex-wrap">
                    {QUICK_ACTIONS.map((a) => (
                      <button
                        key={a.intent}
                        onClick={() => sendMessage(a.label)}
                        className="text-xs px-2.5 py-1 rounded-full border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors bg-white"
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>

                  <div className="p-3 border-t flex gap-2">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                      placeholder="Ask Flowie anything..."
                      className="flex-1 text-sm bg-muted rounded-xl px-3 py-2 outline-none border border-transparent focus:border-purple-300"
                    />
                    <button
                      onClick={() => sendMessage(input)}
                      className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white hover:opacity-90 transition-opacity"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="p-3 border-b">
                    <input
                      value={menuSearch}
                      onChange={(e) => setMenuSearch(e.target.value)}
                      placeholder="Search menu..."
                      className="w-full text-sm bg-muted rounded-xl px-3 py-2 outline-none border border-transparent focus:border-purple-300"
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                    {filteredMenu.slice(0, 20).map((item: any) => (
                      <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.isVeg ? "bg-green-500" : "bg-red-500"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.category} · {item.prepTimeMinutes}m</div>
                        </div>
                        <div className="text-primary font-bold text-sm">₹{item.price}</div>
                      </div>
                    ))}
                    {filteredMenu.length === 0 && (
                      <div className="text-center text-muted-foreground text-sm py-8">No items found</div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-5 left-5 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-2xl flex items-center justify-center"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div key="bot" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} className="relative">
              <Bot className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
