const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { authenticateToken } = require('../middleware/auth');
const { validateAIRequest } = require('../middleware/validation');
const { aiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Apply middleware to all AI routes
router.use(authenticateToken);
router.use(aiLimiter);

// Helper function to get AI model
const getModel = (modelName = 'gemini-pro') => {
  return genAI.getGenerativeModel({ model: modelName });
};

// Helper function to handle AI request with timeout and error handling
const makeAIRequest = async (model, prompt, options = {}) => {
  const timeout = options.timeout || 30000; // 30 seconds default
  
  return Promise.race([
    model.generateContent(prompt),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('AI request timeout')), timeout)
    )
  ]);
};

// @route   POST /api/ai/grammar-check
// @desc    Check grammar and style
// @access  Private
router.post('/grammar-check', validateAIRequest, async (req, res) => {
  try {
    const { text } = req.body;

    const model = getModel();
    const prompt = `Please analyze the following text for grammar, spelling, and style issues. Provide specific suggestions for improvement in JSON format with the following structure:
    {
      "corrections": [
        {
          "type": "grammar|spelling|style",
          "original": "original text",
          "suggestion": "corrected text",
          "explanation": "brief explanation",
          "position": { "start": 0, "end": 10 }
        }
      ],
      "overallScore": 85,
      "summary": "Brief summary of main issues"
    }

    Text to analyze: "${text}"`;

    const result = await makeAIRequest(model, prompt);
    const response = result.response.text();
    
    // Try to parse JSON response
    let aiResponse;
    try {
      aiResponse = JSON.parse(response.replace(/```json\n?|```\n?/g, ''));
    } catch (parseError) {
      // Fallback if JSON parsing fails
      aiResponse = {
        corrections: [],
        overallScore: 75,
        summary: response.substring(0, 200) + '...'
      };
    }

    res.status(200).json({
      success: true,
      data: {
        analysis: aiResponse,
        originalText: text,
        processingTime: Date.now()
      }
    });

  } catch (error) {
    console.error('Grammar check error:', error);
    res.status(500).json({
      success: false,
      message: error.message === 'AI request timeout' 
        ? 'AI request timed out. Please try again.' 
        : 'Error processing grammar check request'
    });
  }
});

// @route   POST /api/ai/enhance
// @desc    Enhance writing quality
// @access  Private
router.post('/enhance', validateAIRequest, async (req, res) => {
  try {
    const { text, options = {} } = req.body;
    const { tone = 'professional', length = 'medium' } = options;

    const model = getModel();
    const prompt = `Please enhance the following text to improve its clarity, readability, and impact. 
    Target tone: ${tone}
    Target length: ${length}
    
    Provide the enhanced version along with a brief explanation of changes made in JSON format:
    {
      "enhancedText": "enhanced version here",
      "changes": [
        {
          "type": "clarity|tone|structure|vocabulary",
          "description": "brief description of change"
        }
      ],
      "improvementSummary": "Overall summary of improvements made"
    }

    Original text: "${text}"`;

    const result = await makeAIRequest(model, prompt);
    const response = result.response.text();
    
    let aiResponse;
    try {
      aiResponse = JSON.parse(response.replace(/```json\n?|```\n?/g, ''));
    } catch (parseError) {
      aiResponse = {
        enhancedText: response,
        changes: [],
        improvementSummary: 'Text has been enhanced for better clarity and readability.'
      };
    }

    res.status(200).json({
      success: true,
      data: {
        enhancement: aiResponse,
        originalText: text,
        options: { tone, length }
      }
    });

  } catch (error) {
    console.error('Text enhancement error:', error);
    res.status(500).json({
      success: false,
      message: error.message === 'AI request timeout' 
        ? 'AI request timed out. Please try again.' 
        : 'Error processing text enhancement request'
    });
  }
});

// @route   POST /api/ai/summarize
// @desc    Summarize text content
// @access  Private
router.post('/summarize', validateAIRequest, async (req, res) => {
  try {
    const { text, options = {} } = req.body;
    const { length = 'medium', format = 'paragraph' } = options;

    const model = getModel();
    const lengthInstructions = {
      short: 'in 2-3 sentences',
      medium: 'in 1-2 paragraphs',
      long: 'in 3-4 detailed paragraphs'
    };

    const formatInstructions = {
      paragraph: 'as flowing paragraphs',
      bullets: 'as bullet points',
      numbered: 'as numbered points'
    };

    const prompt = `Please summarize the following text ${lengthInstructions[length]} ${formatInstructions[format]}. 
    Also provide key points and main themes in JSON format:
    {
      "summary": "your summary here",
      "keyPoints": ["point 1", "point 2", "point 3"],
      "mainThemes": ["theme 1", "theme 2"],
      "wordCount": {
        "original": 500,
        "summary": 100
      }
    }

    Text to summarize: "${text}"`;

    const result = await makeAIRequest(model, prompt);
    const response = result.response.text();
    
    let aiResponse;
    try {
      aiResponse = JSON.parse(response.replace(/```json\n?|```\n?/g, ''));
    } catch (parseError) {
      aiResponse = {
        summary: response,
        keyPoints: [],
        mainThemes: [],
        wordCount: { original: text.split(' ').length, summary: response.split(' ').length }
      };
    }

    res.status(200).json({
      success: true,
      data: {
        summarization: aiResponse,
        originalText: text,
        options: { length, format }
      }
    });

  } catch (error) {
    console.error('Text summarization error:', error);
    res.status(500).json({
      success: false,
      message: error.message === 'AI request timeout' 
        ? 'AI request timed out. Please try again.' 
        : 'Error processing summarization request'
    });
  }
});

