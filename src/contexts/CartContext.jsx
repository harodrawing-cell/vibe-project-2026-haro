import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import shop from '../services/shop';
const CartContext = createContext(null);
export function CartProvider({ children }) {
  const [cart, setCart] = useState(null);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      setCart(await shop.getCart());
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const stop = shop.subscribe(refresh);
    const external = (event) => {
      if (!event.key || event.key === shop.STORAGE_KEY) void refresh();
    };
    window.addEventListener('storage', external);
    return () => {
      stop();
      window.removeEventListener('storage', external);
    };
  }, [refresh]);
  return (
    <CartContext.Provider value={{ cart, error, shop, refresh }}>
      {children}
    </CartContext.Provider>
  );
}
export const useCart = () => useContext(CartContext);
