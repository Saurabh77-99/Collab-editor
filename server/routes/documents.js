const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Document = require('../models/Document');
const Permission = require('../models/Permission');
const { authenticateToken } = require('../middleware/auth');
const { validateDocumentCreation } = require('../middleware/validation');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Helper function to check document permissions
const checkDocumentPermission = async (documentId, userId, requiredPermission = 'viewer') => {
  const document = await Document.findById(documentId).populate('owner', 'username email');
  
  if (!document) {
    throw new Error('Document not found');
  }

  // Owner has all permissions
  if (document.owner._id.toString() === userId.toString()) {
    return { document, role: 'owner', hasPermission: true };
  }

  // Check collaborators
  const collaborator = document.collaborators.find(
    collab => collab.user.toString() === userId.toString()
  );

  if (!collaborator) {
    return { document, role: null, hasPermission: false };
  }

  const permissions = {
    viewer: ['viewer', 'editor', 'owner'],
    editor: ['editor', 'owner'],
    owner: ['owner']
  };

  const hasPermission = permissions[requiredPermission].includes(collaborator.role);
  
  return { document, role: collaborator.role, hasPermission };
};

// @route   GET /api/documents
// @desc    Get user's documents
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', sortBy = 'lastModified', sortOrder = 'desc' } = req.query;
    
    const query = {
      $or: [
        { owner: req.user._id },
        { 'collaborators.user': req.user._id }
      ]
    };

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const documents = await Document.find(query)
      .populate('owner', 'username email avatar')
      .populate('collaborators.user', 'username email avatar')
      .populate('lastModifiedBy', 'username')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalDocuments = await Document.countDocuments(query);

    // Add user role for each document
    const documentsWithRole = documents.map(doc => {
      let userRole = 'viewer';
      
      if (doc.owner._id.toString() === req.user._id.toString()) {
        userRole = 'owner';
      } else {
        const collaborator = doc.collaborators.find(
          collab => collab.user._id.toString() === req.user._id.toString()
        );
        if (collaborator) {
          userRole = collaborator.role;
        }
      }

      return {
        ...doc.toObject(),
        userRole,
        canEdit: ['owner', 'editor'].includes(userRole)
      };
    });

    res.status(200).json({
      success: true,
      data: {
        documents: documentsWithRole,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalDocuments / limit),
          totalDocuments,
          hasNext: page < Math.ceil(totalDocuments / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching documents'
    });
  }
});

// @route   POST /api/documents
// @desc    Create new document
// @access  Private
router.post('/', validateDocumentCreation, async (req, res) => {
  try {
    const { title, content = { ops: [] } } = req.body;

    const document = new Document({
      title,
      content,
      owner: req.user._id,
      lastModifiedBy: req.user._id
    });

    await document.save();
    await document.populate('owner', 'username email avatar');

    res.status(201).json({
      success: true,
      message: 'Document created successfully',
      data: {
        document: {
          ...document.toObject(),
          userRole: 'owner',
          canEdit: true
        }
      }
    });

  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating document'
    });
  }
});

// @route   GET /api/documents/:id
// @desc    Get specific document
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const { document, role, hasPermission } = await checkDocumentPermission(
      req.params.id, 
      req.user._id, 
      'viewer'
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this document.'
      });
    }

    await document.populate('collaborators.user', 'username email avatar');

    res.status(200).json({
      success: true,
      data: {
        document: {
          ...document.toObject(),
          userRole: role,
          canEdit: ['owner', 'editor'].includes(role)
        }
      }
    });

  } catch (error) {
    console.error('Get document error:', error);
    if (error.message === 'Document not found') {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while fetching document'
    });
  }
});

// @route   PUT /api/documents/:id
// @desc    Update document
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const { document, role, hasPermission } = await checkDocumentPermission(
      req.params.id, 
      req.user._id, 
      'editor'
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to edit this document.'
      });
    }

    const { title, content } = req.body;
    const updateData = {
      lastModifiedBy: req.user._id,
      lastModified: new Date(),
      version: document.version + 1
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) {
      updateData.content = content;
      // Update metadata
      const textContent = content.ops?.map(op => op.insert || '').join('') || '';
      updateData['metadata.wordCount'] = textContent.split(/\s+/).filter(word => word.length > 0).length;
      updateData['metadata.characterCount'] = textContent.length;
    }

    const updatedDocument = await Document.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('owner', 'username email avatar')
     .populate('lastModifiedBy', 'username');

    res.status(200).json({
      success: true,
      message: 'Document updated successfully',
      data: {
        document: {
          ...updatedDocument.toObject(),
          userRole: role,
          canEdit: true
        }
      }
    });

  } catch (error) {
    console.error('Update document error:', error);
    if (error.message === 'Document not found') {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while updating document'
    });
  }
});

