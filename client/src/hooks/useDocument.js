// src/hooks/useDocument.js
import { create } from 'zustand';
import apiService from '../services/apiService';
import toast from 'react-hot-toast';

export const useDocumentStore = create((set, get) => ({
  documents: [],
  currentDocument: null,
  loading: false,
  lastSaved: null,

  // Fetch all documents
  fetchDocuments: async (params = {}) => {
    set({ loading: true });
    try {
      const response = await apiService.getDocuments(params);
      if (response.success) {
        set({ documents: response.data.documents });
        return response.data;
      }
    } catch (error) {
      toast.error('Failed to fetch documents');
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Create new document
  createDocument: async (documentData) => {
    try {
      const response = await apiService.createDocument(documentData);
      if (response.success) {
        set(state => ({
          documents: [response.data.document, ...state.documents]
        }));
        toast.success('Document created successfully');
        return response.data.document;
      }
    } catch (error) {
      toast.error('Failed to create document');
      throw error;
    }
  },

  // Get single document
  getDocument: async (documentId) => {
    set({ loading: true });
    try {
      const response = await apiService.getDocument(documentId);
      if (response.success) {
        set({ currentDocument: response.data.document });
        return response.data.document;
      }
    } catch (error) {
      toast.error('Failed to load document');
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Update document
  updateDocument: async (documentId, updateData) => {
    try {
      const response = await apiService.updateDocument(documentId, updateData);
      if (response.success) {
        const updatedDoc = response.data.document;
        
        // Update in documents list
        set(state => ({
          documents: state.documents.map(doc => 
            doc._id === documentId ? updatedDoc : doc
          ),
          currentDocument: state.currentDocument?._id === documentId ? updatedDoc : state.currentDocument,
          lastSaved: new Date()
        }));
        
        return updatedDoc;
      }
    } catch (error) {
      toast.error('Failed to update document');
      throw error;
    }
  },

  // Delete document
  deleteDocument: async (documentId) => {
    try {
      const response = await apiService.deleteDocument(documentId);
      if (response.success) {
        set(state => ({
          documents: state.documents.filter(doc => doc._id !== documentId),
          currentDocument: state.currentDocument?._id === documentId ? null : state.currentDocument
        }));
        toast.success('Document deleted successfully');
        return true;
      }
    } catch (error) {
      toast.error('Failed to delete document');
      throw error;
    }
  },

  // Share document
  shareDocument: async (documentId, shareOptions) => {
    try {
      const response = await apiService.shareDocument(documentId, shareOptions);
      if (response.success) {
        return response.data;
      }
    } catch (error) {
      toast.error('Failed to share document');
      throw error;
    }
  },

  // Set current document
  setCurrentDocument: (document) => {
    set({ currentDocument: document });
  },

  // Clear current document
  clearCurrentDocument: () => {
    set({ currentDocument: null });
  },

  // Update last saved time
  updateLastSaved: () => {
    set({ lastSaved: new Date() });
  }
}));