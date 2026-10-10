import { createContext, useContext, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  const addToCart = (medicine) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === medicine.id);
      if (existing) {
        return prev.map((i) =>
          i.id === medicine.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { ...medicine, qty: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQty = (id, qty) => {
    if (qty <= 0) return removeFromCart(id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  const requiresPrescription = items.some((i) => i.requires_prescription);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQty,
        clearCart,
        totalItems,
        totalPrice,
        requiresPrescription,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart ต้องถูกใช้ภายใน <CartProvider>");
  return ctx;
}
