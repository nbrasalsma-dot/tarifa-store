/**
 * Wishlist (Favorites) Context
 * Persistent favorites with localStorage
 */

"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

// Types
export interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  nameAr: string;
  price: number;
  originalPrice?: number;
  image: string;
  addedAt: Date;
}

interface WishlistState {
  items: WishlistItem[];
  itemCount: number;
}

// Context
interface WishlistContextType {
  state: WishlistState;
  addItem: (item: Omit<WishlistItem, "id" | "addedAt">) => void;
  removeItem: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  toggleItem: (item: Omit<WishlistItem, "id" | "addedAt">) => void;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

// Provider
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WishlistState>({
    items: [],
    itemCount: 0,
  });

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tarifa_wishlist");
      if (saved) {
        const items = JSON.parse(saved);
        // Use a ref to avoid the warning, or delay the state update
        setTimeout(() => {
          setState({ items, itemCount: items.length });
        }, 0);
      }
    } catch (error) {
      console.error("Error loading wishlist:", error);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("tarifa_wishlist", JSON.stringify(state.items));
  }, [state.items]);

  // Add item
  const addItem = useCallback((item: Omit<WishlistItem, "id" | "addedAt">) => {
    setState((prev) => {
      if (prev.items.some((i) => i.productId === item.productId)) {
        return prev;
      }
      const newItem: WishlistItem = {
        ...item,
        id: `wish-${item.productId}-${Date.now()}`,
        addedAt: new Date(),
      };
      return {
        items: [newItem, ...prev.items],
        itemCount: prev.itemCount + 1,
      };
    });
  }, []);

  // Remove item
  const removeItem = useCallback((productId: string) => {
    setState((prev) => ({
      items: prev.items.filter((i) => i.productId !== productId),
      itemCount: Math.max(0, prev.itemCount - 1),
    }));
  }, []);

  // Check if in wishlist
  const isInWishlist = useCallback(
    (productId: string) => {
      return state.items.some((i) => i.productId === productId);
    },
    [state.items]
  );

  // Toggle item
  const toggleItem = useCallback((item: Omit<WishlistItem, "id" | "addedAt">) => {
    if (isInWishlist(item.productId)) {
      removeItem(item.productId);
    } else {
      addItem(item);
    }
  }, [isInWishlist, addItem, removeItem]);

  // Clear all
  const clearWishlist = useCallback(() => {
    setState({ items: [], itemCount: 0 });
    localStorage.removeItem("tarifa_wishlist");
  }, []);

  return (
    <WishlistContext.Provider
      value={{
        state,
        addItem,
        removeItem,
        isInWishlist,
        toggleItem,
        clearWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

// Hook
export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
