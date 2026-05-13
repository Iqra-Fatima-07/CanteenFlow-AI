import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@clerk/react";
import { useGetCanteenDashboard, useListActiveOrders, useUpdateOrderStatus } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Loader2, ChefHat, RefreshCw, TrendingUp, Users, IndianRupee, Clock, Package, Send, ShieldCheck, IdCard, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCanteenDashboardQueryKey, getListActiveOrdersQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { apiFetch } from "@/lib/api";

const STATUS_NEXT: Record<string, string> = {
  confirmed: "cooking",
  cooking: "packaging",
  packaging: "ready",
  ready: "collected",
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  cooking: "bg-orange-100 text-orange-700 border-orange-200",
  packaging: "bg-purple-100 text-purple-700 border-purple-200",
  ready: "bg-green-100 text-green-700 border-green-200",
  collected: "bg-gray-100 text-gray-600 border-gray-200",
};

const CHART_COLORS = ["#FF6B35", "#22c55e", "#8b5cf6", "#f59e0b", "#ef4444"];

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
      <div className="text-3xl font-black tracking-tight text-gradient">{value}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </motion.div>
  );
}

function IdCardModal({ orderId, orderName, onClose, token }: { orderId: number; orderName: string; onClose: () => void; token: string | null }) {
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useState(() => {
    apiFetch(`/orders/${orderId}/id-card`, {}, token)
      .then((data) => {
        setImageUrl(data?.imageUrl ?? null);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load ID card");
        setLoading(false);
      });
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold">ID Card</h3>
            <p className="text-xs text-muted-foreground">{orderName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-muted-foreground text-sm">{error}</div>
        ) : imageUrl ? (
          <img src={imageUrl} alt="Student ID Card" className="w-full rounded-xl border border-border object-contain max-h-64" />
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <IdCard className="w-10 h-10 mx-auto mb-2 opacity-40" />
            Student has not uploaded an ID card yet. Ask for physical ID.
          </div>
        )}
      </motion.div>
    </div>
  );
}

