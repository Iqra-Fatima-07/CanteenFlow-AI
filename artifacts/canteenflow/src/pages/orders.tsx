import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@clerk/react";
import { useListOrders } from "@workspace/api-client-react";
import { apiFetch } from "@/lib/api";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ChefHat, Package, CheckCircle, Loader2, ArrowLeft, RefreshCw, KeyRound } from "lucide-react";

const STATUS_STEPS = [
  { key: "confirmed", label: "Confirmed", icon: CheckCircle, desc: "Order received" },
  { key: "cooking", label: "Cooking", icon: ChefHat, desc: "Chef is preparing" },
  { key: "packaging", label: "Packaging", icon: Package, desc: "Being packed up" },
  { key: "ready", label: "Ready!", icon: CheckCircle, desc: "Pick it up" },
  { key: "collected", label: "Collected", icon: CheckCircle, desc: "Enjoy your meal!" },
];

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-700",
  cooking: "bg-orange-100 text-orange-700",
  packaging: "bg-purple-100 text-purple-700",
  ready: "bg-green-100 text-green-700",
  collected: "bg-gray-100 text-gray-700",
};

// Module-level OTP map shared across renders (dispatch pushes here)
const otpMap = new Map<number, { otp: string; expiresAt: string }>();

function OrderTracker({ order }: { order: any }) {
  const currentIdx = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const items = Array.isArray(order.items) ? order.items : [];
  const [otpData, setOtpData] = useState<{ otp: string; expiresAt: string } | null>(
    otpMap.get(order.id) ?? null
  );

  // Listen for OTP events dispatched from the SSE hook
  useEffect(() => {
    function handleOtpEvent(e: Event) {
      const { orderId, otp, expiresAt } = (e as CustomEvent).detail;
      if (orderId === order.id) {
        otpMap.set(orderId, { otp, expiresAt });
        setOtpData({ otp, expiresAt });
      }
    }
    window.addEventListener("canteenflow:otp", handleOtpEvent);
    return () => window.removeEventListener("canteenflow:otp", handleOtpEvent);
  }, [order.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-5 shadow-sm"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold">Order #{order.id}</h3>
          <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge className={STATUS_COLORS[order.status] || "bg-gray-100 text-gray-700"}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Badge>
          <span className="text-xs text-muted-foreground">{order.type === "dine_in" ? "🍽️ Dine In" : "📦 Parcel"}</span>
        </div>
      </div>

      {/* Status tracker — unchanged */}
      {order.status !== "collected" && (
        <div className="mb-4">
          <div className="flex items-center gap-1 relative">
            {STATUS_STEPS.slice(0, -1).map((step, i) => {
              const isCompleted = i <= currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    isCompleted ? "gradient-orange text-white" : "bg-muted text-muted-foreground"
                  } ${isCurrent ? "ring-2 ring-primary/30 ring-offset-1" : ""}`}>
                    {isCurrent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <step.icon className="w-3.5 h-3.5" />}
                  </div>
                  {i < STATUS_STEPS.length - 2 && (
                    <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all ${i < currentIdx ? "bg-primary" : "bg-muted"}`} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-center">
            <span className="text-sm font-semibold text-primary">{STATUS_STEPS[currentIdx]?.desc}</span>
            {order.estimatedReadyAt && order.status !== "ready" && (
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1">
                <Clock className="w-3 h-3" />
                Ready by {new Date(order.estimatedReadyAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* OTP display — shown when staff sends OTP for a ready order */}
      {order.status === "ready" && otpData && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-2xl bg-orange-50 border border-orange-200 p-4"
        >
          <div className="flex items-center gap-2 mb-1 text-sm font-semibold text-orange-800">
            <KeyRound className="w-4 h-4" /> Pickup OTP — show to staff
          </div>
          <div className="text-4xl font-black tracking-widest text-primary text-center py-2 font-mono">
            {otpData.otp}
          </div>
          <p className="text-xs text-center text-orange-700/70">
            Expires at {new Date(otpData.expiresAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </motion.div>
      )}

      {/* Items — unchanged */}
      <div className="space-y-1.5">
        {items.map((item: any, i: number) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.menuItemName} × {item.quantity}</span>
            <span className="font-medium">₹{(item.price * item.quantity).toFixed(0)}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm font-bold pt-2 border-t border-border">
          <span>Total</span>
          <span className="text-gradient">₹{order.totalAmount.toFixed(0)}</span>
        </div>
      </div>

      {/* Payment badge — unchanged */}
      <div className="mt-3 flex items-center justify-between">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${order.paymentStatus === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
          {order.paymentStatus === "paid" ? "✓ Paid" : "⏳ Payment pending"}
        </span>
        <span className="text-xs text-muted-foreground">{order.paymentMethod === "cod" ? "Cash on delivery" : "Razorpay"}</span>
      </div>
    </motion.div>
  );
}

export default function OrdersPage() {
  const { isSignedIn, getToken } = useAuth();
  const { data: orders = [], isLoading, refetch } = useListOrders({});

  // Silently sync ID card URL to server so staff can view it
  useEffect(() => {
    const imageUrl = localStorage.getItem("canteenflow_id_card_image");
    if (!imageUrl || !isSignedIn) return;
    getToken().then((token) => {
      apiFetch("/users/me/id-card", {
        method: "PUT",
        body: JSON.stringify({ imageUrl }),
      }, token).catch(() => {/* silent — non-critical */});
    });
  }, [isSignedIn]);

  const active = (orders as any[]).filter((o) => !["collected"].includes(o.status));
  const past = (orders as any[]).filter((o) => o.status === "collected");

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">🔐</div>
          <p className="font-semibold mb-4">Please sign in to see your orders</p>
          <Link href="/"><Button>Back to Home</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/menu" className="font-bold text-sm text-muted-foreground hover:text-foreground transition-colors">← Menu</Link>
          <span className="text-border">|</span>
          <h1 className="font-black text-lg flex-1">My Orders</h1>
          <button onClick={() => refetch()} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🍽️</div>
            <h2 className="font-bold text-xl mb-2">No orders yet</h2>
            <p className="text-muted-foreground mb-6">Browse our menu and place your first order!</p>
            <Link href="/menu">
              <Button className="gradient-orange text-white border-0">Browse Menu</Button>
            </Link>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div>
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 status-pulse inline-block" />
                  Active Orders
                </h2>
                <div className="space-y-4">
                  {active.map((order: any) => <OrderTracker key={order.id} order={order} />)}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h2 className="font-bold text-lg mb-4 text-muted-foreground">Past Orders</h2>
                <div className="space-y-3">
                  {past.map((order: any) => <OrderTracker key={order.id} order={order} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
