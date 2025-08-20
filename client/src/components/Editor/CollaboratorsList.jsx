// src/components/Editor/CollaboratorsList.jsx
import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Badge
} from '@mui/material';
import { Circle } from '@mui/icons-material';

const CollaboratorsList = ({ documentUsers, document }) => {
  const getRoleColor = (role) => {
    switch (role) {
      case 'owner': return 'primary';
      case 'editor': return 'secondary';
      case 'viewer': return 'default';
      default: return 'default';
    }
  };

  const getStatusColor = (isOnline) => {
    return isOnline ? '#4caf50' : '#bdbdbd';
  };

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Active Collaborators ({documentUsers.length})
      </Typography>
      
      {documentUsers.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No active collaborators
        </Typography>
      ) : (
        <List>
          {documentUsers.map((user) => (
            <ListItem key={user.id} sx={{ px: 0 }}>
              <ListItemAvatar>
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  badgeContent={
                    <Circle
                      sx={{
                        color: getStatusColor(true),
                        fontSize: 12
                      }}
                    />
                  }
                >
                  <Avatar
                    sx={{
                      bgcolor: `hsl(${user.id?.slice(-6) || '000000'}, 60%, 60%)`,
                      width: 40,
                      height: 40
                    }}
                  >
                    {user.username?.charAt(0).toUpperCase()}
                  </Avatar>
                </Badge>
              </ListItemAvatar>
              <ListItemText
                primary={user.username}
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Chip
                      label={user.role}
                      color={getRoleColor(user.role)}
                      size="small"
                    />
                    <Typography variant="caption" color="text.secondary">
                      Online
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default CollaboratorsList;