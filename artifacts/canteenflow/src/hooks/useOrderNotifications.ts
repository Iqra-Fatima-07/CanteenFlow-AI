import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "./useCurrentUser";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCanteenDashboardQueryKey, getListActiveOrdersQueryKey, getListOrdersQueryKey } from "@workspace/api-client-react";

const STATUS_MESSAGES: Record<string, { title: string; description: string }> = {
  confirmed: {
    title: "Order confirmed",
    description: "Your order has been received and is now in the queue.",
  },
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
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isSignedIn || !appUser || isGuest) return;

    let active = true;

    async function connect() {
      if (!active) return;

      const url = `/api/notifications/stream`;

      const es = new EventSource(url);
      esRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Order status updates
          if (data.type === "order_update" && appUser) {
            const isOwnOrder = data.userId === appUser.id;
            const isCanteen = appUser.role === "canteen";

            if (isCanteen) {
              // For canteen staff
              if (data.status === "confirmed") {
                toast({
                  title: "New order received!",
                  description: `Order #${data.orderId} from ${data.userName}`,
                });
              } else {
                toast({
                  title: "Order status updated",
                  description: `Order #${data.orderId} (${data.userName}) is now ${data.status}`,
                });
              }
              queryClient.invalidateQueries({ queryKey: getGetCanteenDashboardQueryKey() });
              queryClient.invalidateQueries({ queryKey: getListActiveOrdersQueryKey() });
            }

            if (isOwnOrder) {
              // Refresh the student's order list when their own order changes
              queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
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
  }, [isSignedIn, appUser?.id, appUser?.role, isGuest, getToken]);
}
