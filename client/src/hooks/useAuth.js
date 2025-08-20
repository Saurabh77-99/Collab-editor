// src/hooks/useAuth.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import apiService from '../services/apiService';
import toast from 'react-hot-toast';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      // Initialize auth state
      initializeAuth: async () => {
        set({ isLoading: true });
        try {
          const response = await apiService.getCurrentUser();
          if (response.success) {
            set({
              user: response.data.user,
              isAuthenticated: true,
              isLoading: false
            });
          } else {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false
            });
          }
        } catch (error) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false
          });
        }
      },

      // Login function
      login: async (credentials) => {
        set({ isLoading: true });
        try {
          const response = await apiService.login(credentials);
          if (response.success) {
            set({
              user: response.data.user,
              token: response.data.token,
              isAuthenticated: true,
              isLoading: false
            });
            toast.success('Login successful!');
            return { success: true };
          } else {
            set({ isLoading: false });
            toast.error(response.message || 'Login failed');
            return { success: false, message: response.message };
          }
        } catch (error) {
          set({ isLoading: false });
          const message = error.response?.data?.message || 'Login failed';
          toast.error(message);
          return { success: false, message };
        }
      },

      // Register function
      register: async (userData) => {
        set({ isLoading: true });
        try {
          const response = await apiService.register(userData);
          if (response.success) {
            set({
              user: response.data.user,
              token: response.data.token,
              isAuthenticated: true,
              isLoading: false
            });
            toast.success('Registration successful!');
            return { success: true };
          } else {
            set({ isLoading: false });
            toast.error(response.message || 'Registration failed');
            return { success: false, message: response.message };
          }
        } catch (error) {
          set({ isLoading: false });
          const message = error.response?.data?.message || 'Registration failed';
          toast.error(message);
          return { success: false, message };
        }
      },

      // Logout function
      logout: async () => {
        try {
          await apiService.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false
          });
          toast.success('Logged out successfully');
        }
      },

      // Update user
      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData }
        }));
      },

      // Clear auth state
      clearAuth: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false
        });
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);