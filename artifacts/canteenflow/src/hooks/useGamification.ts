import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Level = "bronze" | "silver" | "gold" | "platinum";

const LEVEL_THRESHOLDS: Record<Level, number> = {
  bronze: 0,
  silver: 100,
  gold: 500,
  platinum: 1000,
};

function getLevel(points: number): Level {
  if (points >= 1000) return "platinum";
  if (points >= 500) return "gold";
  if (points >= 100) return "silver";
  return "bronze";
}

const LEVEL_COUPONS: Partial<Record<Level, string>> = {
  silver: "SILVER10",
  gold: "GOLD20",
  platinum: "PLAT30",
};

interface GamificationState {
  points: number;
  coupons: string[];
  recentPoints: number;
  showPointsAnimation: boolean;
  addPoints: (amount: number) => void;
  dismissAnimation: () => void;
}

export const useGamification = create<GamificationState>()(
  persist(
    (set, get) => ({
      points: 0,
      coupons: [],
      recentPoints: 0,
      showPointsAnimation: false,
      addPoints: (amount: number) => {
        const prev = get().points;
        const next = prev + amount;
        const prevLevel = getLevel(prev);
        const nextLevel = getLevel(next);
        const newCoupons = [...get().coupons];
        if (prevLevel !== nextLevel && LEVEL_COUPONS[nextLevel] && !newCoupons.includes(LEVEL_COUPONS[nextLevel]!)) {
          newCoupons.push(LEVEL_COUPONS[nextLevel]!);
        }
        set({ points: next, coupons: newCoupons, recentPoints: amount, showPointsAnimation: true });
        setTimeout(() => set({ showPointsAnimation: false }), 3000);
      },
      dismissAnimation: () => set({ showPointsAnimation: false }),
    }),
    { name: "canteenflow-gamification" }
  )
);

export function useLevel() {
  const points = useGamification((s) => s.points);
  const level = getLevel(points);
  const nextLevelPoints: Partial<Record<Level, number>> = { bronze: 100, silver: 500, gold: 1000 };
  const nextLevel = { bronze: "silver", silver: "gold", gold: "platinum", platinum: null }[level];
  const progress = nextLevel
    ? ((points - LEVEL_THRESHOLDS[level]) / (LEVEL_THRESHOLDS[nextLevel as Level] - LEVEL_THRESHOLDS[level])) * 100
    : 100;
  return { level, points, progress: Math.min(100, progress), nextLevel, nextLevelPoints: nextLevelPoints[level] };
}
