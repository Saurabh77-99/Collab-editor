// src/components/Editor/Editor.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Divider,
  Chip,
  Avatar,
  Tooltip,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Save,
  Share,
  Group,
  Settings,
  AutoAwesome,
  MoreVert
} from '@mui/icons-material';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { debounce } from 'lodash';
import { useSocket } from '../../services/socketService';
import { useAuthStore } from '../../hooks/useAuth';
import apiService from '../../services/apiService';
import AIAssistant from './AIAssistant';
import CollaboratorsList from './CollaboratorsList';
import DocumentSettings from './DocumentSettings';
import toast from 'react-hot-toast';

const Editor = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    socket,
    isConnected,
    documentUsers,
    joinDocument,
    leaveDocument,
    sendTextChange,
    sendCursorMove,
    saveDocument,
    on,
    off
  } = useSocket();

  const [document, setDocument] = useState(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showAI, setShowAI] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);

  const quillRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Load document on mount
  useEffect(() => {
    loadDocument();
    return () => {
      if (documentId) {
        leaveDocument(documentId);
      }
    };
  }, [documentId]);

  // Join document when socket is ready
  useEffect(() => {
    if (socket && isConnected && documentId && document) {
      joinDocument(documentId);
    }
  }, [socket, isConnected, documentId, document]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleTextChange = (data) => {
      if (quillRef.current) {
        const quill = quillRef.current.getEditor();
        quill.updateContents(data.delta, 'api');
      }
    };

    const handleDocumentSaved = (data) => {
      setSaving(false);
      setLastSaved(new Date());
      toast.success(`Document saved by ${data.savedBy.username}`);
    };

    const handleCursorMove = (data) => {
      // Handle other users' cursor positions
      console.log('Cursor moved:', data);
    };

    on('text-change', handleTextChange);
    on('document-saved', handleDocumentSaved);
    on('cursor-move', handleCursorMove);

    return () => {
      off('text-change', handleTextChange);
      off('document-saved', handleDocumentSaved);
      off('cursor-move', handleCursorMove);
    };
  }, [socket, on, off]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDocument(documentId);
      
      if (response.success) {
        setDocument(response.data.document);
        setTitle(response.data.document.title);
        
        // Convert document content to HTML for Quill
        const quillContent = response.data.document.content;
        if (quillContent && quillContent.ops) {
          setContent(quillContent);
        }
      } else {
        toast.error('Document not found');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error('Failed to load document');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Auto-save functionality
  const debouncedSave = useCallback(
    debounce(async (documentId, content, title) => {
      try {
        setSaving(true);
        const response = await apiService.updateDocument(documentId, {
          content,
          title
        });
        
        if (response.success) {
          setLastSaved(new Date());
          // Also save via socket for real-time updates
          saveDocument(documentId, content, title);
        }
      } catch (error) {
        toast.error('Auto-save failed');
      } finally {
        setSaving(false);
      }
    }, 2000),
    []
  );

  const handleContentChange = (value, delta, source, editor) => {
    if (source === 'user') {
      const newContent = editor.getContents();
      setContent(newContent);
      
      // Send changes to other users
      if (socket && isConnected) {
        sendTextChange(documentId, delta, document?.version || 1);
      }
      
      // Auto-save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        debouncedSave(documentId, newContent, title);
      }, 30000); // Auto-save every 30 seconds
    }
  };

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    debouncedSave(documentId, content, newTitle);
  };

  const handleManualSave = async () => {
    try {
      setSaving(true);
      const response = await apiService.updateDocument(documentId, {
        content,
        title
      });
      
      if (response.success) {
        setLastSaved(new Date());
        saveDocument(documentId, content, title);
        toast.success('Document saved');
      }
    } catch (error) {
      toast.error('Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      const response = await apiService.shareDocument(documentId, {
        permissions: 'view',
        expiresIn: '7d'
      });
      
      if (response.success) {
        navigator.clipboard.writeText(response.data.shareUrl);
        toast.success('Share link copied to clipboard!');
      }
    } catch (error) {
      toast.error('Failed to generate share link');
    }
    setMenuAnchor(null);
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['blockquote', 'code-block'],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ]
  };

  const quillFormats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'script', 'indent', 'blockquote',
    'code-block', 'align', 'link', 'image'
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!document) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h6" color="error">
          Document not found
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            <TextField
              value={title}
              onChange={handleTitleChange}
              variant="outlined"
              size="small"
              placeholder="Document title..."
              sx={{ 
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  fontSize: '1.25rem',
                  fontWeight: 600
                }
              }}
            />
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {saving && <CircularProgress size={16} />}
              <Typography variant="caption" color="text.secondary">
                {saving ? 'Saving...' : lastSaved ? `Saved ${format(lastSaved, 'HH:mm')}` : 'Not saved'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Active Users */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {documentUsers.slice(0, 3).map((user, index) => (
                <Tooltip key={user.id} title={`${user.username} (${user.role})`}>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      fontSize: '0.75rem',
                      bgcolor: `hsl(${user.id.slice(-6)}, 60%, 60%)`
                    }}
                  >
                    {user.username.charAt(0).toUpperCase()}
                  </Avatar>
                </Tooltip>
              ))}
              {documentUsers.length > 3 && (
                <Chip
                  label={`+${documentUsers.length - 3}`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>

            {/* Action Buttons */}
            <Button
              variant="outlined"
              startIcon={<Save />}
              onClick={handleManualSave}
              disabled={saving}
              size="small"
            >
              Save
            </Button>

            <Button
              variant="outlined"
              startIcon={<AutoAwesome />}
              onClick={() => setShowAI(!showAI)}
              size="small"
              color={showAI ? 'primary' : 'inherit'}
            >
              AI Assistant
            </Button>

            <IconButton
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              size="small"
            >
              <MoreVert />
            </IconButton>

            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
            >
              <MenuItem onClick={handleShare}>
                <Share sx={{ mr: 1 }} />
                Share Document
              </MenuItem>
              <MenuItem onClick={() => setShowSettings(true)}>
                <Settings sx={{ mr: 1 }} />
                Settings
              </MenuItem>
              <MenuItem onClick={() => navigate('/dashboard')}>
                <Group sx={{ mr: 1 }} />
                Back to Dashboard
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        {/* Document Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
          <Chip
            label={document.userRole}
            color={document.userRole === 'owner' ? 'primary' : 'secondary'}
            size="small"
          />
          <Typography variant="caption" color="text.secondary">
            {documentUsers.length} {documentUsers.length === 1 ? 'user' : 'users'} editing
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Version {document.version}
          </Typography>
        </Box>
      </Paper>

      {/* Main Editor Area */}
      <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 200px)' }}>
        {/* Editor */}
        <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={content}
            onChange={handleContentChange}
            modules={quillModules}
            formats={quillFormats}
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
            className="editor-container"
          />
        </Paper>

        {/* AI Assistant Sidebar */}
        {showAI && (
          <Paper sx={{ width: 350, p: 2 }}>
            <AIAssistant
              documentId={documentId}
              selectedText=""
              onClose={() => setShowAI(false)}
            />
          </Paper>
        )}
      </Box>

      {/* Document Settings Dialog */}
      <DocumentSettings
        open={showSettings}
        onClose={() => setShowSettings(false)}
        document={document}
        onUpdate={(updatedDoc) => setDocument(updatedDoc)}
      />
    </Container>
  );
};

export default Editor;