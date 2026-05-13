import { useState } from "react";
import { useAuth } from "@clerk/react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { useLocation } from "wouter";
import { Loader2, GraduationCap, ChefHat, Utensils, Ghost } from "lucide-react";
import { useGuestMode } from "@/hooks/useGuestMode";

const HERO_IMAGES = [
  "https://www.ruchiskitchen.com/wp-content/uploads/2020/09/How-to-make-the-best-Chicken-Biryani-027-768x1365.jpg.webp",
  "https://silkroadrecipes.com/wp-content/uploads/2021/12/Paneer-Butter-Masala-4.jpg",
  "https://media.istockphoto.com/id/1372486217/photo/masala-dosa-is-a-south-indian-food.jpg?s=612x612&w=0&k=20&c=YkFnH9vl_X2aToaJKt29HdeV4GA7Gz1u-HuGCdxokJw=",
  "https://www.kitchensanctuary.com/wp-content/uploads/2023/09/Black-Lentil-Dal-tall-FS.jpg",
];

export default function SelectRolePage() {
  const { getToken, isSignedIn } = useAuth();
  const [, navigate] = useLocation();
  const [selecting, setSelecting] = useState<"student" | "canteen" | null>(null);
  const { enterGuestMode } = useGuestMode();

  const isGuestFlow = new URLSearchParams(window.location.search).get("guest") === "true";

  async function selectRole(role: "student" | "canteen") {
    if (isGuestFlow || !isSignedIn) {
      enterGuestMode(role === "canteen" ? "staff" : "student");
      navigate(role === "canteen" ? "/dashboard" : "/menu");
      return;
    }
    setSelecting(role);
    try {
      const token = await getToken();
      await apiFetch("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }, token);
      localStorage.setItem("canteenflow_selected_role", role);
      navigate("/auth-gate");
    } catch {
      setSelecting(null);
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-black">
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
        {HERO_IMAGES.map((src, i) => (
          <div key={i} className="overflow-hidden relative">
            <img
              src={src}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-40"
              style={{ animation: `kenBurns${i % 2 === 0 ? "In" : "Out"} 12s ease-in-out infinite alternate` }}
            />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black/80" />

      <div className="relative z-10 text-center px-4 max-w-xl mx-auto w-full">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl gradient-orange flex items-center justify-center">
              <Utensils className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-2xl">CanteenFlow <span className="text-gradient">AI</span></span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-3">How are you using<br />CanteenFlow?</h1>
          <p className="text-white/60 mb-10 text-base">Choose your role to get the right experience</p>
        </motion.div>

        {isGuestFlow && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 p-3 rounded-xl bg-white/10 border border-white/20 text-white/70 text-sm text-center">
            <Ghost className="w-4 h-4 inline-block mr-1" /> Guest mode — no account needed. Limited features apply.
          </motion.div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onClick={() => selectRole("student")}
            disabled={selecting !== null}
            className="group relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-left hover:bg-white/20 hover:border-orange-400/60 hover:scale-[1.02] transition-all duration-200 disabled:opacity-60 cursor-pointer"
          >
            <div className="w-14 h-14 rounded-xl bg-orange-500/20 border border-orange-400/40 flex items-center justify-center mb-4 group-hover:bg-orange-500/30 transition-colors">
              {selecting === "student" ? (
                <Loader2 className="w-7 h-7 text-orange-400 animate-spin" />
              ) : (
                <GraduationCap className="w-7 h-7 text-orange-400" />
              )}
            </div>
            <h2 className="text-white font-bold text-xl mb-2">Student / Faculty</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Browse the menu, place orders, reserve seats, and track your meal in real time.
            </p>
            <div className="mt-4 text-orange-400 text-sm font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              Start ordering &rarr;
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            onClick={() => selectRole("canteen")}
            disabled={selecting !== null}
            className="group relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-left hover:bg-white/20 hover:border-amber-400/60 hover:scale-[1.02] transition-all duration-200 disabled:opacity-60 cursor-pointer"
          >
            <div className="w-14 h-14 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center mb-4 group-hover:bg-amber-500/30 transition-colors">
              {selecting === "canteen" ? (
                <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
              ) : (
                <ChefHat className="w-7 h-7 text-amber-400" />
              )}
            </div>
            <h2 className="text-white font-bold text-xl mb-2">Canteen Staff</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Manage orders from the kitchen dashboard, track revenue, and update menu availability.
            </p>
            <div className="mt-4 text-amber-400 text-sm font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              Open dashboard &rarr;
            </div>
          </motion.button>
        </div>
      </div>

      <style>{`@keyframes kenBurnsIn { from { transform: scale(1); } to { transform: scale(1.15) translate(2%, -2%); } } @keyframes kenBurnsOut { from { transform: scale(1.1) translate(-2%, 2%); } to { transform: scale(1); } }`}</style>
    </div>
  );
}
