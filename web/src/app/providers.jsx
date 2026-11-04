import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { authRepo } from '../shared/data/repositories.js';

const AuthContext = createContext(null);
const ToastContext = createContext(() => {});

export function AppProviders({ children, queryClient }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [toastItems, setToastItems] = useState([]);
  const activity = useRef(0);

  const toast = useCallback((message, type = 'success') => {
    const id = crypto.randomUUID();
    setToastItems((items) => [...items, { id, message, type }]);
    setTimeout(() => setToastItems((items) => items.filter((item) => item.id !== id)), 3800);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setSession(await authRepo.getSession());
    } catch {
      setSession(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    activity.current = Date.now();
    Promise.resolve().then(refresh);
  }, [refresh]);

  const signIn = useCallback(
    async (credentials) => {
      const nextSession = await authRepo.signIn(credentials);
      setSession(nextSession);
      activity.current = Date.now();
      queryClient.clear();
      return nextSession;
    },
    [queryClient],
  );

  const updatePassword = useCallback(async (password) => {
    await authRepo.updatePassword(password);
    const updatedSession = await authRepo.getSession();
    setSession(updatedSession);
    return updatedSession;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authRepo.signOut();
    } finally {
      setSession(null);
      queryClient.clear();
    }
  }, [queryClient]);

  useEffect(() => {
    const touch = () => {
      activity.current = Date.now();
    };
    ['pointerdown', 'keydown', 'touchstart'].forEach((name) =>
      window.addEventListener(name, touch, { passive: true }),
    );
    const timer = setInterval(() => {
      if (session && Date.now() - activity.current > 30 * 60_000) {
        signOut();
        toast('La sesión terminó después de 30 minutos sin actividad.');
      }
    }, 30_000);
    return () => {
      ['pointerdown', 'keydown', 'touchstart'].forEach((name) =>
        window.removeEventListener(name, touch),
      );
      clearInterval(timer);
    };
  }, [session, signOut, toast]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user || null,
      ready,
      signIn,
      updatePassword,
      signOut,
      refresh,
    }),
    [session, ready, signIn, updatePassword, signOut, refresh],
  );

  return (
    <AuthContext.Provider value={value}>
      <ToastContext.Provider value={toast}>
        {children}
        <div className="toast-stack" aria-live="polite">
          {toastItems.map((item) => (
            <div key={item.id} className={`toast toast-${item.type}`} role="status">
              <span className="toast-mark">{item.type === 'error' ? '!' : '✓'}</span>
              {item.message}
            </div>
          ))}
        </div>
      </ToastContext.Provider>
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export const useToast = () => useContext(ToastContext);
