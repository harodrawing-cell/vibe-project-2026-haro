import { createContext, useContext, useEffect, useState } from 'react';
import account from '../services/account';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true, error: '' });
  useEffect(
    () =>
      account.subscribe(
        (user) => setState({ user, loading: false, error: '' }),
        (error) =>
          setState({ user: null, loading: false, error: error.message }),
      ),
    [],
  );
  return (
    <AuthContext.Provider value={{ ...state, account }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