function OrderCard({ order, onAdvance, token }: { order: any; onAdvance: (id: number, status: string) => void; token: string | null }) {
  const items = Array.isArray(order.items) ? order.items : [];
  const nextStatus = STATUS_NEXT[order.status];
  const statusClass = STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600";
  const isReady = order.status === "ready";

  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [showIdCard, setShowIdCard] = useState(false);

  async function handleSendOtp() {
    setOtpSending(true);
    setOtpError(null);
    try {
      await apiFetch(`/orders/${order.id}/otp/send`, { method: "POST" }, token);
      setOtpSent(true);
    } catch (e: any) {
      setOtpError(e.message || "Failed to send OTP");
    } finally {
      setOtpSending(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otpInput.trim()) return;
    setVerifying(true);
    setOtpError(null);
    try {
      const res = await apiFetch(`/orders/${order.id}/otp/verify`, {
        method: "POST",
        body: JSON.stringify({ otp: otpInput.trim() }),
      }, token);
      if (res?.valid) {
        setOtpVerified(true);
        setOtpError(null);
      }
    } catch (e: any) {
      setOtpError(e.message || "Incorrect OTP");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <>
      {showIdCard && (
        <IdCardModal orderId={order.id} orderName={order.userName} onClose={() => setShowIdCard(false)} token={token} />
      )}
      <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="font-bold text-sm">Order #{order.id}</div>
            <div className="text-xs text-muted-foreground">{order.userName} · {order.type === "dine_in" ? "Dine In" : "Parcel"}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className={statusClass}>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</Badge>
            <span className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>

        <div className="space-y-1 mb-3">
          {items.map((item: any, i: number) => (
            <div key={i} className="text-xs text-muted-foreground flex justify-between">
              <span>{item.menuItemName} × {item.quantity}</span>
              <span>₹{(item.price * item.quantity).toFixed(0)}</span>
            </div>
          ))}
          <div className="text-sm font-bold flex justify-between pt-1 border-t border-border">
            <span>Total</span>
            <span className="text-primary">₹{order.totalAmount.toFixed(0)}</span>
          </div>
        </div>

        {/* Existing status advance button — unchanged */}
        {nextStatus && (
          <Button size="sm" className="w-full gradient-orange text-white border-0 text-xs mb-2" onClick={() => onAdvance(order.id, nextStatus)}>
            Mark as {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)} →
          </Button>
        )}

        {/* OTP + ID card verification — add-on layer, only shown when order is ready */}
        {isReady && (
          <div className="mt-2 space-y-2 border-t border-dashed border-border pt-2">
            <p className="text-xs font-medium text-muted-foreground">Verification (optional)</p>

            {otpVerified ? (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 rounded-xl px-3 py-2">
                <ShieldCheck className="w-4 h-4" /> OTP Verified — safe to collect
              </div>
            ) : (
              <>
                {!otpSent ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs flex items-center gap-1.5"
                    onClick={handleSendOtp}
                    disabled={otpSending}
                  >
                    {otpSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Send OTP to Student
                  </Button>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">Enter 4-digit OTP from student:</p>
                    <div className="flex gap-1.5">
                      <Input
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="0 0 0 0"
                        maxLength={4}
                        className="h-8 text-center font-mono text-base tracking-widest rounded-xl"
                      />
                      <Button
                        size="sm"
                        className="gradient-orange text-white border-0 px-3 text-xs"
                        onClick={handleVerifyOtp}
                        disabled={verifying || otpInput.length < 4}
                      >
                        {verifying ? <Loader2 className="w-3 h-3 animate-spin" /> : "Verify"}
                      </Button>
                    </div>
                    <button
                      onClick={handleSendOtp}
                      disabled={otpSending}
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                    >
                      Resend OTP
                    </button>
                  </div>
                )}

                {otpError && (
                  <p className="text-xs text-red-600">{otpError}</p>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs flex items-center gap-1.5"
                  onClick={() => setShowIdCard(true)}
                >
                  <IdCard className="w-3.5 h-3.5" /> View ID Card (fallback)
                </Button>
              </>
            )}
          </div>
        )}
      </motion.div>
    </>
  );
}

export default function DashboardPage() {
  const { isSignedIn, getToken } = useAuth();
  const { appUser, loading: userLoading } = useCurrentUser();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [token, setToken] = useState<string | null>(null);

  useState(() => {
    getToken().then((t) => setToken(t));
  });

  const { data: dashboard, isLoading: dashLoading } = useGetCanteenDashboard({ query: { enabled: isSignedIn } } as any);
  const { data: activeOrders = [], isLoading: ordersLoading } = useListActiveOrders({ query: { enabled: isSignedIn } } as any);
  const updateOrder = useUpdateOrderStatus();

  async function handleAdvance(orderId: number, status: string) {
    await updateOrder.mutateAsync({ id: orderId, data: { status: status as any } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetCanteenDashboardQueryKey() });
        qc.invalidateQueries({ queryKey: getListActiveOrdersQueryKey() });
      },
    });
  }

  if (userLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!isSignedIn || appUser?.role !== "canteen") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">🔐</div>
          <p className="font-semibold mb-2">Canteen staff access required</p>
          <p className="text-muted-foreground text-sm mb-4">Update your role to "canteen" in settings to access the dashboard.</p>
          <Link href="/"><Button variant="outline">Back to Home</Button></Link>
        </div>
      </div>
    );
  }

  const dash = dashboard as any;
  const orders = activeOrders as any[];
  const filteredOrders = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const topItemsChartData = dash?.topItems?.map((item: any) => ({ name: item.name.length > 12 ? item.name.slice(0, 12) + "…" : item.name, count: item.count })) || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <ChefHat className="w-5 h-5 text-primary" />
            <h1 className="font-black text-lg">Kitchen Dashboard</h1>
            <Badge className="bg-green-100 text-green-700 border-0 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block mr-1 status-pulse" />Live</Badge>
          </div>
          <Link href="/profile" className="text-sm text-muted-foreground hover:text-foreground">Profile</Link>
          <button onClick={() => { qc.invalidateQueries({ queryKey: getGetCanteenDashboardQueryKey() }); qc.invalidateQueries({ queryKey: getListActiveOrdersQueryKey() }); }} className="p-2 rounded-xl hover:bg-muted">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {dashLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />)}</div>
        ) : dash && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Package} label="Orders Today" value={dash.ordersToday} color="bg-blue-100 text-blue-600" />
            <StatCard icon={IndianRupee} label="Revenue Today" value={`₹${dash.revenueToday.toFixed(0)}`} color="bg-green-100 text-green-600" />
            <StatCard icon={Clock} label="Active Orders" value={dash.activeOrders} sub="right now" color="bg-orange-100 text-orange-600" />
            <StatCard icon={Users} label="Seats Occupied" value={`${dash.occupiedSeats}/${dash.totalSeats}`} color="bg-purple-100 text-purple-600" />
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500 status-pulse" />Active Orders ({orders.length})</h2>
              <div className="flex gap-1">{["all", "confirmed", "cooking", "packaging", "ready"].map((s) => (<button key={s} onClick={() => setFilter(s)} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filter === s ? "gradient-orange text-white" : "bg-muted hover:bg-muted/80"}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>))}</div>
            </div>
            {ordersLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground"><div className="text-4xl mb-2">🎉</div><p>No active orders</p></div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                <AnimatePresence>
                  {filteredOrders.map((order: any) => (
                    <OrderCard key={order.id} order={order} onAdvance={handleAdvance} token={token} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <h3 className="font-bold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Top Items Today</h3>
              {topItemsChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topItemsChartData} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v} orders`, "Count"]} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>{topItemsChartData.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">No orders yet today</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
