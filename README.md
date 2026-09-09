# Production-Ready AI-Powered MERN Web Application

A full-stack, production-grade MERN (MongoDB, Express.js, React.js, Node.js) web application integrated with **Google Gemini 2.5 Flash API**. Features secure JWT authentication, password hashing with bcryptjs, user profile management, interactive AI technical assistant workspace, and persistent prompt interaction history stored in MongoDB.

---

## 1. Project Title
**GeminiAI Technical Interview & Prompt Platform (MERN + AI)**

---

## 2. Project Description
This application provides software engineers and tech candidates with an interactive AI-powered coaching and query platform. Powered by Google Gemini AI, users can ask technical interview questions, request code reviews, explore system design concepts, and receive immediate actionable answers. All prompt interactions are securely saved to MongoDB for future reference and searchability.

---

## 3. Features
- **User Authentication**: User registration, login, logout with JWT bearer tokens & bcrypt password hashing.
- **Secure Backend API Proxy**: Google Gemini API key is isolated on the Node.js backend to prevent client-side credential exposure.
- **AI Workspace**: Interactive prompt interface with category selection (Interview Prep, Code Review, Technical Q&A, Career Advice, System Design), real-time loading state, and copy-to-clipboard functionality.
- **AI Prompt History**: Persisted interaction history in MongoDB with category filtering, keyword searching, single-item deletion, and full history cleanup.
- **User Profile Security**: View and edit user profile details (Name, Email) and change passwords with current password validation.
- **Personal Dashboard**: Analytics summary showcasing total AI interactions, active JWT session status, member join date, and recent history feed.
- **Modern Responsive Glassmorphic UI**: High-contrast, dark-mode design system with micro-animations, loading spinners, and dismissible notification alerts.
- **Robust Error Handling**: Global Express error middleware handling invalid tokens, duplicate emails, Mongoose validation errors, and Gemini API rate limits.

---

## 4. Technologies Used
- **Frontend**: React.js (v19), Vite, React Router (v7), Axios, Lucide React Icons, Vanilla CSS (Design System Tokens).
- **Backend**: Node.js, Express.js (v5), Cors, Dotenv, JsonWebToken, BcryptJS.
- **Database**: MongoDB & Mongoose ORM.
- **AI Integration**: `@google/genai` (Google Gemini 2.5 Flash Model).

---

## 5. Architecture

```text
┌─────────────────────────┐         HTTP/REST         ┌─────────────────────────┐
│     React + Vite        │  ◄─────────────────────►  │     Node + Express      │
│     Frontend UI         │   Authorization: Bearer   │       Backend API       │
└─────────────────────────┘                           └────────────┬────────────┘
                                                                   │
                                           ┌───────────────────────┴───────────────────────┐
                                           │                                               │
                                           ▼                                               ▼
                               ┌───────────────────────┐                       ┌───────────────────────┐
                               │  Google Gemini API    │                       │   MongoDB Database    │
                               │  (AI Generation)      │                       │  (Users & History)    │
                               └───────────────────────┘                       └───────────────────────┘
```

---

## 6. Folder Structure

```text
AI-MERN-Application/
├── package.json                   # Workspace scripts & dependencies
├── .env.example                   # Master environment variable template
├── .gitignore                     # Git rules for build outputs & secrets
├── README.md                      # Complete project documentation
├── create-zip.js                  # Automated zip packager script
│
├── server/                        # Node.js + Express Backend
│   ├── config/                    # Database connection setup
│   ├── controllers/               # Auth, User, AI, and History logic
│   ├── middleware/                # JWT auth and error handling
│   ├── models/                    # Mongoose User & AIHistory schemas
│   ├── routes/                    # Express REST route definitions
│   ├── services/                  # Gemini AI API integration service
│   ├── server.js                  # Express entry point
│   ├── package.json               # Backend dependencies
│   └── .env.example               # Backend env template
│
└── client/                        # React + Vite Frontend
    ├── src/
    │   ├── components/            # Navbar, Sidebar, ProtectedRoute, Modals
    │   ├── context/               # AuthContext state management
    │   ├── pages/                 # Home, Login, Register, Dashboard, AI, History, Profile, 404
    │   ├── services/              # Axios API clients
    │   ├── App.jsx                # Router & View Layout
    │   ├── main.jsx               # React DOM render
    │   └── index.css              # Glassmorphic Design System
    ├── package.json               # Frontend dependencies
    └── vite.config.js             # Vite proxy settings
```

---

