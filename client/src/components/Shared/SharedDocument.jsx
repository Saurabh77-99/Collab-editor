// src/components/Shared/SharedDocument.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Avatar
} from '@mui/material';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import apiService from '../../services/apiService';
import { format } from 'date-fns';

const SharedDocument = () => {
  const { token } = useParams();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSharedDocument();
  }, [token]);

  const loadSharedDocument = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSharedDocument(token);
      
      if (response.success) {
        setDocument(response.data.document);
      } else {
        setError(response.message || 'Document not found');
      }
    } catch (error) {
      setError('Failed to load shared document');
    } finally {
      setLoading(false);
    }
  };

  const quillModules = {
    toolbar: false // Read-only mode
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Document Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {document.title}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 32, height: 32 }}>
              {document.owner?.username?.charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="body2">
              by {document.owner?.username}
            </Typography>
          </Box>
          
          <Chip
            label={document.canEdit ? 'Editable' : 'Read Only'}
            color={document.canEdit ? 'success' : 'default'}
            size="small"
          />
        </Box>

        <Typography variant="body2" color="text.secondary">
          Last modified: {format(new Date(document.lastModified), 'MMM dd, yyyy HH:mm')}
        </Typography>
        
        {document.metadata && (
          <Typography variant="body2" color="text.secondary">
            {document.metadata.wordCount} words • {document.metadata.characterCount} characters
          </Typography>
        )}
      </Paper>

      {/* Document Content */}
      <Paper sx={{ p: 0, minHeight: '60vh' }}>
        <ReactQuill
          value={document.content}
          readOnly={!document.canEdit}
          theme="snow"
          modules={quillModules}
          style={{
            height: '60vh',
            border: 'none'
          }}
        />
      </Paper>

      {/* Footer */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Shared via Collaborative Editor
        </Typography>
      </Box>
    </Container>
  );
};

export default SharedDocument;