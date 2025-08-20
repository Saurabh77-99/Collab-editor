// src/components/Layout/Navbar.jsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Box,
  Chip,
  Tooltip
} from '@mui/material';
import {
  Description,
  AccountCircle,
  Logout,
  Dashboard,
  Settings
} from '@mui/icons-material';
import { useAuthStore } from '../../hooks/useAuth';
import { useSocket } from '../../services/socketService';

const Navbar = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const { user, logout } = useAuthStore();
  const { isConnected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    handleMenuClose();
  };

  const getPageTitle = () => {
    if (location.pathname === '/dashboard') return 'Dashboard';
    if (location.pathname.includes('/editor/')) return 'Editor';
    return 'Collaborative Editor';
  };

  return (
    <AppBar 
      position="sticky" 
      sx={{ 
        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}
    >
      <Toolbar>
        <Description sx={{ mr: 2 }} />
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            flexGrow: 1, 
            fontWeight: 600,
            cursor: 'pointer'
          }}
          onClick={() => navigate('/dashboard')}
        >
          {getPageTitle()}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Connection Status */}
          <Tooltip title={isConnected ? 'Connected' : 'Disconnected'}>
            <Chip
              label={isConnected ? 'Online' : 'Offline'}
              color={isConnected ? 'success' : 'error'}
              size="small"
              sx={{ 
                bgcolor: isConnected ? '#4caf50' : '#f44336',
                color: 'white'
              }}
            />
          </Tooltip>

          {/* Dashboard Button */}
          {location.pathname !== '/dashboard' && (
            <Button
              color="inherit"
              startIcon={<Dashboard />}
              onClick={() => navigate('/dashboard')}
              sx={{ 
                '&:hover': { 
                  bgcolor: 'rgba(255,255,255,0.1)' 
                }
              }}
            >
              Dashboard
            </Button>
          )}

          {/* User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user?.username}
            </Typography>
            <IconButton
              size="large"
              onClick={handleMenuOpen}
              color="inherit"
            >
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32,
                  bgcolor: 'rgba(255,255,255,0.2)'
                }}
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.username} />
                ) : (
                  <AccountCircle />
                )}
              </Avatar>
            </IconButton>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem onClick={() => { navigate('/dashboard'); handleMenuClose(); }}>
              <Dashboard sx={{ mr: 1 }} />
              Dashboard
            </MenuItem>
            <MenuItem onClick={handleMenuClose}>
              <Settings sx={{ mr: 1 }} />
              Settings
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;