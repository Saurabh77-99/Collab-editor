// src/components/Dashboard/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  TextField,
  InputAdornment,
  Fab,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import {
  Add,
  Search,
  MoreVert,
  Edit,
  Share,
  Delete,
  Description,
  Group,
  AccessTime,
  Person
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import apiService from '../../services/apiService';
import { useAuthStore } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDocuments({
        search: searchQuery,
        sortBy: 'lastModified',
        sortOrder: 'desc'
      });
      
      if (response.success) {
        setDocuments(response.data.documents);
      }
    } catch (error) {
      toast.error('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async (data) => {
    try {
      const response = await apiService.createDocument({
        title: data.title,
        content: { ops: [] }
      });
      
      if (response.success) {
        toast.success('Document created successfully');
        setCreateDialogOpen(false);
        reset();
        navigate(`/editor/${response.data.document._id}`);
      }
    } catch (error) {
      toast.error('Failed to create document');
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        const response = await apiService.deleteDocument(documentId);
        if (response.success) {
          toast.success('Document deleted successfully');
          fetchDocuments();
        }
      } catch (error) {
        toast.error('Failed to delete document');
      }
    }
    handleMenuClose();
  };

  const handleShareDocument = async (documentId) => {
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
    handleMenuClose();
  };

  const handleMenuOpen = (event, document) => {
    setMenuAnchor(event.currentTarget);
    setSelectedDocument(document);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedDocument(null);
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner': return 'primary';
      case 'editor': return 'secondary';
      case 'viewer': return 'default';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          My Documents
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Create and collaborate on documents with AI-powered assistance
        </Typography>
      </Box>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid>
            <TextField
              fullWidth
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreateDialogOpen(true)}
                sx={{
                  background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                }}
              >
                New Document
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Documents Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredDocuments.length === 0 ? (
            <Grid > {/* <-- FIX: The 'item' prop has been removed here */}
              <Paper sx={{ p: 6, textAlign: 'center' }}>
                <Description sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No documents found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {searchQuery ? 'Try adjusting your search query' : 'Create your first document to get started'}
                </Typography>
                {!searchQuery && (
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setCreateDialogOpen(true)}
                    sx={{
                      background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                    }}
                  >
                    Create Document
                  </Button>
                )}
              </Paper>
            </Grid>
          ) : (
            filteredDocuments.map((doc) => (
              <Grid key={doc._id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                    },
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate(`/editor/${doc._id}`)}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                        {doc.title}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMenuOpen(e, doc);
                        }}
                      >
                        <MoreVert />
                      </IconButton>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Chip
                        label={doc.userRole}
                        color={getRoleColor(doc.userRole)}
                        size="small"
                      />
                      {doc.collaborators?.length > 1 && (
                        <Chip
                          icon={<Group />}
                          label={`${doc.collaborators.length} collaborators`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {doc.metadata?.wordCount || 0} words • {doc.metadata?.characterCount || 0} characters
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24 }}>
                        <Person fontSize="small" />
                      </Avatar>
                      <Typography variant="caption" color="text.secondary">
                        by {doc.owner?.username}
                      </Typography>
                    </Box>
                  </CardContent>

                  <CardActions sx={{ pt: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%' }}>
                      <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(doc.lastModified), 'MMM dd, yyyy HH:mm')}
                      </Typography>
                    </Box>
                  </CardActions>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
        }}
        onClick={() => setCreateDialogOpen(true)}
      >
        <Add />
      </Fab>

      {/* Document Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem 
          onClick={() => {
            navigate(`/editor/${selectedDocument?._id}`);
            handleMenuClose();
          }}
        >
          <Edit sx={{ mr: 1 }} />
          Open
        </MenuItem>
        <MenuItem onClick={() => handleShareDocument(selectedDocument?._id)}>
          <Share sx={{ mr: 1 }} />
          Share
        </MenuItem>
        {selectedDocument?.userRole === 'owner' && (
          <MenuItem 
            onClick={() => handleDeleteDocument(selectedDocument?._id)}
            sx={{ color: 'error.main' }}
          >
            <Delete sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
      </Menu>

      {/* Create Document Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmit(handleCreateDocument)}>
          <DialogTitle>Create New Document</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Document Title"
              fullWidth
              variant="outlined"
              {...register('title', {
                required: 'Title is required',
                minLength: {
                  value: 1,
                  message: 'Title must be at least 1 character'
                },
                maxLength: {
                  value: 200,
                  message: 'Title cannot exceed 200 characters'
                }
              })}
              error={!!errors.title}
              helperText={errors.title?.message}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
              }}
            >
              Create
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default Dashboard;