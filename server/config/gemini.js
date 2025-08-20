const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiConfig {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required in environment variables');
    }
    
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.defaultModel = 'gemini-1.5-flash-latest';
    this.requestTimeout = parseInt(process.env.AI_REQUEST_TIMEOUT) || 30000;
    this.maxRequestsPerMinute = parseInt(process.env.MAX_AI_REQUESTS_PER_MINUTE) || 10;
  }

  getModel(modelName = this.defaultModel) {
    return this.genAI.getGenerativeModel({ model: modelName });
  }

  async testConnection() {
    try {
      const model = this.getModel();
      const result = await this.makeRequest(model, 'Say "Hello" if you are working correctly.');
      return {
        success: true,
        response: result.response.text(),
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  async makeRequest(model, prompt, options = {}) {
    const timeout = options.timeout || this.requestTimeout;
    
    return Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI request timeout')), timeout)
      )
    ]);
  }

  // Safety settings for content generation
  getSafetySettings() {
    return [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
    ];
  }
}

module.exports = new GeminiConfig();

