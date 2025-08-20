// websockets/documentHandler.js
const jwt = require('jsonwebtoken');
const Document = require('../models/Document');
const User = require('../models/User');

// Store active document sessions
const documentSessions = new Map();
const userSessions = new Map();

const authenticateSocket = async (socket, token) => {
  try {
    if (!token) throw new Error('No token provided');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) throw new Error('User not found');
    
    socket.user = user;
    return user;
  } catch (error) {
    throw new Error('Authentication failed');
  }
};

const checkDocumentAccess = async (documentId, userId) => {
  try {
    const document = await Document.findById(documentId);
    if (!document) return { hasAccess: false, role: null };

    // Check if user is owner
    if (document.owner.toString() === userId.toString()) {
      return { hasAccess: true, role: 'owner', document };
    }

    // Check if user is collaborator
    const collaborator = document.collaborators.find(
      collab => collab.user.toString() === userId.toString()
    );

    if (collaborator) {
      return { hasAccess: true, role: collaborator.role, document };
    }

    return { hasAccess: false, role: null, document: null };
  } catch (error) {
    return { hasAccess: false, role: null, document: null };
  }
};

const documentSocketHandler = (socket, io) => {
  
  // Handle user authentication
  socket.on('authenticate', async (data) => {
    try {
      const { token } = data;
      const user = await authenticateSocket(socket, token);
      
      socket.emit('authenticated', {
        success: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar
        }
      });

      // Update user online status
      await User.findByIdAndUpdate(user._id, {
        isOnline: true,
        lastActive: new Date()
      });

      userSessions.set(socket.id, {
        userId: user._id,
        username: user.username,
        avatar: user.avatar
      });

    } catch (error) {
      socket.emit('authentication-error', {
        success: false,
        message: error.message
      });
    }
  });

  // Handle joining a document
  socket.on('join-document', async (data) => {
    try {
      const { documentId, token } = data;
      
      if (!socket.user) {
        await authenticateSocket(socket, token);
      }

      const { hasAccess, role, document } = await checkDocumentAccess(documentId, socket.user._id);

      if (!hasAccess) {
        socket.emit('access-denied', {
          success: false,
          message: 'You do not have access to this document'
        });
        return;
      }

      // Join document room
      socket.join(documentId);
      
      // Initialize document session if not exists
      if (!documentSessions.has(documentId)) {
        documentSessions.set(documentId, {
          users: new Map(),
          document: document,
          lastSaved: new Date()
        });
      }

      const session = documentSessions.get(documentId);
      
      // Add user to document session
      session.users.set(socket.id, {
        userId: socket.user._id,
        username: socket.user.username,
        avatar: socket.user.avatar,
        role: role,
        cursor: null,
        lastActivity: new Date()
      });

      // Notify other users in the document
      socket.to(documentId).emit('user-joined', {
        user: {
          id: socket.user._id,
          username: socket.user.username,
          avatar: socket.user.avatar,
          role: role
        },
        timestamp: new Date()
      });

      // Send current document state and active users to the joining user
      const activeUsers = Array.from(session.users.values()).map(user => ({
        id: user.userId,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
        cursor: user.cursor
      }));

      socket.emit('document-joined', {
        success: true,
        document: {
          id: document._id,
          title: document.title,
          content: document.content,
          version: document.version,
          lastModified: document.lastModified
        },
        activeUsers: activeUsers,
        userRole: role
      });

    } catch (error) {
      console.error('Join document error:', error);
      socket.emit('join-error', {
        success: false,
        message: 'Failed to join document'
      });
    }
  });

  // Handle leaving a document
  socket.on('leave-document', (data) => {
    try {
      const { documentId } = data;
      
      if (documentSessions.has(documentId)) {
        const session = documentSessions.get(documentId);
        const user = session.users.get(socket.id);
        
        if (user) {
          // Remove user from document session
          session.users.delete(socket.id);
          
          // Notify other users
          socket.to(documentId).emit('user-left', {
            user: {
              id: user.userId,
              username: user.username
            },
            timestamp: new Date()
          });

          // Clean up empty sessions
          if (session.users.size === 0) {
            documentSessions.delete(documentId);
          }
        }
      }

      socket.leave(documentId);
      
      socket.emit('document-left', {
        success: true,
        documentId: documentId
      });

    } catch (error) {
      console.error('Leave document error:', error);
    }
  });

  // Handle text changes (collaborative editing)
  socket.on('text-change', async (data) => {
    try {
      const { documentId, delta, version } = data;

      if (!documentSessions.has(documentId)) {
        socket.emit('sync-error', {
          success: false,
          message: 'Document session not found'
        });
        return;
      }

      const session = documentSessions.get(documentId);
      const user = session.users.get(socket.id);

      if (!user || !['owner', 'editor'].includes(user.role)) {
        socket.emit('sync-error', {
          success: false,
          message: 'You do not have permission to edit this document'
        });
        return;
      }

      // Update user activity
      user.lastActivity = new Date();

      // Broadcast changes to other users in the document
      socket.to(documentId).emit('text-change', {
        delta: delta,
        version: version + 1,
        author: {
          id: user.userId,
          username: user.username
        },
        timestamp: new Date()
      });

      // Update document version
      session.document.version = version + 1;
      session.document.lastModified = new Date();

      socket.emit('change-acknowledged', {
        success: true,
        version: version + 1
      });

    } catch (error) {
      console.error('Text change error:', error);
      socket.emit('sync-error', {
        success: false,
        message: 'Failed to process text change'
      });
    }
  });

  // Handle cursor position updates
  socket.on('cursor-move', (data) => {
    try {
      const { documentId, cursor } = data;

      if (!documentSessions.has(documentId)) return;

      const session = documentSessions.get(documentId);
      const user = session.users.get(socket.id);

      if (user) {
        user.cursor = cursor;
        
        // Broadcast cursor position to other users
        socket.to(documentId).emit('cursor-move', {
          userId: user.userId,
          username: user.username,
          cursor: cursor,
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('Cursor move error:', error);
    }
  });

  // Handle document save
  socket.on('save-document', async (data) => {
    try {
      const { documentId, content, title } = data;

      if (!documentSessions.has(documentId)) {
        socket.emit('save-error', {
          success: false,
          message: 'Document session not found'
        });
        return;
      }

      const session = documentSessions.get(documentId);
      const user = session.users.get(socket.id);

      if (!user || !['owner', 'editor'].includes(user.role)) {
        socket.emit('save-error', {
          success: false,
          message: 'You do not have permission to save this document'
        });
        return;
      }

      // Update document in database
      const updateData = {
        lastModified: new Date(),
        lastModifiedBy: user.userId,
        version: session.document.version
      };

      if (content !== undefined) updateData.content = content;
      if (title !== undefined) updateData.title = title;

      const updatedDocument = await Document.findByIdAndUpdate(
        documentId,
        updateData,
        { new: true }
      );

      if (!updatedDocument) {
        socket.emit('save-error', {
          success: false,
          message: 'Document not found'
        });
        return;
      }

      // Update session
      session.document = updatedDocument;
      session.lastSaved = new Date();

      // Notify all users in the document
      io.to(documentId).emit('document-saved', {
        success: true,
        document: {
          id: updatedDocument._id,
          title: updatedDocument.title,
          version: updatedDocument.version,
          lastModified: updatedDocument.lastModified
        },
        savedBy: {
          id: user.userId,
          username: user.username
        },
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Save document error:', error);
      socket.emit('save-error', {
        success: false,
        message: 'Failed to save document'
      });
    }
  });

  // Handle getting document status
  socket.on('get-document-status', (data) => {
    try {
      const { documentId } = data;

      if (!documentSessions.has(documentId)) {
        socket.emit('document-status', {
          success: false,
          message: 'Document session not found'
        });
        return;
      }

      const session = documentSessions.get(documentId);
      const activeUsers = Array.from(session.users.values()).map(user => ({
        id: user.userId,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
        cursor: user.cursor,
        lastActivity: user.lastActivity
      }));

      socket.emit('document-status', {
        success: true,
        documentId: documentId,
        version: session.document.version,
        lastSaved: session.lastSaved,
        activeUsers: activeUsers,
        userCount: session.users.size
      });

    } catch (error) {
      console.error('Get document status error:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    try {
      const userSession = userSessions.get(socket.id);
      
      if (userSession) {
        // Update user offline status
        await User.findByIdAndUpdate(userSession.userId, {
          isOnline: false,
          lastActive: new Date()
        });

        // Remove user from all document sessions
        for (const [documentId, session] of documentSessions.entries()) {
          if (session.users.has(socket.id)) {
            const user = session.users.get(socket.id);
            session.users.delete(socket.id);

            // Notify other users in the document
            socket.to(documentId).emit('user-left', {
              user: {
                id: user.userId,
                username: user.username
              },
              timestamp: new Date()
            });

            // Clean up empty sessions
            if (session.users.size === 0) {
              documentSessions.delete(documentId);
            }
          }
        }

        userSessions.delete(socket.id);
      }

    } catch (error) {
      console.error('Disconnect error:', error);
    }
  });
};

module.exports = {
  documentSocketHandler,
};