import { useMemo } from "react";
import { useGetMe, useListOrders } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, UserRound, IdCard, Phone, ReceiptText, CalendarClock, ShieldCheck } from "lucide-react";

function getStatusLabel(status: string) {
  switch (status) {
    case "confirmed": return "Pending";
    case "cooking": return "Preparing";
    case "packaging": return "Preparing";
    case "ready": return "Ready";
    case "collected": return "Collected";
    default: return status;
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case "confirmed": return "bg-blue-100 text-blue-700 border-blue-200";
    case "cooking": return "bg-orange-100 text-orange-700 border-orange-200";
    case "packaging": return "bg-purple-100 text-purple-700 border-purple-200";
    case "ready": return "bg-green-100 text-green-700 border-green-200";
    case "collected": return "bg-gray-100 text-gray-700 border-gray-200";
    default: return "bg-muted text-foreground";
  }
}

export default function ProfilePage() {
  const { appUser, loading: userLoading } = useCurrentUser();
  const { data: orders = [], isLoading: ordersLoading } = useListOrders({});
  const { data: me } = useGetMe();

  const summary = useMemo(() => {
    const items = Array.isArray(orders) ? orders : [];
    return {
      total: items.length,
      collected: items.filter((o: any) => o.status === "collected").length,
      active: items.filter((o: any) => o.status !== "collected").length,
    };
  }, [orders]);

  if (userLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!appUser) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="font-semibold mb-2">Profile unavailable</p>
          <Link href="/"><Button variant="outline">Back to Home</Button></Link>
        </div>
      </div>
    );
  }

  const idNumber = localStorage.getItem("canteenflow_id_number") || me?.email || "—";
  const phoneNumber = localStorage.getItem("canteenflow_phone") || "—";
  const roleLabel = appUser.role === "canteen" ? "Staff" : appUser.role === "student" ? "Student / Faculty" : appUser.role;
  const storedImage = localStorage.getItem("canteenflow_id_card_image");

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 glass border-b border-border/40 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/menu" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <span className="text-border">|</span>
          <h1 className="font-black text-lg flex-1">Profile</h1>
          <Link href="/orders" className="text-sm text-muted-foreground hover:text-foreground transition-colors">My Orders</Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <Card className="rounded-3xl border-border/60 shadow-sm overflow-hidden">
            <CardContent className="p-6 md:p-8 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Account</p>
                  <h2 className="text-2xl font-black tracking-tight">{appUser.name}</h2>
                </div>
                <Badge className="bg-orange-100 text-orange-700 border-orange-200 px-3 py-1.5">{roleLabel}</Badge>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <ProfileItem icon={UserRound} label="Name" value={appUser.name} />
                <ProfileItem icon={IdCard} label="ID Number" value={idNumber} />
                <ProfileItem icon={Phone} label="Phone Number" value={phoneNumber} />
                <ProfileItem icon={ShieldCheck} label="Role" value={roleLabel} />
              </div>

              <div className="rounded-2xl border border-dashed border-border/70 bg-muted/30 p-4">
                <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                  <ReceiptText className="w-4 h-4 text-primary" /> Uploaded ID Card Image
                </div>
                <div className="rounded-2xl overflow-hidden border border-border bg-black/5 min-h-56 relative flex items-center justify-center">
                  {storedImage ? (
                    <img src={storedImage} alt="Uploaded ID Card" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-sm text-muted-foreground text-center px-4">No ID card uploaded yet</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/60 shadow-sm">
            <CardContent className="p-6 md:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Order summary</p>
                  <h3 className="font-black text-xl">My Orders</h3>
                </div>
                <Badge variant="secondary">{summary.total} total</Badge>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <MiniStat label="Active" value={summary.active} />
                <MiniStat label="Done" value={summary.collected} />
                <MiniStat label="Total" value={summary.total} />
              </div>
              <div className="space-y-3 max-h-[28rem] overflow-auto pr-1">
                {ordersLoading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <CalendarClock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    No orders yet
                  </div>
                ) : (
                  (orders as any[]).map((order: any) => (
                    <div key={order.id} className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="font-bold">Order #{order.id}</div>
                          <div className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>
                        </div>
                        <Badge className={getStatusClass(order.status)}>{getStatusLabel(order.status)}</Badge>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        {(Array.isArray(order.items) ? order.items : []).map((item: any, i: number) => (
                          <div key={i} className="flex items-center justify-between gap-3 text-muted-foreground">
                            <span>{item.menuItemName} × {item.quantity}</span>
                            <span>₹{(item.price * item.quantity).toFixed(0)}</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-2 border-t border-border font-semibold">
                          <span>Total</span>
                          <span className="text-primary">₹{order.totalAmount.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function ProfileItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-2">
        <Icon className="w-3.5 h-3.5 text-primary" /> {label}
      </div>
      <div className="font-medium break-words">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 p-3 text-center">
      <div className="text-2xl font-black text-primary">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
