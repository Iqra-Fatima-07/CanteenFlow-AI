const GUEST_KEY = "canteenflow_guest";
const GUEST_ROLE_KEY = "canteenflow_guest_role";

export type GuestRole = "student" | "staff";

export function useGuestMode() {
  const isGuest = typeof window !== "undefined" && localStorage.getItem(GUEST_KEY) === "true";
  const guestRole = (typeof window !== "undefined" ? localStorage.getItem(GUEST_ROLE_KEY) : null) as GuestRole | null;

  function enterGuestMode(role: GuestRole) {
    localStorage.setItem(GUEST_KEY, "true");
    localStorage.setItem(GUEST_ROLE_KEY, role);
  }

  function exitGuestMode() {
    localStorage.removeItem(GUEST_KEY);
    localStorage.removeItem(GUEST_ROLE_KEY);
  }

  return { isGuest, guestRole, enterGuestMode, exitGuestMode };
}
