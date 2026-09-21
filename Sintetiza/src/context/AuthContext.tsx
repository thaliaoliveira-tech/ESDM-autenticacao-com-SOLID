import React, { createContext, useContext, useState, useEffect } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthContextData {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email?: string, password?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Simula verificação de token armazenado (ex: SecureStore / AsyncStorage)
    async function loadStorageData() {
      try {
        setIsLoading(true);
        // O usuário irá implementar a persistência aqui depois
      } finally {
        setIsLoading(false);
      }
    }

    loadStorageData();
  }, []);

  async function signIn(email?: string, password?: string) {
    setIsLoading(true);
    try {
      // Mock inicial de login - o usuário integrará com a API NestJS posteriormente
      const mockUser: User = {
        id: "1",
        name: "Usuário Sintetiza",
        email: email || "usuario@sintetiza.app",
      };
      setUser(mockUser);
      setToken("mock-jwt-token-sintetiza");
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    setIsLoading(true);
    try {
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider");
  }
  return context;
}

