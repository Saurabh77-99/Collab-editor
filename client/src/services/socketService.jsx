import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../hooks/useAuth';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [documentUsers, setDocumentUsers] = useState([]);
  const [aiProcessing, setAiProcessing] = useState(false);
  const { user, token } = useAuthStore();

  useEffect(() => {
    if (user && token) {
      const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
        withCredentials: true,
        autoConnect: true,
      });

      // Connection events
      newSocket.on('connect', () => {
        console.log('Connected to server');
        setIsConnected(true);
        
        // Authenticate the socket
        newSocket.emit('authenticate', { token });
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setIsConnected(false);
        setDocumentUsers([]);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        toast.error('Failed to connect to server');
      });

      // Authentication events
      newSocket.on('authenticated', (data) => {
        console.log('Socket authenticated:', data);
        toast.success('Connected successfully');
      });

      newSocket.on('authentication-error', (data) => {
        console.error('Authentication error:', data);
        toast.error('Authentication failed');
      });

      // Document collaboration events
      newSocket.on('user-joined', (data) => {
        setDocumentUsers(prev => [...prev.filter(u => u.id !== data.user.id), data.user]);
        toast.success(`${data.user.username} joined the document`);
      });

      newSocket.on('user-left', (data) => {
        setDocumentUsers(prev => prev.filter(u => u.id !== data.user.id));
        toast(`${data.user.username} left the document`);
      });

      newSocket.on('document-joined', (data) => {
        setDocumentUsers(data.activeUsers || []);
      });

      // AI events
      newSocket.on('ai-processing', (data) => {
        setAiProcessing(true);
        toast.loading(data.message, { id: 'ai-processing' });
      });

      newSocket.on('ai-suggestions-ready', (data) => {
        setAiProcessing(false);
        toast.dismiss('ai-processing');
        toast.success('AI suggestions ready');
      });

      newSocket.on('ai-error', (data) => {
        setAiProcessing(false);
        toast.dismiss('ai-processing');
        toast.error(data.message || 'AI request failed');
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user, token]);

  const socketAPI = {
    // Document operations
    joinDocument: (documentId) => {
      if (socket) {
        socket.emit('join-document', { documentId, token });
      }
    },

    leaveDocument: (documentId) => {
      if (socket) {
        socket.emit('leave-document', { documentId });
      }
    },

    sendTextChange: (documentId, delta, version) => {
      if (socket) {
        socket.emit('text-change', { documentId, delta, version });
      }
    },

    sendCursorMove: (documentId, cursor) => {
      if (socket) {
        socket.emit('cursor-move', { documentId, cursor });
      }
    },

    saveDocument: (documentId, content, title) => {
      if (socket) {
        socket.emit('save-document', { documentId, content, title });
      }
    },

    getDocumentStatus: (documentId) => {
      if (socket) {
        socket.emit('get-document-status', { documentId });
      }
    },

    // AI operations
    analyzeText: (text, analysisType, documentId) => {
      if (socket) {
        socket.emit('ai-analyze-text', { text, analysisType, documentId });
      }
    },

    completeText: (text, maxWords, documentId) => {
      if (socket) {
        socket.emit('ai-complete-text', { text, maxWords, documentId });
      }
    },

    applySuggestion: (documentId, suggestionType, appliedText) => {
      if (socket) {
        socket.emit('ai-suggestion-applied', { documentId, suggestionType, appliedText });
      }
    },

    // Event listeners
    on: (event, callback) => {
      if (socket) {
        socket.on(event, callback);
      }
    },

    off: (event, callback) => {
      if (socket) {
        socket.off(event, callback);
      }
    }
  };

  const value = {
    socket,
    isConnected,
    documentUsers,
    aiProcessing,
    ...socketAPI
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};