// @route   POST /api/ai/complete
// @desc    Auto-complete text
// @access  Private
router.post('/complete', validateAIRequest, async (req, res) => {
  try {
    const { text, options = {} } = req.body;
    const { maxWords = 50, style = 'continue' } = options;

    const model = getModel();
    const styleInstructions = {
      continue: 'Continue the text naturally in the same style and tone',
      creative: 'Continue with creative and engaging language',
      formal: 'Continue in a formal, professional tone',
      casual: 'Continue in a casual, conversational tone'
    };

    const prompt = `${styleInstructions[style]}. Provide up to ${maxWords} words as completion. 
    Return the result in JSON format:
    {
      "completion": "your completion text here",
      "confidence": 85,
      "alternativeCompletions": ["alternative 1", "alternative 2"]
    }

    Text to complete: "${text}"`;

    const result = await makeAIRequest(model, prompt);
    const response = result.response.text();
    
    let aiResponse;
    try {
      aiResponse = JSON.parse(response.replace(/```json\n?|```\n?/g, ''));
    } catch (parseError) {
      aiResponse = {
        completion: response,
        confidence: 75,
        alternativeCompletions: []
      };
    }

    res.status(200).json({
      success: true,
      data: {
        completion: aiResponse,
        originalText: text,
        options: { maxWords, style }
      }
    });

  } catch (error) {
    console.error('Text completion error:', error);
    res.status(500).json({
      success: false,
      message: error.message === 'AI request timeout' 
        ? 'AI request timed out. Please try again.' 
        : 'Error processing completion request'
    });
  }
});

// @route   POST /api/ai/suggestions
// @desc    Get writing suggestions
// @access  Private
router.post('/suggestions', validateAIRequest, async (req, res) => {
  try {
    const { text, options = {} } = req.body;
    const { context = 'general', focus = 'all' } = options;

    const model = getModel();
    const prompt = `Analyze the following text and provide writing suggestions for improvement. 
    Context: ${context}
    Focus on: ${focus}
    
    Provide suggestions in JSON format:
    {
      "suggestions": [
        {
          "category": "structure|style|clarity|engagement|word_choice",
          "suggestion": "specific suggestion",
          "example": "example of improvement",
          "priority": "high|medium|low"
        }
      ],
      "overallAssessment": {
        "strengths": ["strength 1", "strength 2"],
        "areas_for_improvement": ["area 1", "area 2"],
        "readabilityScore": 75
      }
    }

    Text to analyze: "${text}"`;

    const result = await makeAIRequest(model, prompt);
    const response = result.response.text();
    
    let aiResponse;
    try {
      aiResponse = JSON.parse(response.replace(/```json\n?|```\n?/g, ''));
    } catch (parseError) {
      aiResponse = {
        suggestions: [{
          category: 'general',
          suggestion: response.substring(0, 200),
          example: '',
          priority: 'medium'
        }],
        overallAssessment: {
          strengths: [],
          areas_for_improvement: [],
          readabilityScore: 70
        }
      };
    }

    res.status(200).json({
      success: true,
      data: {
        analysis: aiResponse,
        originalText: text,
        options: { context, focus }
      }
    });

  } catch (error) {
    console.error('Writing suggestions error:', error);
    res.status(500).json({
      success: false,
      message: error.message === 'AI request timeout' 
        ? 'AI request timed out. Please try again.' 
        : 'Error processing suggestions request'
    });
  }
});

// @route   GET /api/ai/status
// @desc    Get AI service status
// @access  Private
router.get('/status', async (req, res) => {
  try {
    const model = getModel();
    
    // Simple test to check if AI is working
    const testResult = await makeAIRequest(model, 'Reply with just "OK" if you are working.');
    
    res.status(200).json({
      success: true,
      data: {
        status: 'operational',
        model: 'gemini-pro',
        lastChecked: new Date(),
        response: testResult.response.text()
      }
    });

  } catch (error) {
    console.error('AI status check error:', error);
    res.status(500).json({
      success: false,
      message: 'AI service is currently unavailable',
      data: {
        status: 'error',
        lastChecked: new Date(),
        error: error.message
      }
    });
  }
});

module.exports = router;