# Real-Time Collaborative Text Editor with AI Assistant

A feature-rich, Google Docs-like collaborative text editor built with the MERN stack, Socket.io, and powered by the Google Gemini API.

The application is fully developed and functional for local execution. The final step of deployment to AWS EC2 is pending.

## ✨ Key Features

* **🤝 Real-Time Multi-User Collaboration:** Multiple users can edit the same document simultaneously, with changes reflected instantly for all participants.
* **👀 Live Cursors & Presence:** See where other users are typing with live cursor tracking and view who is currently online and active in the document.
* **🔐 Secure User Authentication:** A robust login and registration system using JSON Web Tokens (JWT) with secure cookie-based session management.
* **📁 Comprehensive Document Management:**
  * Create, save (manual and auto-save), and manage documents.
  * Organize and view all your documents in a central dashboard.
  * Share documents with others using secure links and manage access permissions (owner, editor, viewer).
* **🤖 AI-Powered Writing Assistant (Google Gemini):**
  * **Grammar & Style Checker:** Get real-time suggestions to fix grammatical errors.
  * **Text Enhancement:** Improve the clarity, tone, and readability of your writing.
  * **Content Summarization:** Quickly generate summaries for selected text or entire documents.
  * **Smart Auto-completion:** Receive context-aware suggestions as you type.
* **🛡️ Security Focused:** Implemented with security best practices, including input sanitization to prevent XSS, API rate limiting, and secure environment variable management.

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React.js, Quill.js, Socket.io-client |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB with Mongoose |
| **Real-time** | Socket.io |
| **AI Integration** | Google Gemini API |
| **Authentication** | JSON Web Tokens (JWT), bcryptjs |
| **Testing** | Jest, Supertest |

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/[YOUR_USERNAME]/[YOUR_REPOSITORY_NAME].git
   cd [YOUR_REPOSITORY_NAME]
   ```

2. **Backend Setup:**
   ```bash
   cd server
   npm install
   ```

   Create a `.env` file in the `/server` directory and add the following environment variables:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRES_IN=1d
   GEMINI_API_KEY=your_google_gemini_api_key
   ```

3. **Frontend Setup:**
   ```bash
   cd ../client
   npm install
   ```

   Create a `.env` file in the `/client` directory and add the following variable:
   ```env
   REACT_APP_API_URL=http://localhost:5000
   ```

4. **Run the application:**
   * **Start the backend server:** From the `/server` directory, run:
     ```bash
     npm run dev
     ```
   * **Start the frontend client:** In a new terminal, from the `/client` directory, run:
     ```bash
     npm start
     ```

   The application should now be running on `http://localhost:3000`.

## 📂 Project Structure

The project is organized into a `client` and `server` monorepo structure, following the specified architecture.

```
├── server/
│   ├── config/         # Database, JWT, Gemini configuration
│   ├── models/         # User, Document, Permission models
│   ├── routes/         # API routes (auth, documents, AI)
│   ├── middleware/     # Authentication, rate limiting, validation
│   ├── services/       # Business logic (Gemini, document operations)
│   ├── websockets/     # Socket.io handlers
│   └── utils/          # Helper functions
└── client/
    └── src/
        ├── components/     # React components (Editor, AI Assistant, Auth)
        ├── hooks/          # Custom React hooks
        ├── services/       # API and socket services
        ├── utils/          # Utility functions
        └── App.js          # Main application component
```

## 📝 Environment Variables

### Server (.env)
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=1d
GEMINI_API_KEY=your_google_gemini_api_key
NODE_ENV=development
```

### Client (.env)
```env
REACT_APP_API_URL=http://localhost:5000
```

## 🔮 Future Improvements

While the core functionality is complete, the following steps are planned for the future:

* **☁️ AWS Deployment:**
  * Containerize the client and server applications using **Docker**.
  * Deploy to an **AWS EC2** instance.
  * Set up **Nginx** or a similar reverse proxy.
  * Configure a domain and enable HTTPS using **Let's Encrypt**.
  * Implement robust process management with **PM2**.
* **🧪 Enhanced Testing:** Add more comprehensive end-to-end and integration tests to ensure reliability.
* **💡 Advanced Conflict Resolution:** Explore implementing Operational Transformation (OT) or Conflict-free Replicated Data Types (CRDTs) for more complex collaboration scenarios.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 👨‍💻 Author

**Your Name**
- GitHub: [@SaurabhDavda](https://github.com/Saurabh77-99)
