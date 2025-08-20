import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './hooks/useAuth';
import { SocketProvider } from './services/socketService';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import Editor from './components/Editor/Editor';
import SharedDocument from './components/Shared/SharedDocument';
import Navbar from './components/Layout/Navbar';
import ProtectedRoute from './components/Auth/ProtectedRoute';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

function App() {
  const { user, isLoading, initializeAuth } = useAuthStore();

  React.useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (isLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          minHeight="100vh"
          bgcolor="background.default"
        >
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span>Loading...</span>
          </div>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SocketProvider>
        <Router>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {user && <Navbar />}
            
            <Box component="main" sx={{ flexGrow: 1 }}>
              <Routes>
                {/* Public Routes */}
                <Route 
                  path="/login" 
                  element={user ? <Navigate to="/dashboard" /> : <Login />} 
                />
                <Route 
                  path="/register" 
                  element={user ? <Navigate to="/dashboard" /> : <Register />} 
                />
                <Route 
                  path="/shared/:token" 
                  element={<SharedDocument />} 
                />

                {/* Protected Routes */}
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/editor/:documentId" 
                  element={
                    <ProtectedRoute>
                      <Editor />
                    </ProtectedRoute>
                  } 
                />

                {/* Default Route */}
                <Route 
                  path="/" 
                  element={
                    user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
                  } 
                />
                
                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Box>
          </Box>

          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                theme: {
                  primary: '#4aed88',
                },
              },
              error: {
                duration: 5000,
                theme: {
                  primary: '#ff4b4b',
                },
              },
            }}
          />
        </Router>
      </SocketProvider>
    </ThemeProvider>
  );
}

export default App;