## 7. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Active MongoDB database URI (MongoDB Atlas or local `mongodb://localhost:27017`)
- **Google Gemini API Key**: Valid API Key from [Google AI Studio](https://aistudio.google.com/)

---

## 8. Installation

1. Clone or extract project repository:
```bash
cd ai-interview-platform
```

2. Install backend dependencies:
```bash
cd server
npm install
cd ..
```

3. Install frontend dependencies:
```bash
cd client
npm install
cd ..
```

---

## 9. Environment Variables
Create a `.env` file inside the `server/` directory:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/ai_mern_db
JWT_SECRET=your_super_secret_jwt_key_here
GEMINI_API_KEY=your_google_gemini_api_key_here
PORT=5000
```

---

## 10. MongoDB Setup
- You can use local MongoDB (`mongodb://localhost:27017/ai_mern_app`) or MongoDB Atlas Cloud.
- Ensure your connection URI string is placed in `server/.env`.
- Collections (`users` and `aihistories`) will automatically be initialized upon first user registration and AI prompt generation.

---

## 11. Gemini API Setup
1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Create an API key for your project.
3. Paste key into `server/.env` under `GEMINI_API_KEY=`.

---

## 12. Backend Setup
To run backend independently:
```bash
cd server
npm start
```
Backend will start on `http://localhost:5000`.

---

## 13. Frontend Setup
To run frontend independently:
```bash
cd client
npm run dev
```
Frontend dev server will start on `http://localhost:5173`.

---

## 14. How to Run (Concurrent Dev Mode)
From root workspace folder, execute:
```bash
npm run dev
```
Or start both `server` and `client` in separate terminals.

---

## 15. REST API Documentation

### Auth APIs (`/api/auth`)
- `POST /api/auth/register` - Create user account. Body: `{ name, email, password }`
- `POST /api/auth/login` - Authenticate user. Body: `{ email, password }`
- `GET /api/auth/me` - Get current session user. Header: `Authorization: Bearer <token>`

### User APIs (`/api/users`)
- `GET /api/users/profile` - Fetch user profile data (Protected)
- `PUT /api/users/profile` - Update name, email, or password (Protected)

### AI Service APIs (`/api/ai`)
- `POST /api/ai/generate` - Generate Gemini AI answer & save history. Body: `{ prompt, category }` (Protected)

### History APIs (`/api/history`)
- `GET /api/history` - Fetch user's saved prompt history. Query params: `category`, `search` (Protected)
- `DELETE /api/history/:id` - Delete single prompt record (Protected)
- `DELETE /api/history` - Purge all prompt history for logged-in user (Protected)

---

## 16. Authentication Flow
1. User registers or logs in via frontend form.
2. Backend verifies credentials and signs a JWT token using `JWT_SECRET` (valid 30 days).
3. JWT token is returned to client and saved in `localStorage`.
4. Centralized Axios interceptor (`api.js`) automatically attaches `Authorization: Bearer <token>` to protected endpoints.
5. On app load, `AuthContext` verifies session against `GET /api/auth/me`.

---

## 17. AI Integration Explanation
All Gemini AI generation requests are executed server-side via `server/services/geminiService.js`. When a user submits a prompt, `POST /api/ai/generate` receives the text, passes it to Gemini 2.5 Flash with structured system instructions, receives the response, and automatically records the pair into `AIHistory` in MongoDB before sending the response to the client.

---

## 18. Database Schema Explanation

### User Schema (`server/models/User.js`)
- `name`: String, required, trimmed.
- `email`: String, required, unique, lowercase, trimmed.
- `password`: String, required, minlength 6, `select: false` (never returned in API responses).
- `timestamps`: `createdAt`, `updatedAt`.

### AIHistory Schema (`server/models/AIHistory.js`)
- `userId`: Schema.Types.ObjectId (ref `User`), required, indexed.
- `prompt`: String, required, trimmed.
- `response`: String, required.
- `category`: String (enum: Interview Prep, Code Review, Technical Q&A, Career Advice, System Design).
- `timestamps`: `createdAt`, `updatedAt`.

---

## 19. Screens & Pages
1. **Landing Page (`/`)**: Product showcase, features grid, architectural breakdown.
2. **Login Page (`/login`)**: Account login with demo credentials prefill button.
3. **Register Page (`/register`)**: User registration with real-time validation.
4. **Dashboard Page (`/dashboard`)**: Personal statistics, session status, recent activity feed.
5. **AI Assistant Page (`/ai-assistant`)**: Interactive prompt workspace with categories, prompt suggestions, and copy response.
6. **AI History Page (`/history`)**: Saved history table/grid with search, category filtering, view detail modal, and delete options.
7. **Profile Page (`/profile`)**: Update profile info and change account password securely.
8. **404 Not Found Page (`*`)**: Custom fallback route for unmatched URLs.

---

## 20. Testing Instructions
- **Auth Test**: Register a new user, log out, log back in using registered email.
- **Route Guard Test**: Try accessing `/dashboard` without logging in; verify redirection to `/login`.
- **AI Prompt Test**: Navigate to `/ai-assistant`, pick a category chip, enter a technical prompt, and click "Generate Response". Verify response renders in Markdown format.
- **History Persistence Test**: Navigate to `/history`, verify the prompt you generated appears at the top. Test single delete and clear all history.

---

## 21. Common Errors and Solutions
- **MongoDB Connection Failure**: Ensure `MONGODB_URI` in `server/.env` has correct credentials and IP access allowed on MongoDB Atlas.
- **Gemini API Error / Empty Response**: Verify `GEMINI_API_KEY` in `server/.env` is valid and active.
- **JWT Expired (401 Unauthorized)**: Tokens expire after 30 days. Log out and log back in to renew your session token.

---

## 22. Future Improvements
- Multi-turn conversational chat threads.
- Voice input / speech-to-text prompt interface.
- Code syntax highlighting theme selector.
- PDF / Markdown export for AI interview study guides.
