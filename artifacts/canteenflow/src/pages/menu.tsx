import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@clerk/react";
import { useListMenuItems, useListMenuCategories, useGetAiRecommendations, useGetCrowdPrediction } from "@workspace/api-client-react";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { Link } from "wouter";
import { ShoppingCart, Search, Clock, Users, ChevronRight, Bot, UserRound, Sparkles, Activity, Cpu, Radar, ScanSearch, Ticket, ArrowLeft, ChevronDown, ChevronUp, Zap, Waves, Flame, TimerReset, PanelTopClose, PanelTopOpen } from "lucide-react";
import { UpiPaymentModal } from "@/components/UpiPaymentModal";
import { useGuestMode } from "@/hooks/useGuestMode";
import { useGamification } from "@/hooks/useGamification";
import { LevelBadge } from "@/components/GamificationOverlay";

type PaymentMethod = "upi" | "cod";
type AgentKey = "crowd" | "seat" | "kitchen" | "pickup" | "break";

type AgentState = {
  key: AgentKey;
  title: string;
  status: string;
  subtitle: string;
  color: string;
  icon: string;
  stat: string;
};

const AGENTS: AgentState[] = [
  { key: "crowd", title: "Crowd Prediction Agent", status: "ACTIVE", subtitle: "Rush expected in 12 mins", color: "text-emerald-600", icon: "⚡", stat: "78% occupancy" },
  { key: "seat", title: "Seat Allocation Agent", status: "OPTIMIZING", subtitle: "Table B2 allocated", color: "text-blue-600", icon: "👥", stat: "32 seats free" },
  { key: "kitchen", title: "Kitchen Optimization Agent", status: "PROCESSING", subtitle: "Queue optimized", color: "text-amber-600", icon: "👨‍🍳", stat: "14 min avg prep" },
  { key: "pickup", title: "Pickup Coordination Agent", status: "PREDICTING", subtitle: "Best pickup time: 3 mins", color: "text-violet-600", icon: "🚚", stat: "92% confidence" },
  { key: "break", title: "Break-Time Optimization Agent", status: "ANALYZING", subtitle: "Efficiency: High", color: "text-pink-600", icon: "⏱️", stat: "87% efficiency" },
];

const LOGS: Record<AgentKey, string[]> = {
  crowd: ["Analyzing footfall...", "Detecting lunch rush in south canteen...", "Rush probability rising...", "Rush expected in 12 mins (89% confidence)"],
  seat: ["Scanning available tables...", "Grouping nearby clusters...", "Optimizing walking distance...", "Allocated Table B2 for group of 4"],
  kitchen: ["Fetching active orders...", "Grouping similar dishes...", "Optimizing cooking sequence...", "Estimated wait reduced by 18%"],
  pickup: ["Monitoring pickup counter traffic...", "Predicting counter congestion...", "Best pickup time in 3 mins (92% confidence)", "Notifying user for optimal pickup..."],
  break: ["Analyzing student break patterns...", "Checking class schedules...", "Finding optimal dining window...", "Break efficiency optimized to High"],
};

const MENU_ITEM_IMAGE_FALLBACKS: Record<string, string> = {
  "Margherita Pizza": "https://www.vegrecipesofindia.com/wp-content/uploads/2019/10/margherita-pizza-recipe.jpg",
  "Chicken Burger": "https://www.indianhealthyrecipes.com/wp-content/uploads/2019/05/chicken-burger-recipe.jpg",
  "Veg Burger": "https://www.vegrecipesofindia.com/wp-content/uploads/2015/08/veg-burger.jpg",
  "Cheese Burger": "https://www.cookwithmanali.com/wp-content/uploads/2021/04/Cheese-Burger.jpg",
  "Classic Wada Pav": "https://www.vegrecipesofindia.com/wp-content/uploads/2017/11/wada-pav-recipe.jpg",
  "Cheese Burst Wada Pav": "https://b.zmtcdn.com/data/dish_photos/4fb/30f30c6aeb85ee7be0359f1e1fb3a4fb.jpg",
  "Caesar Salad": "https://www.cookwithmanali.com/wp-content/uploads/2018/09/caesar-salad-recipe.jpg",
  "Greek Salad": "https://www.cookingclassy.com/wp-content/uploads/2019/05/greek-salad-4.jpg",
  "French Fries": "https://www.whiskaffair.com/wp-content/uploads/2018/05/French-Fries-2-3.jpg",
  "Masala Fries": "https://www.indianhealthyrecipes.com/wp-content/uploads/2014/12/masala-fries-recipe.jpg",
  "Chocolate Milkshake": "https://www.vegrecipesofindia.com/wp-content/uploads/2019/03/chocolate-milkshake-recipe.jpg",
  "Vanilla Milkshake": "https://www.vegrecipesofindia.com/wp-content/uploads/2014/06/vanilla-milkshake-recipe.jpg",
};

