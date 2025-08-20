// websockets/aiHandler.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Authenticate socket connection
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

const aiSocketHandler = (socket, io) => {
  
  // Handle real-time AI text analysis
  socket.on('ai-analyze-text', async (data) => {
    try {
      const { text, analysisType, documentId, token } = data;
      
      // Authenticate if not already authenticated
      if (!socket.user && token) {
        await authenticateSocket(socket, token);
      }

      if (!socket.user) {
        socket.emit('ai-error', {
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      socket.emit('ai-processing', {
        status: 'processing',
        analysisType: analysisType,
        message: 'AI is analyzing your text...'
      });

      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      let prompt;

      switch (analysisType) {
        case 'grammar':
          prompt = `Analyze the following text for grammar and spelling errors. Provide specific corrections and suggestions in a clear, numbered format: "${text}"`;
          break;
        case 'style':
          prompt = `Analyze the writing style of the following text and suggest improvements for clarity, flow, and engagement: "${text}"`;
          break;
        case 'tone':
          prompt = `Analyze the tone of the following text and suggest adjustments to make it more appropriate for the intended audience: "${text}"`;
          break;
        case 'readability':
          prompt = `Analyze the readability of the following text and suggest ways to make it clearer and more accessible: "${text}"`;
          break;
        case 'structure':
          prompt = `Analyze the structure and organization of the following text and suggest improvements: "${text}"`;
          break;
        default:
          prompt = `Provide comprehensive writing feedback for the following text, including grammar, style, tone, and structure suggestions: "${text}"`;
      }

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      socket.emit('ai-suggestions-ready', {
        success: true,
        analysisType: analysisType,
        originalText: text,
        suggestions: response,
        timestamp: new Date(),
        documentId: documentId
      });

      // Optionally broadcast to document collaborators
      if (documentId) {
        socket.to(documentId).emit('ai-activity', {
          userId: socket.user._id,
          username: socket.user.username,
          activity: `Used AI for ${analysisType} analysis`,
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('AI analyze text error:', error);
      socket.emit('ai-error', {
        success: false,
        message: 'AI analysis failed. Please try again.',
        analysisType: data.analysisType,
        error: error.message
      });
    }
  });

  // Handle real-time text completion
  socket.on('ai-complete-text', async (data) => {
    try {
      const { text, maxWords = 20, documentId, token } = data;
      
      // Authenticate if not already authenticated
      if (!socket.user && token) {
        await authenticateSocket(socket, token);
      }

      if (!socket.user) {
        socket.emit('ai-error', {
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      socket.emit('ai-processing', {
        status: 'processing',
        analysisType: 'completion',
        message: 'AI is generating text completion...'
      });

      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const prompt = `Continue the following text naturally and coherently with approximately ${maxWords} words. Match the existing tone and style: "${text}"`;

      const result = await model.generateContent(prompt);
      const completion = result.response.text();

      // Trim completion to approximate word count
      const words = completion.split(' ');
      const trimmedCompletion = words.slice(0, maxWords).join(' ');

      socket.emit('ai-completion-ready', {
        success: true,
        originalText: text,
        completion: trimmedCompletion,
        fullCompletion: completion,
        timestamp: new Date(),
        documentId: documentId
      });

      // Broadcast activity to document collaborators
      if (documentId) {
        socket.to(documentId).emit('ai-activity', {
          userId: socket.user._id,
          username: socket.user.username,
          activity: 'Used AI text completion',
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('AI complete text error:', error);
      socket.emit('ai-error', {
        success: false,
        message: 'AI completion failed. Please try again.',
        analysisType: 'completion',
        error: error.message
      });
    }
  });

  // Handle AI content generation
  socket.on('ai-generate-content', async (data) => {
    try {
      const { prompt, contentType, length, documentId, token } = data;
      
      // Authenticate if not already authenticated
      if (!socket.user && token) {
        await authenticateSocket(socket, token);
      }

      if (!socket.user) {
        socket.emit('ai-error', {
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      socket.emit('ai-processing', {
        status: 'processing',
        analysisType: 'generation',
        message: 'AI is generating content...'
      });

      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      let fullPrompt;

      switch (contentType) {
        case 'paragraph':
          fullPrompt = `Write a well-structured paragraph about: ${prompt}. Length: ${length || 'medium'}.`;
          break;
        case 'outline':
          fullPrompt = `Create a detailed outline for: ${prompt}. Include main points and subpoints.`;
          break;
        case 'summary':
          fullPrompt = `Create a comprehensive summary of: ${prompt}. Make it ${length || 'medium'} length.`;
          break;
        case 'bullet-points':
          fullPrompt = `Create a list of bullet points about: ${prompt}. Make them clear and actionable.`;
          break;
        default:
          fullPrompt = `Generate content about: ${prompt}. Make it engaging and informative.`;
      }

      const result = await model.generateContent(fullPrompt);
      const generatedContent = result.response.text();

      socket.emit('ai-content-generated', {
        success: true,
        prompt: prompt,
        contentType: contentType,
        generatedContent: generatedContent,
        timestamp: new Date(),
        documentId: documentId
      });

      // Broadcast activity to document collaborators
      if (documentId) {
        socket.to(documentId).emit('ai-activity', {
          userId: socket.user._id,
          username: socket.user.username,
          activity: `Generated AI content (${contentType})`,
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('AI generate content error:', error);
      socket.emit('ai-error', {
        success: false,
        message: 'AI content generation failed. Please try again.',
        analysisType: 'generation',
        error: error.message
      });
    }
  });

  // Handle AI suggestion acceptance
  socket.on('ai-suggestion-applied', async (data) => {
    try {
      const { documentId, suggestionType, appliedText, originalText } = data;
      
      if (documentId && socket.user) {
        // Update user's AI usage stats (optional)
        await User.findByIdAndUpdate(socket.user._id, {
          $inc: { 'aiUsage.suggestionsApplied': 1 },
          'aiUsage.lastUsed': new Date()
        });

        // Notify other users in the document about AI suggestion usage
        socket.to(documentId).emit('ai-activity', {
          userId: socket.user._id,
          username: socket.user.username,
          activity: `Applied AI suggestion (${suggestionType})`,
          timestamp: new Date()
        });

        socket.emit('ai-suggestion-applied-success', {
          success: true,
          suggestionType: suggestionType,
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('AI suggestion applied error:', error);
      socket.emit('ai-error', {
        success: false,
        message: 'Failed to record AI suggestion usage'
      });
    }
  });

  // Handle AI feedback
  socket.on('ai-feedback', async (data) => {
    try {
      const { rating, feedback, analysisType, documentId } = data;
      
      if (!socket.user) {
        socket.emit('ai-error', {
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Log feedback for AI improvement (you can store this in database)
      console.log('AI Feedback received:', {
        userId: socket.user._id,
        username: socket.user.username,
        rating: rating,
        feedback: feedback,
        analysisType: analysisType,
        documentId: documentId,
        timestamp: new Date()
      });

      // You could save this to a Feedback collection in MongoDB
      // await Feedback.create({ userId: socket.user._id, rating, feedback, analysisType });

      socket.emit('ai-feedback-received', {
        success: true,
        message: 'Thank you for your feedback!'
      });

    } catch (error) {
      console.error('AI feedback error:', error);
      socket.emit('ai-error', {
        success: false,
        message: 'Failed to submit feedback'
      });
    }
  });

  // Handle AI preferences update
  socket.on('update-ai-preferences', async (data) => {
    try {
      const { preferences, token } = data;
      
      // Authenticate if not already authenticated
      if (!socket.user && token) {
        await authenticateSocket(socket, token);
      }

      if (!socket.user) {
        socket.emit('ai-error', {
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      await User.findByIdAndUpdate(socket.user._id, {
        aiPreferences: preferences
      });

      socket.emit('ai-preferences-updated', {
        success: true,
        preferences: preferences
      });

    } catch (error) {
      console.error('AI preferences update error:', error);
      socket.emit('ai-error', {
        success: false,
        message: 'Failed to update AI preferences'
      });
    }
  });

  // Handle getting AI usage statistics
  socket.on('get-ai-stats', async (data) => {
    try {
      const { token } = data;
      
      // Authenticate if not already authenticated
      if (!socket.user && token) {
        await authenticateSocket(socket, token);
      }

      if (!socket.user) {
        socket.emit('ai-error', {
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const user = await User.findById(socket.user._id).select('aiUsage aiPreferences');

      socket.emit('ai-stats', {
        success: true,
        stats: user.aiUsage || {
          suggestionsApplied: 0,
          totalRequests: 0,
          lastUsed: null
        },
        preferences: user.aiPreferences || {}
      });

    } catch (error) {
      console.error('Get AI stats error:', error);
      socket.emit('ai-error', {
        success: false,
        message: 'Failed to get AI statistics'
      });
    }
  });
};

module.exports = {
  aiSocketHandler
};