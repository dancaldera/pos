import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { getCurrentUser, login as loginApi, logout as logoutApi } from '../api/auth';
import { AuthState, LoginCredentials, User } from '../types/auth';

// Define the initial auth state
const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: true,
  error: null,
};

// Define the auth context
type AuthContextType = {
  state: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth reducer for state management
type AuthAction =
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'AUTH_LOADED'; payload: User }
  | { type: 'AUTH_ERROR' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'AUTH_LOADED':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Authentication error',
      };
    default:
      return state;
  }
}

// Auth Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check user authentication on component mount
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        dispatch({ type: 'AUTH_ERROR' });
        return;
      }

      try {
        const response = await getCurrentUser();
        dispatch({ type: 'AUTH_LOADED', payload: response.data.user });
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        dispatch({ type: 'AUTH_ERROR' });
      }
    };

    loadUser();
  }, []);

  // Login function
  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await loginApi(credentials);
      const { user, token } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token },
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage,
      });
      throw new Error(errorMessage);
    }
  };

  // Logout function
  const logout = () => {
    logoutApi();
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{ state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};