const MENU_KEYWORD_IMAGE_FALLBACKS: Array<[RegExp, string]> = [
  [/\bclassic wada pav\b|\bwada pav\b|\bpav\b/i, "https://www.vegrecipesofindia.com/wp-content/uploads/2017/11/wada-pav-recipe.jpg"],
  [/\bcheese burst\b/i, "https://b.zmtcdn.com/data/dish_photos/4fb/30f30c6aeb85ee7be0359f1e1fb3a4fb.jpg"],
  [/\bveg(?:etarian)? burger\b/i, "https://www.vegrecipesofindia.com/wp-content/uploads/2015/08/veg-burger.jpg"],
  [/\bchicken burger\b/i, "https://www.indianhealthyrecipes.com/wp-content/uploads/2019/05/chicken-burger-recipe.jpg"],
  [/\bburger\b/i, "https://www.cookwithmanali.com/wp-content/uploads/2021/04/Cheese-Burger.jpg"],
  [/\bpizza\b/i, "https://www.vegrecipesofindia.com/wp-content/uploads/2019/10/margherita-pizza-recipe.jpg"],
  [/\bsalad\b/i, "https://www.cookwithmanali.com/wp-content/uploads/2018/09/caesar-salad-recipe.jpg"],
  [/\bfries\b|\bfrench fries\b/i, "https://www.whiskaffair.com/wp-content/uploads/2018/05/French-Fries-2-3.jpg"],
  [/\bmilkshake\b|\bshake\b/i, "https://www.vegrecipesofindia.com/wp-content/uploads/2019/03/chocolate-milkshake-recipe.jpg"],
  [/\bdosa\b|\bidli\b|\butt?apam\b|\bvada\b/i, "https://www.vegrecipesofindia.com/wp-content/uploads/2017/11/wada-pav-recipe.jpg"],
  [/\bbiryani\b|\brice\b/i, "https://www.vegrecipesofindia.com/wp-content/uploads/2020/06/veg-curry-1.jpg"],
  [/\bwrap\b|\broll\b/i, "https://www.cookingclassy.com/wp-content/uploads/2015/11/chicken-kathi-roll-1.jpg"],
  [/\bpasta\b/i, "https://www.cookingclassy.com/wp-content/uploads/2019/10/baked-pasta-4-1.jpg"],
  [/\bsandwich\b/i, "https://www.vegrecipesofindia.com/wp-content/uploads/2017/08/veg-sandwich-recipe.jpg"],
  [/\bjuice\b|\bmocktail\b|\bshake\b|\bcoffee\b|\btea\b/i, "https://www.vegrecipesofindia.com/wp-content/uploads/2014/06/vanilla-milkshake-recipe.jpg"],
];

const MENU_CATEGORY_IMAGE_FALLBACKS: Record<string, string> = {
  Pizza: "https://www.vegrecipesofindia.com/wp-content/uploads/2019/10/margherita-pizza-recipe.jpg",
  Burgers: "https://www.cookwithmanali.com/wp-content/uploads/2021/04/Cheese-Burger.jpg",
  Salads: "https://www.cookwithmanali.com/wp-content/uploads/2018/09/caesar-salad-recipe.jpg",
  Sides: "https://www.whiskaffair.com/wp-content/uploads/2018/05/French-Fries-2-3.jpg",
  Beverages: "https://www.vegrecipesofindia.com/wp-content/uploads/2019/03/chocolate-milkshake-recipe.jpg",
  Dosa: "https://www.vegrecipesofindia.com/wp-content/uploads/2017/11/wada-pav-recipe.jpg",
  Snacks: "https://www.vegrecipesofindia.com/wp-content/uploads/2021/04/pav-bhaji-recipe-1.jpg",
  "Vada Pav": "https://www.vegrecipesofindia.com/wp-content/uploads/2017/11/wada-pav-recipe.jpg",
  Roll: "https://www.cookingclassy.com/wp-content/uploads/2015/11/chicken-kathi-roll-1.jpg",
  Sandwich: "https://www.vegrecipesofindia.com/wp-content/uploads/2017/08/veg-sandwich-recipe.jpg",
  "Milk Shakes": "https://www.vegrecipesofindia.com/wp-content/uploads/2019/03/chocolate-milkshake-recipe.jpg",
  "Gobi Items": "https://www.vegrecipesofindia.com/wp-content/uploads/2013/12/gobi-manchurian-recipe-1.jpg",
  "Babycorn Items": "https://www.vegrecipesofindia.com/wp-content/uploads/2020/06/baby-corn-manchurian-1.jpg",
  "Mushroom Items": "https://www.vegrecipesofindia.com/wp-content/uploads/2020/06/mushroom-manchurian-1.jpg",
  "Paneer Items": "https://www.vegrecipesofindia.com/wp-content/uploads/2020/06/paneer-manchurian-1.jpg",
  "Curry Items": "https://www.vegrecipesofindia.com/wp-content/uploads/2020/06/veg-curry-1.jpg",
  "Egg Items": "https://www.indianhealthyrecipes.com/wp-content/uploads/2021/10/masala-omelette-recipe.jpg",
  "Tiffin Items": "https://www.vegrecipesofindia.com/wp-content/uploads/2021/06/idli-vada-combo.jpg",
};

