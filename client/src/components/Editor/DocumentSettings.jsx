// src/components/Editor/DocumentSettings.jsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Divider
} from '@mui/material';
import {
  Delete,
  PersonAdd,
  Share,
  ContentCopy
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import apiService from '../../services/apiService';
import toast from 'react-hot-toast';

const DocumentSettings = ({ open, onClose, document, onUpdate }) => {
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [collaboratorRole, setCollaboratorRole] = useState('viewer');
  const [shareSettings, setShareSettings] = useState({
    permissions: 'view',
    expiresIn: '7d'
  });
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      title: document?.title || ''
    }
  });

  const handleAddCollaborator = async () => {
    if (!collaboratorEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.addCollaborator(document._id, {
        email: collaboratorEmail,
        role: collaboratorRole
      });

      if (response.success) {
        toast.success('Collaborator added successfully');
        setCollaboratorEmail('');
        // Refresh document data
        const updatedDoc = await apiService.getDocument(document._id);
        if (updatedDoc.success) {
          onUpdate(updatedDoc.data.document);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add collaborator');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateShareLink = async () => {
    try {
      setLoading(true);
      const response = await apiService.shareDocument(document._id, shareSettings);
      
      if (response.success) {
        navigator.clipboard.writeText(response.data.shareUrl);
        toast.success('Share link copied to clipboard!');
      }
    } catch (error) {
      toast.error('Failed to generate share link');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDocument = async (data) => {
    try {
      setLoading(true);
      const response = await apiService.updateDocument(document._id, {
        title: data.title
      });

      if (response.success) {
        toast.success('Document updated successfully');
        onUpdate(response.data.document);
        onClose();
      }
    } catch (error) {
      toast.error('Failed to update document');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner': return 'primary';
      case 'editor': return 'secondary';
      case 'viewer': return 'default';
      default: return 'default';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Document Settings</DialogTitle>
      <DialogContent>
        {/* Document Info */}
        <form onSubmit={handleSubmit(handleUpdateDocument)}>
          <TextField
            fullWidth
            label="Document Title"
            margin="normal"
            {...register('title', {
              required: 'Title is required',
              maxLength: {
                value: 200,
                message: 'Title cannot exceed 200 characters'
              }
            })}
            error={!!errors.title}
            helperText={errors.title?.message}
          />
        </form>

        <Box sx={{ mt: 2, mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Created: {new Date(document?.createdAt).toLocaleDateString()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last modified: {new Date(document?.lastModified).toLocaleDateString()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Version: {document?.version}
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Collaborators */}
        <Typography variant="h6" gutterBottom>
          Collaborators
        </Typography>

        {document?.userRole === 'owner' && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                size="small"
                placeholder="Enter email address"
                value={collaboratorEmail}
                onChange={(e) => setCollaboratorEmail(e.target.value)}
                sx={{ flex: 1 }}
              />
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <Select
                  value={collaboratorRole}
                  onChange={(e) => setCollaboratorRole(e.target.value)}
                >
                  <MenuItem value="viewer">Viewer</MenuItem>
                  <MenuItem value="editor">Editor</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="contained"
                onClick={handleAddCollaborator}
                disabled={loading}
                startIcon={<PersonAdd />}
              >
                Add
              </Button>
            </Box>
          </Box>
        )}

        <List>
          {/* Owner */}
          <ListItem>
            <ListItemText
              primary={document?.owner?.username}
              secondary={document?.owner?.email}
            />
            <Chip label="Owner" color="primary" size="small" />
          </ListItem>

          {/* Collaborators */}
          {document?.collaborators?.map((collaborator) => (
            <ListItem key={collaborator.user._id}>
              <ListItemText
                primary={collaborator.user.username}
                secondary={collaborator.user.email}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={collaborator.role}
                  color={getRoleColor(collaborator.role)}
                  size="small"
                />
                {document?.userRole === 'owner' && (
                  <IconButton size="small" color="error">
                    <Delete />
                  </IconButton>
                )}
              </Box>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 3 }} />

        {/* Share Settings */}
        <Typography variant="h6" gutterBottom>
          Share Settings
        </Typography>

        <Box sx={{ mb: 2 }}>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Share Permissions</InputLabel>
            <Select
              value={shareSettings.permissions}
              onChange={(e) => setShareSettings(prev => ({ ...prev, permissions: e.target.value }))}
              label="Share Permissions"
            >
              <MenuItem value="view">View Only</MenuItem>
              <MenuItem value="edit">View & Edit</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Link Expires In</InputLabel>
            <Select
              value={shareSettings.expiresIn}
              onChange={(e) => setShareSettings(prev => ({ ...prev, expiresIn: e.target.value }))}
              label="Link Expires In"
            >
              <MenuItem value="1h">1 Hour</MenuItem>
              <MenuItem value="1d">1 Day</MenuItem>
              <MenuItem value="7d">7 Days</MenuItem>
              <MenuItem value="30d">30 Days</MenuItem>
            </Select>
          </FormControl>

          <Button
            fullWidth
            variant="outlined"
            onClick={handleGenerateShareLink}
            disabled={loading}
            startIcon={<Share />}
          >
            Generate Share Link
          </Button>
        </Box>

        {document?.shareLink && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Current share link expires: {new Date(document.shareLink.expiresAt).toLocaleDateString()}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(handleUpdateDocument)}
          variant="contained"
          disabled={loading}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentSettings;