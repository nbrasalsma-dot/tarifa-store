/**
 * Shopping Cart Context with Real-time Sync
 * Secure, encrypted cart data with localStorage persistence
 */

"use client";

import { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";

// Types
export interface CartItem {
  id: string;
  productId: string;
  name: string;
  nameAr: string;
  price: number;
  originalPrice?: number;
  image: string;
  quantity: number;
  stock: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
  itemCount: number;
  discount: number;
}

interface CartState {
  cart: Cart;
  isLoading: boolean;
  lastUpdated: Date | null;
}

type CartAction =
  | { type: "SET_CART"; payload: Cart }
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: string }
  | { type: "UPDATE_QUANTITY"; payload: { productId: string; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "SET_LOADING"; payload: boolean };

// Initial state
const initialState: CartState = {
  cart: {
    items: [],
    total: 0,
    itemCount: 0,
    discount: 0,
  },
  isLoading: true,
  lastUpdated: null,
};

// Calculate cart totals
function calculateTotals(items: CartItem[]): { total: number; itemCount: number; discount: number } {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = items.reduce((sum, item) => {
    if (item.originalPrice && item.originalPrice > item.price) {
      return sum + (item.originalPrice - item.price) * item.quantity;
    }
    return sum;
  }, 0);
  return { total, itemCount, discount };
}

// Reducer
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "SET_CART": {
      return {
        ...state,
        cart: action.payload,
        isLoading: false,
        lastUpdated: new Date(),
      };
    }

    case "ADD_ITEM": {
      const existingIndex = state.cart.items.findIndex(
        (item) => item.productId === action.payload.productId
      );

      let newItems: CartItem[];

      if (existingIndex >= 0) {
        // Update quantity if item exists
        newItems = state.cart.items.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: Math.min(item.quantity + action.payload.quantity, item.stock) }
            : item
        );
      } else {
        // Add new item
        newItems = [...state.cart.items, action.payload];
      }

      const totals = calculateTotals(newItems);

      return {
        ...state,
        cart: { items: newItems, ...totals },
        lastUpdated: new Date(),
      };
    }

    case "REMOVE_ITEM": {
      const newItems = state.cart.items.filter((item) => item.productId !== action.payload);
      const totals = calculateTotals(newItems);

      return {
        ...state,
        cart: { items: newItems, ...totals },
        lastUpdated: new Date(),
      };
    }

    case "UPDATE_QUANTITY": {
      const newItems = state.cart.items.map((item) =>
        item.productId === action.payload.productId
          ? { ...item, quantity: Math.min(Math.max(action.payload.quantity, 1), item.stock) }
          : item
      );
      const totals = calculateTotals(newItems);

      return {
        ...state,
        cart: { items: newItems, ...totals },
        lastUpdated: new Date(),
      };
    }

    case "CLEAR_CART": {
      return {
        ...state,
        cart: { items: [], total: 0, itemCount: 0, discount: 0 },
        lastUpdated: new Date(),
      };
    }

    case "SET_LOADING": {
      return { ...state, isLoading: action.payload };
    }

    default:
      return state;
  }
}

// Context
interface CartContextType {
  state: CartState;
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  isInCart: (productId: string) => boolean;
  getItemQuantity: (productId: string) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);


function encryptData(data: string): string {
    const key = "tarifa-cart-secret-2024";
    let result = "";

    
    const encodedData = unescape(encodeURIComponent(data));

    for (let i = 0; i < encodedData.length; i++) {
        result += String.fromCharCode(encodedData.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(result);
}

function decryptData(encrypted: string): string {
    try {
        const key = "tarifa-cart-secret-2024";
        const data = atob(encrypted);
        let result = "";
        for (let i = 0; i < data.length; i++) {
            result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }

        return decodeURIComponent(escape(result));
    } catch {
        return "";
    }
}

// Provider
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const encryptedCart = localStorage.getItem("tarifa_cart");
      if (encryptedCart) {
        const decrypted = decryptData(encryptedCart);
        if (decrypted) {
          const savedCart = JSON.parse(decrypted);
          if (savedCart && savedCart.items) {
            dispatch({ type: "SET_CART", payload: savedCart });
          }
        }
      }
    } catch (error) {
      console.error("Error loading cart:", error);
    }
    dispatch({ type: "SET_LOADING", payload: false });
  }, []);

  // Save cart to localStorage on changes
  useEffect(() => {
    if (!state.isLoading && state.cart.items.length >= 0) {
      try {
        const encrypted = encryptData(JSON.stringify(state.cart));
        localStorage.setItem("tarifa_cart", encrypted);
      } catch (error) {
        console.error("Error saving cart:", error);
      }
    }
  }, [state.cart, state.isLoading]);

  // Actions
  const addItem = useCallback((item: Omit<CartItem, "id">) => {
    dispatch({
      type: "ADD_ITEM",
      payload: { ...item, id: `cart-${item.productId}-${Date.now()}` },
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: productId });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    dispatch({ type: "UPDATE_QUANTITY", payload: { productId, quantity } });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
    localStorage.removeItem("tarifa_cart");
  }, []);

  const isInCart = useCallback(
    (productId: string) => {
      return state.cart.items.some((item) => item.productId === productId);
    },
    [state.cart.items]
  );

  const getItemQuantity = useCallback(
    (productId: string) => {
      const item = state.cart.items.find((item) => item.productId === productId);
      return item?.quantity || 0;
    },
    [state.cart.items]
  );

  return (
    <CartContext.Provider
      value={{
        state,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        isInCart,
        getItemQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// Hook
export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
