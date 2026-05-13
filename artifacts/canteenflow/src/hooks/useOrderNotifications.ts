import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "./useCurrentUser";

const STATUS_MESSAGES: Record<string, { title: string; description: string }> = {
  cooking: {
    title: "Chef is cooking your order!",
    description: "Your meal is being freshly prepared.",
  },
  packaging: {
    title: "Order being packed up",
    description: "Almost ready — packaging your meal now.",
  },
  ready: {
    title: "Your order is ready!",
    description: "Come pick it up at the counter.",
  },
  collected: {
    title: "Order collected",
    description: "Enjoy your meal!",
  },
};

export function useOrderNotifications() {
  const { isSignedIn, getToken } = useAuth();
  const { appUser, isGuest } = useCurrentUser();
  const { toast } = useToast();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isSignedIn || !appUser || isGuest) return;

    let active = true;

    async function connect() {
      const token = await getToken();
      if (!active) return;

      const url = `/api/notifications/stream${token ? `?token=${encodeURIComponent(token)}` : ""}`;

      const es = new EventSource(url);
      esRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Existing order status updates
          if (data.type === "order_update" && appUser && data.userId === appUser.id) {
            const msg = STATUS_MESSAGES[data.status];
            if (msg) {
              toast({
                title: msg.title,
                description: `Order #${data.orderId} — ${msg.description}`,
              });
            }
          }

          // New: OTP sent by staff to this student
          if (data.type === "otp_sent" && appUser) {
            toast({
              title: "Your pickup OTP",
              description: `Order #${data.orderId} — show this code to staff: ${data.otp}`,
              duration: 60000, // keep visible for 60s
            });
            // Dispatch a custom DOM event so OrderTracker components can pick it up
            window.dispatchEvent(new CustomEvent("canteenflow:otp", {
              detail: { orderId: data.orderId, otp: data.otp, expiresAt: data.expiresAt },
            }));
          }
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        if (active) {
          setTimeout(connect, 5000);
        }
      };
    }

    connect();

    return () => {
      active = false;
      esRef.current?.close();
      esRef.current = null;
    };
  }, [isSignedIn, appUser?.id]);
}