const GENERIC_FOOD_IMAGE = "https://www.vegrecipesofindia.com/wp-content/uploads/2022/06/veg-thali-recipe.jpg";
const GENERIC_IGNORED_IMAGE_URLS = new Set<string>([
  ...Object.values(MENU_ITEM_IMAGE_FALLBACKS),
  ...Object.values(MENU_CATEGORY_IMAGE_FALLBACKS),
  GENERIC_FOOD_IMAGE,
]);

function getMenuItemImageFallback(item: any) {
  const lowerName = String(item?.name ?? "").toLowerCase();
  const exact = MENU_ITEM_IMAGE_FALLBACKS[item.name];
  if (exact) return exact;

  for (const [pattern, url] of MENU_KEYWORD_IMAGE_FALLBACKS) {
    if (pattern.test(lowerName)) {
      return url;
    }
  }

  return MENU_CATEGORY_IMAGE_FALLBACKS[item.category] ?? GENERIC_FOOD_IMAGE;
}

function shouldUseItemImage(item: any) {
  return Boolean(item?.imageUrl) && !GENERIC_IGNORED_IMAGE_URLS.has(item.imageUrl);
}

function StatusPill({ value }: { value: string }) {
  return <span className="px-2 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-white/80 border border-border">{value}</span>;
}

function AgentGlyph({ keyName }: { keyName: AgentKey }) {
  const map = {
    crowd: <Radar className="w-5 h-5" />, seat: <Ticket className="w-5 h-5" />, kitchen: <Flame className="w-5 h-5" />, pickup: <Zap className="w-5 h-5" />, break: <TimerReset className="w-5 h-5" />,
  } as const;
  return map[keyName];
}

