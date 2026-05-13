import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Link, useLocation } from "wouter";
import { SignInButton, SignUpButton, useAuth } from "@clerk/react";
import {
  Utensils, Zap, Users, BarChart3, MapPin, Clock, Star, ArrowRight, ChefHat, Shield, GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const HERO_IMAGES = [
  {
    src: "https://www.ruchiskitchen.com/wp-content/uploads/2020/09/How-to-make-the-best-Chicken-Biryani-027-768x1365.jpg.webp",
    label: "Chicken Biryani",
  },
  {
    src: "https://silkroadrecipes.com/wp-content/uploads/2021/12/Paneer-Butter-Masala-4.jpg",
    label: "Paneer Butter Masala",
  },
  {
    src: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=90&fit=crop",
    label: "Margherita Pizza",
  },
  {
    src: "https://www.kitchensanctuary.com/wp-content/uploads/2023/09/Black-Lentil-Dal-tall-FS.jpg",
    label: "Dal Makhani",
  },
  {
    src: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=90&fit=crop",
    label: "Chicken Burger",
  },
  {
    src: "https://images.unsplash.com/photo-1602351447937-745cb720612f?w=800&q=90&fit=crop",
    label: "Chocolate Brownie",
  },
];

const FOOD_STRIP = [
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&q=80&fit=crop",
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&q=80&fit=crop",
  "https://silkroadrecipes.com/wp-content/uploads/2021/12/Paneer-Butter-Masala-4.jpg",
  "https://images.unsplash.com/photo-1602351447937-745cb720612f?w=300&q=80&fit=crop",
  "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=300&q=80&fit=crop",
  "https://www.yellowthyme.com/wp-content/uploads/2023/03/Mango-Lassi-08570-819x1024.jpg",
  "https://www.ruchiskitchen.com/wp-content/uploads/2020/09/How-to-make-the-best-Chicken-Biryani-027-768x1365.jpg.webp",
  "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=300&q=80&fit=crop",
];

const FEATURES = [
  { icon: Zap, title: "AI-Powered Ordering", desc: "Smart recommendations based on your preferences and current crowd levels.", color: "text-amber-500", bg: "bg-amber-50" },
  { icon: MapPin, title: "3D Seat Reservation", desc: "Visualize and reserve the perfect seat before you even walk in.", color: "text-blue-500", bg: "bg-blue-50" },
  { icon: Users, title: "Group Dining", desc: "Coordinate orders with your friend group seamlessly.", color: "text-green-500", bg: "bg-green-50" },
  { icon: Clock, title: "Live Order Tracking", desc: "Real-time updates from kitchen to your table.", color: "text-purple-500", bg: "bg-purple-50" },
  { icon: BarChart3, title: "Crowd Heatmaps", desc: "AI-predicted crowd levels so you skip the rush.", color: "text-rose-500", bg: "bg-rose-50" },
  { icon: ChefHat, title: "Kitchen Dashboard", desc: "Canteen staff get a live order management system.", color: "text-orange-500", bg: "bg-orange-50" },
];

const STATS = [
  { value: "48s", label: "Avg order time" },
  { value: "6", label: "AI agents" },
  { value: "98%", label: "On-time rate" },
  { value: "5K+", label: "Students served" },
];

const TESTIMONIALS = [
  { name: "Priya S.", role: "CS Student", text: "No more queuing! I order from class and my food is ready when I arrive.", avatar: "PS" },
  { name: "Arjun M.", role: "MBA Student", text: "The seat reservation feature is genius. My whole study group uses it every day.", avatar: "AM" },
  { name: "Dr. Kavitha R.", role: "Faculty", text: "As a canteen manager, the dashboard has cut our preparation errors by 80%.", avatar: "KR" },
];

function HeroBackground() {
  return (
    <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-0">
      {HERO_IMAGES.map((img, i) => (
        <div key={i} className="overflow-hidden relative">
          <img
            src={img.src}
            alt={img.label}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              animation: `kenBurns${i % 2 === 0 ? "In" : "Out"} ${14 + i * 2}s ease-in-out ${i * 1.5}s infinite alternate`,
            }}
          />
        </div>
      ))}
      <style>{`
        @keyframes kenBurnsIn {
          from { transform: scale(1); }
          to { transform: scale(1.18) translate(3%, -2%); }
        }
        @keyframes kenBurnsOut {
          from { transform: scale(1.12) translate(-2%, 3%); }
          to { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function FoodStrip() {
  return (
    <div className="overflow-hidden py-6 bg-neutral-950">
      <div className="flex gap-4 animate-[scrollStrip_30s_linear_infinite] w-max">
        {[...FOOD_STRIP, ...FOOD_STRIP].map((src, i) => (
          <div key={i} className="w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0 border border-white/10">
            <img src={src} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes scrollStrip {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

export default function LandingPage() {
  const { isSignedIn } = useAuth();
  const [, navigate] = useLocation();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  function handleGetStarted() {
    if (isSignedIn) {
      navigate("/select-role");
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 backdrop-blur-xl bg-black/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl gradient-orange flex items-center justify-center">
              <Utensils className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-white">CanteenFlow <span className="text-orange-400">AI</span></span>
          </div>
          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <Link href="/select-role">
                <Button className="gradient-orange text-white border-0">
                  Open App <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            ) : (
              <>
                <SignInButton mode="modal">
                  <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">Sign In</Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button className="gradient-orange text-white border-0">Get Started</Button>
                </SignUpButton>
              </>
            )}
          </div>
        </div>
      </nav>

      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <HeroBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 text-center px-4 max-w-5xl mx-auto pt-16"
        >
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge className="mb-6 bg-orange-500/20 text-orange-300 border-orange-500/30 text-sm px-4 py-1.5 backdrop-blur">
              AI-Powered Campus Dining
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6 leading-[1.0] text-white"
          >
            Your Campus
            <br />
            <span className="text-orange-400">Canteen, Reimagined</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Order food, reserve seats, track your meal live, and never wait in a queue again.
            Powered by 6 AI agents working for you.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            {isSignedIn ? (
              <Link href="/select-role">
                <Button size="lg" className="gradient-orange text-white border-0 text-lg px-8 h-14 rounded-xl shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 transition-shadow">
                  Continue to App <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            ) : (
              <>
                <SignUpButton mode="modal">
                  <Button
                    size="lg"
                    className="gradient-orange text-white border-0 text-lg px-8 h-14 rounded-xl shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 transition-shadow"
                    onClick={handleGetStarted}
                  >
                    <GraduationCap className="w-5 h-5 mr-2" />
                    Sign Up as Student
                  </Button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <Button size="lg" variant="outline" className="text-lg px-8 h-14 rounded-xl border-white/30 text-white hover:bg-white/10 hover:border-white/50 bg-transparent">
                    <ChefHat className="w-5 h-5 mr-2" />
                    Canteen Staff Login
                  </Button>
                </SignInButton>
                <button
                  onClick={() => navigate("/select-role?guest=true")}
                  className="text-white/50 hover:text-white/80 text-sm transition-colors underline underline-offset-4"
                >
                  Continue without login →
                </button>
              </>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto"
          >
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-black text-orange-400">{s.value}</div>
                <div className="text-sm text-white/50 mt-1">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <FoodStrip />

      <section className="py-24 px-4 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 bg-orange-500/20 text-orange-300 border-orange-500/30">Features</Badge>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-white">
            Everything your canteen needs
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto">
            From AI recommendations to 3D seat maps — we've built the future of campus dining.
          </p>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur hover:bg-white/8 hover:border-white/20 transition-all duration-200"
            >
              <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4 ${f.color}`}>
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-white">{f.title}</h3>
              <p className="text-white/50 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-24 bg-white/3 border-y border-white/10">
        <div className="px-4 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-orange-500/20 text-orange-300 border-orange-500/30">How it works</Badge>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-white">Order in 3 simple steps</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Browse & Add", desc: "Explore the AI-curated menu, filter by category, and add items to your cart.", icon: Utensils },
              { step: "02", title: "Reserve & Pay", desc: "Pick your seat in the interactive map, choose dine-in or parcel, then pay.", icon: MapPin },
              { step: "03", title: "Track & Enjoy", desc: "Watch your order status update live as the kitchen prepares your meal.", icon: Clock },
            ].map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-2xl gradient-orange flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
                  <step.icon className="w-8 h-8 text-white" />
                </div>
                <div className="text-5xl font-black text-orange-500/20 mb-2">{step.step}</div>
                <h3 className="text-xl font-bold mb-2 text-white">{step.title}</h3>
                <p className="text-white/50 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 bg-orange-500/20 text-orange-300 border-orange-500/30">Testimonials</Badge>
          <h2 className="text-4xl font-black tracking-tight mb-4 text-white">Loved by students & staff</h2>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl border border-white/10 bg-white/5"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-white/60 leading-relaxed mb-4 italic">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full gradient-orange flex items-center justify-center text-white font-bold text-sm">
                  {t.avatar}
                </div>
                <div>
                  <div className="font-semibold text-sm text-white">{t.name}</div>
                  <div className="text-white/40 text-xs">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-24 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center rounded-3xl gradient-orange p-16 shadow-2xl shadow-orange-500/20"
        >
          <h2 className="text-4xl font-black mb-4 text-white">Ready to transform your dining?</h2>
          <p className="text-white/80 text-lg mb-8">Join thousands of students enjoying smarter campus dining.</p>
          {isSignedIn ? (
            <Link href="/select-role">
              <Button size="lg" className="bg-white text-orange-600 hover:bg-white/90 text-lg px-8 h-14 rounded-xl font-bold">
                Open the App <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          ) : (
            <SignUpButton mode="modal">
              <Button size="lg" className="bg-white text-orange-600 hover:bg-white/90 text-lg px-8 h-14 rounded-xl font-bold">
                Get Started Free <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </SignUpButton>
          )}
        </motion.div>
      </section>

      <footer className="border-t border-white/10 py-8 px-4 bg-neutral-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg gradient-orange flex items-center justify-center">
              <Utensils className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-white/80">CanteenFlow AI</span>
          </div>
          <p className="text-sm text-white/30">© 2025 CanteenFlow AI. Built for campus dining.</p>
          <div className="flex items-center gap-2 text-sm text-white/30">
            <Shield className="w-4 h-4" />
            <span>Secured by Clerk</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
