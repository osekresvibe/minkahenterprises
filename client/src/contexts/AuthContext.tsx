import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { auth, logOut, onAuthChange, initError } from "@/lib/firebase";
import type { User as FirebaseUser } from "firebase/auth";
import type { User } from "@shared/schema";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authError: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(initError?.message || null);

  useEffect(() => {
    if (initError) {
      console.error("Firebase initialization failed:", initError);
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthChange(async (fbUser) => {
      setFirebaseUser(fbUser);
      
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          const response = await fetch("/api/auth/firebase", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${idToken}`,
            },
            credentials: "include",
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setAuthError(null);
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error("Error syncing with backend:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await logOut();
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        isLoading,
        isAuthenticated: !!user,
        authError,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useFirebaseAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useFirebaseAuth must be used within an AuthProvider");
  }
  return context;
}
