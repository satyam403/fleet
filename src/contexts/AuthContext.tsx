import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'technician';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, role: 'admin' | 'technician') => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('fleetops-user');
    
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        console.log('✅ User restored from localStorage:', parsedUser);
      } catch (error) {
        console.error('❌ Error parsing saved user:', error);
        localStorage.removeItem('fleetops-user');
        localStorage.removeItem('fleetops-token');
        localStorage.removeItem('fleetops-refresh-token');
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch("http://localhost:8000/api/v1/users/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const contentType = response.headers.get("content-type");
      
      if (!contentType || !contentType.includes("application/json")) {
        console.error("❌ Server returned non-JSON response");
        return false;
      }

      const result = await response.json();

      if (!response.ok) {
        console.error("❌ Login failed:", result);
        return false;
      }
      
      const { data } = result;
      
      if (!data || !data.user || !data.accessToken) {
        console.error('❌ Invalid response structure:', result);
        return false;
      }

      localStorage.setItem("fleetops-token", data.accessToken);
      
      if (data.refreshToken) {
        localStorage.setItem("fleetops-refresh-token", data.refreshToken);
      }
      
      localStorage.setItem("fleetops-user", JSON.stringify(data.user));
      setUser(data.user);
      
      return true;
    } catch (error) {
      console.error("💥 Login error:", error);
      return false;
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: 'admin' | 'technician'
  ): Promise<boolean> => {
    try {
      const response = await fetch("http://localhost:8000/api/v1/users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password, role }),
      });

      const contentType = response.headers.get("content-type");
      
      if (!contentType || !contentType.includes("application/json")) {
        console.error("❌ Server returned non-JSON response");
        return false;
      }

      const result = await response.json();

      if (!response.ok) {
        console.error("❌ Registration failed:", result);
        return false;
      }
      
      const { data } = result;
      
      if (!data || !data.user || !data.accessToken) {
        console.error('❌ Invalid response structure:', result);
        return false;
      }
      
      localStorage.setItem("fleetops-token", data.accessToken);
      
      if (data.refreshToken) {
        localStorage.setItem("fleetops-refresh-token", data.refreshToken);
      }
      
      localStorage.setItem("fleetops-user", JSON.stringify(data.user));
      setUser(data.user);
      
      return true;
    } catch (error) {
      console.error("💥 Register error:", error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("fleetops-token");
    localStorage.removeItem("fleetops-refresh-token");
    localStorage.removeItem("fleetops-user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}