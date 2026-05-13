import { useAuth, useUser } from "@clerk/react";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export interface AppUser {
  id: number;
  clerkId: string;
  name: string;
  email: string;
  role: "student" | "canteen";
  createdAt: string;
  isGuest?: boolean;
}

function getGuestUser(): AppUser | null {
  if (typeof window === "undefined") return null;
  const isGuest = localStorage.getItem("canteenflow_guest") === "true";
  if (!isGuest) return null;
  const role = localStorage.getItem("canteenflow_guest_role");
  return {
    id: -1,
    clerkId: "guest",
    name: "Guest",
    email: "guest@canteenflow.local",
    role: role === "staff" ? "canteen" : "student",
    createdAt: new Date().toISOString(),
    isGuest: true,
  };
}

export function useCurrentUser() {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [appUser, setAppUser] = useState<AppUser | null>(() => getGuestUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const guestUser = getGuestUser();
    if (guestUser) {
      setAppUser(guestUser);
      setLoading(false);
      return;
    }
    if (!isSignedIn || !user) {
      setAppUser(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    getToken().then((token) => {
      return apiFetch("/users/me", {
        headers: {
          "x-clerk-user-name": user.fullName || user.username || "Student",
          "x-clerk-user-email": user.primaryEmailAddress?.emailAddress || "",
        },
      }, token);
    }).then((data) => {
      if (!cancelled) setAppUser(data);
    }).catch(console.error).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [isSignedIn, user]);

  const isStudent = appUser?.role === "student";
  const isCanteen = appUser?.role === "canteen";
  const isGuest = appUser?.isGuest ?? false;

  return { appUser, loading, isStudent, isCanteen, isGuest };
}
