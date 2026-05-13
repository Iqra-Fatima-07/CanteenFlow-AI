import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  isVeg: boolean;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (menuItemId: number) => void;
  updateQuantity: (menuItemId: number, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
  itemCount: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const existing = get().items.find((i) => i.menuItemId === item.menuItemId);
        if (existing) {
          set({ items: get().items.map((i) => i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + 1 } : i) });
        } else {
          set({ items: [...get().items, { ...item, quantity: 1 }] });
        }
      },
      removeItem: (id) => set({ items: get().items.filter((i) => i.menuItemId !== id) }),
      updateQuantity: (id, qty) => {
        if (qty <= 0) {
          set({ items: get().items.filter((i) => i.menuItemId !== id) });
        } else {
          set({ items: get().items.map((i) => i.menuItemId === id ? { ...i, quantity: qty } : i) });
        }
      },
      clearCart: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: "canteenflow-cart" },
  ),
);
