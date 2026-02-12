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
    // Check if user is logged in
    const savedUser = localStorage.getItem('fleetops-user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

const login = async (email: string, password: string): Promise<boolean> => {
  try {
    const response = await fetch("http://localhost:8000//api/v1/users/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return false;
    }

    // ✅ Save token
    localStorage.setItem("fleetops-token", data.token);

    // ✅ Save user (without password)
    setUser(data.user);
    localStorage.setItem("fleetops-user", JSON.stringify(data.user));

    return true;

  } catch (error) {
    console.error("Login error:", error);
    return false;
  }
};


 const register = async (
  name: string,
  email: string,
  password: string,
  role: string
): Promise<boolean> => {
  try {
    const response = await fetch("http://localhost:8000/api/v1/users/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password, role }),
    });

    const data = await response.json();

    if (!response.ok) {
      return false;
    }

    localStorage.setItem("fleetops-token", data.token);
    localStorage.setItem("fleetops-user", JSON.stringify(data.user));
    setUser(data.user);

    return true;
  } catch (error) {
    console.error("Register error:", error);
    return false;
  }
};


  const logout = () => {
    setUser(null);
    localStorage.removeItem('fleetops-user');
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
