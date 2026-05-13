import { motion, AnimatePresence } from "framer-motion";
import { useGamification, useLevel } from "@/hooks/useGamification";
import { Star, Trophy, Gift } from "lucide-react";

const LEVEL_CONFIG = {
  bronze: { color: "from-amber-700 to-amber-500", emoji: "🥉", label: "Bronze" },
  silver: { color: "from-slate-400 to-slate-300", emoji: "🥈", label: "Silver" },
  gold: { color: "from-yellow-500 to-amber-400", emoji: "🥇", label: "Gold" },
  platinum: { color: "from-purple-500 to-blue-400", emoji: "💎", label: "Platinum" },
};

export function LevelBadge() {
  const { level, points } = useLevel();
  const config = LEVEL_CONFIG[level];
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r ${config.color} text-white text-xs font-bold shadow-sm`}>
      <span>{config.emoji}</span>
      <span>{config.label}</span>
      <span className="opacity-75">·</span>
      <Star className="w-3 h-3" />
      <span>{points}</span>
    </div>
  );
}

export function PointsAnimation() {
  const { showPointsAnimation, recentPoints, dismissAnimation } = useGamification();

  return (
    <AnimatePresence>
      {showPointsAnimation && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          onClick={dismissAnimation}
          className="fixed bottom-24 right-5 z-50 bg-gradient-to-r from-purple-600 to-orange-500 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Star className="w-5 h-5" />
          </div>
          <div>
            <div className="font-black text-lg">+{recentPoints} pts!</div>
            <div className="text-white/80 text-xs">Points earned</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function CouponBanner({ coupons }: { coupons: string[] }) {
  if (!coupons.length) return null;
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 mb-4">
      <Gift className="w-4 h-4 text-green-600 flex-shrink-0" />
      <div className="flex-1">
        <div className="text-xs font-semibold text-green-800">You have {coupons.length} coupon{coupons.length > 1 ? "s" : ""}!</div>
        <div className="text-xs text-green-600 font-mono">{coupons.join(", ")}</div>
      </div>
    </div>
  );
}

export function GamificationOverlay() {
  return (
    <>
      <PointsAnimation />
    </>
  );
}
