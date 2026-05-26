# EnduraUP

EnduraUP is a modern, premium running and recovery application built with React. It provides advanced sports-science analytics, AI-driven coaching, adaptive training calendars, and deep Garmin Connect integration.

## ✨ Key Features

- **Adaptive AI Coach**: Connects to Groq API (Llama-3.1) with a localized persona to provide personalized training and recovery advice.
- **Train Bot (SimSimi Style)**: Users can define custom keywords and responses for the AI Coach, stored in real-time via Firebase Firestore.
- **Sports-Science Recovery**: Dynamic training readiness calculation penalizing back-to-back runs and rewarding consecutive rest days.
- **Bilingual Interface**: Full support for Bahasa Indonesia and English across the entire app.
- **Premium Aesthetics**: Retro groovy landing page, sleek dark mode, and "Sunrise Fun" achievement sharing cards. 
- **Cloud Sync & Privacy**: Secure Google/Email Authentication via Firebase, automatic Firestore syncing, and a fully compliant permanent account deletion feature.
- **Progressive Web App (PWA)**: Installable on mobile devices with an offline-first caching mechanism and native sharing capabilities.

## 🛠️ Technology Stack

- **Frontend**: React (Vite), CSS Custom Properties (Variables)
- **Icons**: Lucide-React
- **Database & Auth**: Firebase Authentication, Cloud Firestore
- **AI Integration**: Groq API
- **Deployment**: Vercel (Auto-deploy via GitHub)

## 🚀 Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mcaffandi/Smart.Couch.git
   ```

2. **Install dependencies:**
   ```bash
   cd react-app
   npm install
   ```

3. **Environment Variables:**
   Create a `.env` or `.env.local` file in the `react-app` directory:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_GROQ_API_KEY=your_groq_api_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

## 📝 License

This project is intended for personal use and portfolio display.