function AgentPreview({ agent }: { agent: AgentState }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/70 backdrop-blur-xl p-4 shadow-sm relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent" />
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br from-white to-white/40 shadow flex items-center justify-center ${agent.color}`}>
            <AgentGlyph keyName={agent.key} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold truncate">{agent.title}</div>
            <div className="text-xs text-muted-foreground truncate">{agent.subtitle}</div>
          </div>
        </div>
        <StatusPill value={agent.status} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{agent.stat}</span>
        <ChevronRight className="w-4 h-4" />
      </div>
    </div>
  );
}

function OperationsStats() {
  const stats = [
    { label: "Live Orders", value: "128", delta: "+12" },
    { label: "Occupancy", value: "78%", delta: "High" },
    { label: "Avg. Wait Time", value: "14 mins", delta: "↓ 3 mins" },
    { label: "Seats Available", value: "32 / 120", delta: "Good" },
  ];
  return <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">{stats.map((s) => <div key={s.label} className="rounded-2xl border border-border bg-white/80 backdrop-blur-xl p-3"><div className="text-xs text-muted-foreground">{s.label}</div><div className="mt-1 flex items-end justify-between"><span className="font-black text-lg">{s.value}</span><span className="text-xs text-emerald-600 font-semibold">{s.delta}</span></div></div>)}</div>;
}

function AIOperationsCenterModal({ open, onClose, onOpenAgent, agents }: { open: boolean; onClose: () => void; onOpenAgent: (agent: AgentKey) => void; agents: AgentState[] }) {
  return <AnimatePresence>{open && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/55 backdrop-blur-md">
    <div className="absolute inset-0" onClick={onClose} />
    <motion.div initial={{ opacity: 0, scale: 0.96, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 18 }} transition={{ type: "spring", damping: 24, stiffness: 250 }} className="absolute inset-4 lg:inset-8 rounded-[28px] overflow-hidden border border-white/50 bg-white/85 shadow-2xl">
      <div className="h-full p-5 lg:p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-violet-600 font-semibold uppercase tracking-[0.25em]"><Cpu className="w-4 h-4" />AI Operations Center</div>
            <h2 className="text-2xl lg:text-3xl font-black mt-1">Orchestrating canteen operations in real time</h2>
          </div>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-5 min-h-0 flex-1">
          <div className="rounded-[26px] border border-border bg-gradient-to-br from-white to-violet-50/80 p-5 relative overflow-hidden">
            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, rgba(168,85,247,0.12), transparent 24%), radial-gradient(circle at 80% 30%, rgba(59,130,246,0.12), transparent 22%), radial-gradient(circle at 50% 80%, rgba(16,185,129,0.12), transparent 24%)" }} />
            <div className="relative grid grid-cols-2 gap-3 h-full">
              <div className="col-span-2 rounded-3xl border border-white/70 bg-white/70 backdrop-blur-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold">AI Recommendations</div>
                  <div className="text-xs text-muted-foreground">Quick picks for students</div>
                </div>
                <div className="flex items-center gap-2 text-violet-600"><Sparkles className="w-4 h-4" />Fast mode</div>
              </div>
              <div className="col-span-2 rounded-3xl border border-white/70 bg-gradient-to-br from-violet-600 to-indigo-600 text-white p-4 shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.35),transparent_30%)]" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-white/70">Live AI Core</div>
                    <div className="text-4xl font-black mt-2">AI</div>
                  </div>
                  <div className="text-right text-xs text-white/80">
                    <div className="flex items-center gap-2 justify-end"><Activity className="w-4 h-4" />Realtime</div>
                    <div className="mt-2">Node mesh synced</div>
                  </div>
                </div>
              </div>
              {agents.map((agent) => <button key={agent.key} onClick={() => onOpenAgent(agent.key)} className="text-left"><AgentPreview agent={agent} /></button>)}
            </div>
            <div className="relative mt-4"><OperationsStats /></div>
          </div>
          <div className="rounded-[26px] border border-border bg-white/75 backdrop-blur-xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between"><div className="text-sm font-bold">Fleet Status</div><div className="text-xs text-emerald-600 font-semibold">LIVE</div></div>
            {agents.map((agent) => <button key={agent.key} onClick={() => onOpenAgent(agent.key)} className="rounded-2xl border border-border bg-white p-4 text-left shadow-sm hover:shadow-md transition-shadow"><div className="flex items-center gap-3"><div className={`w-9 h-9 rounded-2xl flex items-center justify-center bg-white border border-border ${agent.color}`}>{agent.icon}</div><div className="flex-1 min-w-0"><div className="flex items-center justify-between gap-3"><div className="font-semibold truncate">{agent.title}</div><StatusPill value={agent.status} /></div><div className="text-xs text-muted-foreground mt-1 truncate">{agent.subtitle}</div></div></div></button>)}
          </div>
        </div>
      </div>
    </motion.div>
  </motion.div>)}</AnimatePresence>;
}

function AgentDetailPanel({ agent, onBack, logs = LOGS }: { agent: AgentKey; onBack: () => void; logs?: Record<AgentKey, string[]> }) {
  const details = {
    crowd: { title: "Crowd Prediction Agent", status: "ACTIVE", accent: "emerald", summary: "Rush expected in 12 mins", body: "Occupancy graphs, rush heatmaps, node connections, and predictive demand signals." },
    seat: { title: "Seat Allocation Agent", status: "OPTIMIZING", accent: "blue", summary: "Table B2 allocated", body: "Live seat map, allocation visualization, and collision-free seating logic." },
    kitchen: { title: "Kitchen Optimization Agent", status: "PROCESSING", accent: "amber", summary: "Queue optimized", body: "Cooking queue optimization, recipe batching, and throughput balancing." },
    pickup: { title: "Pickup Coordination Agent", status: "PREDICTING", accent: "violet", summary: "Best pickup time: 3 mins", body: "Pickup timing prediction, counter load modeling, and collection ETA." },
    break: { title: "Break-Time Optimization Agent", status: "ANALYZING", accent: "pink", summary: "Efficiency: High", body: "Timing recommendations, break-window analysis, and schedule-aware dining guidance." },
  }[agent];
  return <motion.div layout className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-md p-4 lg:p-8"><motion.div initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.96 }} transition={{ type: "spring", damping: 26, stiffness: 250 }} className="h-full rounded-[30px] border border-white/50 bg-white/90 shadow-2xl overflow-hidden"><div className="h-full p-5 lg:p-6 flex flex-col gap-5"><div className="flex items-center justify-between"><Button variant="outline" onClick={onBack}><ArrowLeft className="w-4 h-4" />Back to Operations Center</Button><StatusPill value={details.status} /></div><div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-5 flex-1 min-h-0"><div className="rounded-[26px] border border-border bg-gradient-to-br from-white to-slate-50 p-5 overflow-hidden relative"><div className="absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, rgba(59,130,246,0.12), transparent 18%), radial-gradient(circle at 70% 30%, rgba(168,85,247,0.12), transparent 18%), radial-gradient(circle at 50% 70%, rgba(34,197,94,0.12), transparent 18%)" }} /><div className="relative"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-white border border-border flex items-center justify-center"><AgentGlyph keyName={agent} /></div><div><div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{details.status}</div><h3 className="text-2xl font-black">{details.title}</h3><p className="text-sm text-muted-foreground">{details.summary}</p></div></div><div className="mt-5 grid gap-3"><div className="rounded-2xl border border-border bg-white/80 p-4"><div className="text-sm font-semibold mb-2">Live Logs</div><div className="font-mono text-xs space-y-2 text-emerald-700">{(logs[agent] || []).map((line, i) => <div key={`${agent}-${i}`} className="flex gap-2"><span className="text-muted-foreground">{String(2120 + i).slice(1)}</span><span>{line}</span></div>)}</div></div><div className="grid md:grid-cols-2 gap-3"><div className="rounded-2xl border border-border bg-white/80 p-4"><div className="text-sm font-semibold mb-1">AI Reasoning</div><div className="text-sm text-muted-foreground">{details.body}</div></div><div className="rounded-2xl border border-border bg-white/80 p-4"><div className="text-sm font-semibold mb-1">Confidence</div><div className="text-3xl font-black text-violet-600">9{agent === "kitchen" ? 1 : agent === "pickup" ? 2 : agent === "crowd" ? 89 : agent === "seat" ? 94 : 87}%</div></div></div></div></div></div><div className="rounded-[26px] border border-border bg-white/80 p-5 flex flex-col gap-3 overflow-y-auto"><div className="text-sm font-bold">Operational Panel</div><div className="grid gap-3"><div className="rounded-2xl border border-border p-4"><div className="text-xs text-muted-foreground">Inputs Analyzed</div><div className="mt-1 text-sm font-medium">Footfall, seat telemetry, queue pressure, pickup traffic, schedule windows</div></div><div className="rounded-2xl border border-border p-4"><div className="text-xs text-muted-foreground">Decision Taken</div><div className="mt-1 text-sm font-medium">{details.summary}</div></div><div className="rounded-2xl border border-border p-4"><div className="text-xs text-muted-foreground">Realtime Update</div><div className="mt-1 flex items-center gap-2 text-emerald-600 font-semibold"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />Live synchronization active</div></div><div className="rounded-2xl border border-border p-4"><div className="text-xs text-muted-foreground">Animated Connections</div><div className="mt-3 h-24 rounded-2xl bg-gradient-to-br from-slate-100 to-violet-100 relative overflow-hidden"><div className="absolute inset-0 opacity-60" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(99,102,241,0.55), transparent 10%), radial-gradient(circle at 50% 50%, rgba(236,72,153,0.55), transparent 10%), radial-gradient(circle at 80% 30%, rgba(34,197,94,0.55), transparent 10%)" }} /></div></div></div></div></div></div></motion.div></motion.div>;
    
}

function OperationsHub() {
  const [openCenter, setOpenCenter] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentKey | null>(null);
  const [agentsState, setAgentsState] = useState<AgentState[]>(AGENTS);
  const [logsState, setLogsState] = useState<Record<AgentKey, string[]>>(LOGS);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let active = true;
    const url = `/api/notifications/stream`;

    function connect() {
      const es = new EventSource(url);
      esRef.current = es;

      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);

          if (data.type === "agents_snapshot" && active) {
            if (Array.isArray(data.agents)) setAgentsState(data.agents);
          }

          if (data.type === "agent_update" && active) {
            setAgentsState((prev) => prev.map((a) => a.key === data.key ? { ...a, ...(data.update || data) } : a));
          }

          if (data.type === "agent_log" && active) {
            const agentKey = data.agent as AgentKey;
            setLogsState((prev) => ({ ...prev, [agentKey]: [...(prev[agentKey] || []), data.message].slice(-40) }));
          }
        } catch {
          // ignore malformed events
        }
      };

      es.onerror = () => {
        try { es.close(); } catch {}
        esRef.current = null;
        if (active) setTimeout(connect, 3000);
      };
    }

    connect();
    return () => { active = false; esRef.current?.close(); esRef.current = null; };
  }, []);

  return <>
    <AnimatePresence>{openCenter && <AIOperationsCenterModal open={openCenter} onClose={() => setOpenCenter(false)} onOpenAgent={(agent) => setActiveAgent(agent)} agents={agentsState} />}</AnimatePresence>
    <AnimatePresence>{activeAgent && <AgentDetailPanel agent={activeAgent} onBack={() => setActiveAgent(null)} logs={logsState} />}</AnimatePresence>
    <button onClick={() => setOpenCenter(true)} className="w-full mb-4 rounded-[28px] border border-border bg-white/80 backdrop-blur-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow text-left">
      <div className="grid md:grid-cols-2 gap-0">
        <div className="p-4 lg:p-5 border-b md:border-b-0 md:border-r border-border/70">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-violet-600 font-semibold"><Sparkles className="w-4 h-4" />AI Recommendations</div>
          <div className="mt-2 font-bold text-lg">Smart meal suggestions for students</div>
          <div className="text-sm text-muted-foreground mt-1">Fast intent-based picks, crowd-aware recommendations, and menu insights.</div>
        </div>
        <div className="p-4 lg:p-5 bg-gradient-to-br from-slate-950 via-violet-950 to-indigo-950 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.18), transparent 18%), radial-gradient(circle at 80% 30%, rgba(59,130,246,0.20), transparent 18%), radial-gradient(circle at 60% 80%, rgba(168,85,247,0.18), transparent 18%)" }} />
          <div className="relative flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/60 font-semibold"><Cpu className="w-4 h-4" />AI Operations Center</div>
              <div className="mt-2 text-lg font-black">Real-time agent orchestration</div>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-3 text-xs text-white/85">
              Crowd Agent ACTIVE<br />Seat Agent OPTIMIZING<br />Kitchen Agent PROCESSING<br />Pickup Agent PREDICTING
            </div>
          </div>
        </div>
      </div>
    </button>
  </>;
}

function CartDrawer({ onClose }: { onClose: () => void }) {
      const cart = useCart();
      const [orderType, setOrderType] = useState<"dine_in" | "parcel">("dine_in");
      const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
      const [showPayment, setShowPayment] = useState(false);
      const { getToken } = useAuth();
      const { addPoints } = useGamification();
      const { isGuest } = useGuestMode();
      const total = cart.total();

      async function placeOrderAfterPayment(method: PaymentMethod) {
        if (cart.items.length === 0) {
          alert("Your cart is empty.");
          return;
        }
        if (isGuest) {
          const pts = Math.floor(total / 10);
          addPoints(pts);
          cart.clearCart();
          onClose();
          return;
        }
        try {
          const token = await getToken();
          if (!token) {
            alert("Please sign in before placing an order.");
            window.location.href = "/auth-gate";
            return;
          }
          await apiFetch("/orders", {
            method: "POST",
            body: JSON.stringify({ items: cart.items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })), type: orderType, paymentMethod: method }),
          }, token);
          const pts = Math.floor(total / 10);
          addPoints(pts);
          cart.clearCart();
          onClose();
          window.location.href = "/orders";
        } catch (error) {
          console.error("Place order failed:", error);
          const message = error instanceof Error ? error.message : "Please try again.";
          if (message.toLowerCase().includes("unauthorized")) {
            alert("Please sign in before placing an order.");
            window.location.href = "/auth-gate";
            return;
          }
          alert(`Failed to place order. ${message}`);
        }
      }
    


  return (
    <>
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background border-l border-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-lg">Your Cart</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        {cart.items.length === 0 ? (<div className="flex-1 flex items-center justify-center flex-col gap-3 text-muted-foreground"><ShoppingCart className="w-12 h-12 opacity-30" /><p>Your cart is empty</p></div>) : (<>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.items.map((item) => (<div key={item.menuItemId} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"><div className="flex-1"><div className="font-medium text-sm flex items-center gap-1">{item.isVeg ? <span className="text-green-500">●</span> : <span className="text-red-500">●</span>}{item.name}</div><div className="text-primary font-semibold text-sm">₹{(item.price * item.quantity).toFixed(0)}</div></div><div className="flex items-center gap-2"><button onClick={() => cart.updateQuantity(item.menuItemId, item.quantity - 1)} className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted">−</button><span className="w-6 text-center font-semibold text-sm">{item.quantity}</span><button onClick={() => cart.updateQuantity(item.menuItemId, item.quantity + 1)} className="w-7 h-7 rounded-full gradient-orange text-white flex items-center justify-center">+</button></div></div>))}
          </div>
          <div className="p-4 border-t space-y-4">
            <div className="flex items-center justify-between"><div className="flex justify-between font-bold text-lg flex-1"><span>Total</span><span className="text-gradient">₹{cart.total().toFixed(0)}</span></div></div>
            <div className="text-xs text-muted-foreground flex items-center gap-1"><span className="text-amber-500">★</span>Earn <strong>{Math.floor(cart.total() / 10)} points</strong> with this order</div>
            <div className="flex gap-2"><button onClick={() => setOrderType("dine_in")} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${orderType === "dine_in" ? "gradient-orange text-white border-0" : "border-border"}`}>🍽️ Dine In</button><button onClick={() => setOrderType("parcel")} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${orderType === "parcel" ? "gradient-orange text-white border-0" : "border-border"}`}>📦 Parcel</button></div>
            <div className="grid grid-cols-2 gap-2"><Button onClick={() => { setPaymentMethod("cod"); setShowPayment(true); }} variant="outline" className="h-12 text-base font-semibold rounded-xl">Cash on Delivery</Button><Button onClick={() => { setPaymentMethod("upi"); setShowPayment(true); }} className="h-12 gradient-orange text-white border-0 text-base font-semibold rounded-xl">Pay Online</Button></div>
          </div>
        </>)}
      </motion.div>
      <UpiPaymentModal open={showPayment} amount={cart.total()} isGuest={isGuest} onSuccess={(method) => placeOrderAfterPayment(method)} onClose={() => setShowPayment(false)} />
    </>
  );
}

function MenuItemCard({ item, onAdd }: { item: any; onAdd: () => void }) {
  const cart = useCart();
  const inCart = cart.items.find((i) => i.menuItemId === item.id);
  const [imageSrc, setImageSrc] = useState<string>(() =>
    shouldUseItemImage(item) ? item.imageUrl : getMenuItemImageFallback(item)
  );
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="group card-hover bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="relative h-44 bg-gradient-to-br from-orange-100 to-amber-50 overflow-hidden">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={item.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => {
              const fallback = getMenuItemImageFallback(item);
              if (fallback && fallback !== imageSrc) {
                setImageSrc(fallback);
              } else {
                setImageSrc("");
              }
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-50"><span className="text-4xl opacity-30">{item.isVeg ? "V" : "NV"}</span></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div className={`absolute top-2 left-2 w-4 h-4 rounded border-2 flex items-center justify-center bg-white/90 ${item.isVeg ? "border-green-600" : "border-red-600"}`}><div className={`w-2 h-2 rounded-full ${item.isVeg ? "bg-green-600" : "bg-red-600"}`} /></div>
        {!item.isAvailable && (<div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Badge variant="secondary">Unavailable</Badge></div>)}
      </div>
      <div className="p-4"><div className="flex items-start justify-between gap-2 mb-1"><h3 className="font-bold text-sm leading-tight">{item.name}</h3><span className="font-black text-primary text-sm whitespace-nowrap">₹{item.price}</span></div><p className="text-xs text-muted-foreground mb-3 line-clamp-2">{item.description}</p><div className="flex items-center justify-between"><div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.prepTimeMinutes}m</span>{item.calories && <span>{item.calories} cal</span>}</div>{inCart ? (<div className="flex items-center gap-2"><button onClick={() => cart.updateQuantity(item.id, inCart.quantity - 1)} className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-xs">−</button><span className="font-bold text-sm w-4 text-center">{inCart.quantity}</span><button onClick={() => cart.updateQuantity(item.id, inCart.quantity + 1)} className="w-6 h-6 rounded-full gradient-orange text-white flex items-center justify-center text-xs">+</button></div>) : (<button onClick={onAdd} disabled={!item.isAvailable} className="gradient-orange text-white text-xs font-semibold px-3 py-1.5 rounded-full disabled:opacity-50 hover:opacity-90 transition-opacity">+ Add</button>)}</div></div>
    </motion.div>
  );
}

export default function MenuPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const cart = useCart();
  const { isSignedIn } = useAuth();
  const { isGuest } = useGuestMode();

  const categories = useListMenuCategories().data ?? [];
  const { data: items = [], isLoading } = useListMenuItems(selectedCategory ? { category: selectedCategory } : {});
  const { data: aiData } = useGetAiRecommendations({ query: { enabled: isSignedIn } } as any);
  const { data: crowdData } = useGetCrowdPrediction({ query: { enabled: true } } as any);

  const filtered = items.filter((item: any) => item.name.toLowerCase().includes(search.toLowerCase()) || item.description.toLowerCase().includes(search.toLowerCase()));
  const crowdColors = { low: "text-green-600", medium: "text-amber-600", high: "text-red-500", very_high: "text-red-700" };
  const crowdLevel = (crowdData as any)?.currentLevel || "low";

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" className="font-bold text-sm text-muted-foreground hover:text-foreground transition-colors">← Home</Link>
          <span className="text-border">|</span>
          <h1 className="font-black text-lg flex-1">Menu</h1>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium flex items-center gap-1 ${crowdColors[crowdLevel as keyof typeof crowdColors]}`}><Users className="w-3 h-3" />{crowdLevel === "low" ? "Low crowd" : crowdLevel === "medium" ? "Moderate" : "Busy now"}</span>
            <LevelBadge />
            <Link href="/seats"><Button size="sm" variant="outline" className="text-xs hidden sm:flex">Reserve Seat</Button></Link>
            {!isGuest && <Link href="/profile"><button className="relative p-2 rounded-xl border border-border bg-background hover:bg-muted transition-colors"><UserRound className="w-5 h-5 text-foreground" /></button></Link>}
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search dishes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11 rounded-xl" /></div>
        {isSignedIn && <button onClick={() => setShowAI(!showAI)} className="w-full mb-4 p-3 rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 flex items-center gap-3 hover:shadow-sm transition-shadow text-left"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div><div className="flex-1"><div className="font-semibold text-sm text-purple-800">AI Recommendations</div><div className="text-xs text-purple-600/80">{(aiData as any)?.message || "Tap to see what the AI suggests"}</div></div><ChevronRight className={`w-4 h-4 text-purple-500 transition-transform ${showAI ? "rotate-90" : ""}`} /></button>}
        <AnimatePresence>{showAI && (aiData as any)?.items?.length > 0 && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-4 overflow-hidden"><div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-2">{(aiData as any).items.map((rec: any) => (<div key={rec.menuItemId} className="p-3 rounded-xl bg-card border border-purple-100 shadow-sm"><div className="font-semibold text-sm mb-1">{rec.name}</div><div className="text-xs text-muted-foreground mb-2 line-clamp-2">{rec.reason}</div><div className="flex items-center justify-between"><span className="text-primary font-bold text-sm">₹{rec.price}</span><button onClick={() => cart.addItem({ menuItemId: rec.menuItemId, name: rec.name, price: rec.price, isVeg: false })} className="gradient-orange text-white text-xs px-2 py-1 rounded-full">Add</button></div></div>))}</div></motion.div>)}</AnimatePresence>
        <OperationsHub />
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none"><button onClick={() => setSelectedCategory(null)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${!selectedCategory ? "gradient-orange text-white" : "bg-muted hover:bg-muted/80"}`}>All</button>{categories.map((cat: string) => (<button key={cat} onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === cat ? "gradient-orange text-white" : "bg-muted hover:bg-muted/80"}`}>{cat}</button>))}</div>
        {isLoading ? (<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <div key={i} className="h-56 rounded-2xl bg-muted animate-pulse" />)}</div>) : filtered.length === 0 ? (<div className="text-center py-16 text-muted-foreground"><div className="text-4xl mb-3">🍽️</div><p>No items found</p></div>) : (<motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"><AnimatePresence>{filtered.map((item: any) => (<MenuItemCard key={item.id} item={item} onAdd={() => cart.addItem({ menuItemId: item.id, name: item.name, price: item.price, isVeg: item.isVeg })} />))}</AnimatePresence></motion.div>)}
      </div>
      <AnimatePresence>{cartOpen && (<><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCartOpen(false)} className="fixed inset-0 bg-black/40 z-40" /><CartDrawer onClose={() => setCartOpen(false)} /></>)}</AnimatePresence>
      <div className="fixed bottom-5 right-5 z-50"><button onClick={() => setCartOpen(true)} className="relative gradient-orange text-white p-4 rounded-full shadow-2xl"><ShoppingCart className="w-6 h-6" />{cart.itemCount() > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-primary text-xs font-black rounded-full flex items-center justify-center shadow">{cart.itemCount()}</span>}</button></div>
    </div>
  );
}
