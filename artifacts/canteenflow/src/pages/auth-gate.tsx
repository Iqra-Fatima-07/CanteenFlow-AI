import { useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, UserPlus, ArrowRight, Upload, Shield, GraduationCap, ChefHat, CheckCircle2, Utensils,
} from "lucide-react";

const BG_IMAGES = [
  "https://www.ruchiskitchen.com/wp-content/uploads/2020/09/How-to-make-the-best-Chicken-Biryani-027-768x1365.jpg.webp",
  "https://silkroadrecipes.com/wp-content/uploads/2021/12/Paneer-Butter-Masala-4.jpg",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=90&fit=crop",
  "https://www.kitchensanctuary.com/wp-content/uploads/2023/09/Black-Lentil-Dal-tall-FS.jpg",
];

function BackgroundMosaic() {
  return (
    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
      {BG_IMAGES.map((src, i) => (
        <div key={i} className="overflow-hidden relative">
          <img
            src={src}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-50"
            style={{ animation: `kb${i % 2 === 0 ? "In" : "Out"} 14s ease-in-out infinite alternate` }}
          />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/80 to-black/90" />
      <style>{`
        @keyframes kbIn { from { transform: scale(1); } to { transform: scale(1.12) translate(2%, -2%); } }
        @keyframes kbOut { from { transform: scale(1.1) translate(-2%, 2%); } to { transform: scale(1); } }
      `}</style>
    </div>
  );
}

export default function AuthGatePage() {
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const [, navigate] = useLocation();

  const role = useMemo(() => {
    const saved = localStorage.getItem("canteenflow_selected_role");
    return saved === "canteen" ? "canteen" : "student";
  }, []);

  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: clerkUser?.fullName || clerkUser?.firstName || "",
    idNumber: "",
    phoneNumber: "",
  });

  const clerkEmail = clerkUser?.primaryEmailAddress?.emailAddress || "";
  const clerkName = clerkUser?.fullName || clerkUser?.firstName || "User";
  const clerkAvatar = clerkUser?.imageUrl;

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const token = await getToken();
      const nameToSave = form.name.trim() || clerkName;
      await apiFetch(
        "/users/me",
        {
          method: "PATCH",
          body: JSON.stringify({ role, name: nameToSave }),
        },
        token,
      );
      if (form.idNumber) localStorage.setItem("canteenflow_id_number", form.idNumber);
      if (form.phoneNumber) localStorage.setItem("canteenflow_phone", form.phoneNumber);
      localStorage.setItem("canteenflow_role_selected", "1");
      navigate(role === "canteen" ? "/dashboard" : "/menu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      <BackgroundMosaic />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-8"
        >
          <div className="w-9 h-9 rounded-xl gradient-orange flex items-center justify-center">
            <Utensils className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-xl">CanteenFlow <span className="text-orange-400">AI</span></span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-lg"
        >
          {/* Role badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-5 py-2 backdrop-blur">
              {role === "canteen"
                ? <ChefHat className="w-4 h-4 text-amber-400" />
                : <GraduationCap className="w-4 h-4 text-orange-400" />}
              <span className="text-white/90 text-sm font-medium">
                {role === "canteen" ? "Canteen Staff" : "Student / Faculty"}
              </span>
            </div>
          </div>

          {/* Clerk user info pill */}
          {clerkUser && (
            <div className="flex items-center gap-3 bg-white/8 border border-white/12 rounded-2xl px-4 py-3 mb-5 backdrop-blur">
              {clerkAvatar
                ? <img src={clerkAvatar} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-orange-400/40" />
                : <div className="w-9 h-9 rounded-full gradient-orange flex items-center justify-center text-white text-sm font-bold">
                    {clerkName[0]?.toUpperCase()}
                  </div>
              }
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-semibold truncate">{clerkName}</div>
                <div className="text-white/50 text-xs truncate">{clerkEmail}</div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
            </div>
          )}

          <Card className="bg-white/10 border-white/15 backdrop-blur-xl shadow-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg">
                {role === "canteen" ? "Welcome to the Kitchen" : "Almost there!"}
              </CardTitle>
              <CardDescription className="text-white/55">
                {role === "canteen"
                  ? "You're already authenticated. Continue to your kitchen dashboard."
                  : "Complete your profile or continue to your existing account."}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {role === "canteen" ? (
                <form onSubmit={handleContinue} className="space-y-4">
                  <div className="rounded-xl bg-amber-500/10 border border-amber-400/20 px-4 py-3 text-sm text-amber-300">
                    Logged in as canteen staff. You have access to the kitchen dashboard, order management, and revenue analytics.
                  </div>
                  <Button type="submit" disabled={loading} className="w-full gradient-orange text-white border-0 h-12 text-base font-semibold">
                    {loading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <><ArrowRight className="w-4 h-4 mr-2" /> Open Kitchen Dashboard</>}
                  </Button>
                </form>
              ) : (
                <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
                  <TabsList className="grid grid-cols-2 w-full bg-white/8 border border-white/12 mb-5">
                    <TabsTrigger value="login" className="text-white/70 data-[state=active]:bg-white data-[state=active]:text-black font-medium">
                      Login
                    </TabsTrigger>
                    <TabsTrigger value="register" className="text-white/70 data-[state=active]:bg-white data-[state=active]:text-black font-medium">
                      Register
                    </TabsTrigger>
                  </TabsList>

                  {/* LOGIN TAB — returning user */}
                  <TabsContent value="login">
                    <form onSubmit={handleContinue} className="space-y-4">
                      <div className="rounded-xl bg-orange-500/10 border border-orange-400/20 px-4 py-3 text-sm text-orange-200">
                        You're already signed in with Clerk. Click below to enter the student portal.
                      </div>
                      <Button type="submit" disabled={loading} className="w-full gradient-orange text-white border-0 h-12 text-base font-semibold">
                        {loading
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <><ArrowRight className="w-4 h-4 mr-2" /> Continue to Menu</>}
                      </Button>
                    </form>
                  </TabsContent>

                  {/* REGISTER TAB — new student profile */}
                  <TabsContent value="register">
                    <form onSubmit={handleContinue} className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-white/80 text-sm">Full Name</Label>
                        <Input
                          value={form.name}
                          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                          placeholder={clerkName}
                          className="bg-white/6 border-white/15 text-white placeholder:text-white/35 focus:border-orange-400/60"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-white/80 text-sm">Student / Faculty ID</Label>
                          <Input
                            value={form.idNumber}
                            onChange={(e) => setForm((p) => ({ ...p, idNumber: e.target.value }))}
                            placeholder="e.g. CS2024001"
                            className="bg-white/6 border-white/15 text-white placeholder:text-white/35 focus:border-orange-400/60"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/80 text-sm">Phone Number</Label>
                          <Input
                            value={form.phoneNumber}
                            onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                            placeholder="+91 98765 43210"
                            className="bg-white/6 border-white/15 text-white placeholder:text-white/35 focus:border-orange-400/60"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white/80 text-sm">
                          Upload ID Card <span className="text-white/40 font-normal">(optional)</span>
                        </Label>
                        <label className="flex items-center gap-3 rounded-xl border border-dashed border-white/20 bg-white/5 px-4 py-3 cursor-pointer hover:bg-white/8 hover:border-orange-400/40 transition-all">
                          <Upload className="w-4 h-4 text-orange-300 flex-shrink-0" />
                          <span className="text-sm text-white/60 truncate">
                            {idCardFile ? idCardFile.name : "Choose file (JPG, PNG, PDF)"}
                          </span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) => setIdCardFile(e.target.files?.[0] ?? null)}
                          />
                        </label>
                      </div>

                      <Button type="submit" disabled={loading} className="w-full gradient-orange text-white border-0 h-12 text-base font-semibold">
                        {loading
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <><UserPlus className="w-4 h-4 mr-2" /> Complete Registration</>}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-center gap-2 text-white/35 text-xs mt-5">
            <Shield className="w-3 h-3" />
            Authenticated securely via Clerk
          </div>
        </motion.div>
      </div>
    </div>
  );
}