// @route   DELETE /api/documents/:id
// @desc    Delete document
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const { document, role, hasPermission } = await checkDocumentPermission(
      req.params.id, 
      req.user._id, 
      'owner'
    );

    if (!hasPermission || role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only document owners can delete documents.'
      });
    }

    await Document.findByIdAndDelete(req.params.id);
    await Permission.deleteMany({ document: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Delete document error:', error);
    if (error.message === 'Document not found') {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while deleting document'
    });
  }
});

// @route   POST /api/documents/:id/share
// @desc    Generate share link for document
// @access  Private
router.post('/:id/share', async (req, res) => {
  try {
    const { permissions = 'view', expiresIn = '7d' } = req.body;

    const { document, role, hasPermission } = await checkDocumentPermission(
      req.params.id, 
      req.user._id, 
      'editor'
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to share this document.'
      });
    }

    // Calculate expiration date
    const expiresAt = new Date();
    const timeMap = { '1h': 1, '1d': 24, '7d': 24 * 7, '30d': 24 * 30 };
    const hours = timeMap[expiresIn] || 24 * 7; // Default 7 days
    expiresAt.setHours(expiresAt.getHours() + hours);

    const shareToken = uuidv4();
    
    const updatedDocument = await Document.findByIdAndUpdate(
      req.params.id,
      {
        shareLink: {
          token: shareToken,
          expiresAt,
          permissions
        }
      },
      { new: true }
    );

    const shareUrl = `${process.env.CLIENT_URL}/shared/${shareToken}`;

    res.status(200).json({
      success: true,
      message: 'Share link generated successfully',
      data: {
        shareUrl,
        token: shareToken,
        permissions,
        expiresAt,
        expiresIn
      }
    });

  } catch (error) {
    console.error('Generate share link error:', error);
    if (error.message === 'Document not found') {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while generating share link'
    });
  }
});

// @route   POST /api/documents/:id/collaborators
// @desc    Add collaborator to document
// @access  Private
router.post('/:id/collaborators', async (req, res) => {
  try {
    const { email, role = 'viewer' } = req.body;

    const { document, role: userRole, hasPermission } = await checkDocumentPermission(
      req.params.id, 
      req.user._id, 
      'editor'
    );

    if (!hasPermission || !['owner', 'editor'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to add collaborators.'
      });
    }

    const User = require('../models/User');
    const collaboratorUser = await User.findOne({ email });

    if (!collaboratorUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found with the provided email'
      });
    }

    // Check if user is already a collaborator
    const existingCollaborator = document.collaborators.find(
      collab => collab.user.toString() === collaboratorUser._id.toString()
    );

    if (existingCollaborator) {
      return res.status(400).json({
        success: false,
        message: 'User is already a collaborator on this document'
      });
    }

    // Add collaborator
    document.collaborators.push({
      user: collaboratorUser._id,
      role,
      addedAt: new Date()
    });

    await document.save();
    await document.populate('collaborators.user', 'username email avatar');

    res.status(200).json({
      success: true,
      message: 'Collaborator added successfully',
      data: {
        collaborator: {
          user: collaboratorUser,
          role,
          addedAt: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Add collaborator error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding collaborator'
    });
  }
});

// @route   GET /api/documents/shared/:token
// @desc    Access document via share link
// @access  Public
router.get('/shared/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const document = await Document.findOne({
      'shareLink.token': token,
      'shareLink.expiresAt': { $gt: new Date() }
    })
    .populate('owner', 'username email avatar')
    .populate('collaborators.user', 'username email avatar');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired share link'
      });
    }

    // Remove sensitive data for public access
    const publicDocument = {
      _id: document._id,
      title: document.title,
      content: document.content,
      owner: document.owner,
      lastModified: document.lastModified,
      metadata: document.metadata,
      sharePermissions: document.shareLink.permissions,
      canEdit: document.shareLink.permissions === 'edit'
    };

    res.status(200).json({
      success: true,
      data: {
        document: publicDocument
      }
    });

  } catch (error) {
    console.error('Access shared document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while accessing shared document'
    });
  }
});

module.exports = router;