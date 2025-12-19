<div align="center">

# 🚀 Gravity - AI Marketing Agent

### Intelligent Marketing Automation for Modern Businesses

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6+-green.svg)](https://www.mongodb.com/)

<img width="100%" alt="Gravity Dashboard" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

**Gravity** is a comprehensive AI-powered marketing agent designed for founders, marketers, and businesses. It leverages Google's Gemini AI to automate campaign creation, competitor analysis, content generation, and social media management.

[Features](#-features) • [Demo](#-demo) • [Installation](#-installation) • [Tech Stack](#-tech-stack) • [API Reference](#-api-reference) • [Contributing](#-contributing)

</div>

---

## ✨ Features

### 🎯 AI-Powered Campaign Management
- **Smart Campaign Creation** - 5-step wizard with AI-generated content, images, and scheduling
- **Multi-Platform Support** - Instagram, Facebook, Twitter/X, LinkedIn, YouTube
- **AI Image Generation** - Powered by Gemini Flash with brand-context awareness
- **Intelligent Scheduling** - AI suggests optimal posting times based on audience engagement
- **Campaign Analytics** - Track impressions, clicks, CTR, and engagement in real-time

### 🔍 Competitor Intelligence
- **Real-time Competitor Tracking** - Monitor competitor posts across all platforms
- **Sentiment Analysis** - AI-powered sentiment detection for competitor content
- **Rival Post Generator** - Create counter-posts to compete with competitor content
- **SWOT Analysis** - Automated strengths, weaknesses, opportunities, and threats analysis

### 📊 Smart Dashboard
- **Brand Health Score** - Real-time scoring based on campaigns, engagement, and activity
- **AI-Generated Insights** - Personalized recommendations based on your business profile
- **Trending Topics** - Industry-relevant trends to capitalize on
- **Performance Metrics** - Daily spend tracking, engagement rates, and ROI analysis

### 💬 AI Marketing Assistant
- **Context-Aware Chat** - Understands your business profile for personalized advice
- **Marketing Strategy** - Get AI recommendations for campaigns, content, and growth
- **Content Ideas** - Generate captions, hashtags, and post ideas on demand

### 👥 Influencer Discovery
- **Smart Search** - Find influencers by niche, platform, and engagement rate
- **Audience Analysis** - Verify influencer audience authenticity
- **Collaboration Tracking** - Manage outreach and partnerships

### 📅 Content Calendar & Scheduling
- **Visual Calendar** - Drag-and-drop scheduling interface
- **Scheduled Posts Tab** - View, edit, and manage all scheduled content
- **Post Preview** - Full preview modal with download and edit options
- **Multi-Platform Posting** - Schedule once, post everywhere

### ⚙️ Business Onboarding
- **Guided Setup** - Step-by-step business profile creation
- **Industry Detection** - AI understands your niche for better recommendations
- **Competitor Import** - Add competitors during onboarding for immediate tracking
- **Social Account Connection** - OAuth integration for major platforms

---

## 🖥️ Demo

### Dashboard Overview
The AI-powered dashboard provides real-time insights into your marketing performance:
- Brand health score with detailed breakdown
- AI-suggested actions prioritized by impact
- Recent campaign performance metrics
- Competitor activity feed

### Campaign Creation
Create comprehensive campaigns in minutes:
1. **Campaign Details** - Name, description, and objective
2. **Target Audience** - Demographics, interests, and locations
3. **Content Preferences** - Tone, type, and key messages
4. **Scheduling** - Duration, frequency, and optimal times
5. **Budget & Goals** - Investment and KPIs
6. **Review & Generate** - AI creates posts with images

### Scheduled Posts
View and manage all scheduled content:
- Click any post card for full preview
- Download images directly
- Edit captions and hashtags
- One-click posting

---

## 🛠️ Installation

### Prerequisites
- **Node.js** 18+ 
- **MongoDB** 6+ (local or Atlas)
- **Google Gemini API Key** ([Get one here](https://makersuite.google.com/app/apikey))

### Quick Start

```bash
# Clone the repository
git clone https://github.com/TheGraphicKing/Marketing-agent---nebula.git
cd Marketing-agent---nebula

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Environment Setup

Create a `.env` file in the `backend` directory:

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here
MONGODB_URI=mongodb://localhost:27017/gravity
JWT_SECRET=your_super_secret_jwt_key_here

# Optional - OAuth Credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
```

### Running the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# App runs on http://localhost:3000
```

### Health Check
```bash
curl http://localhost:5000/api/health
# {"success":true,"message":"Gravity API is running"}
```

---

## 🏗️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI Framework |
| **TypeScript** | Type Safety |
| **Vite** | Build Tool & Dev Server |
| **Tailwind CSS** | Styling |
| **Recharts** | Data Visualization |
| **Lucide Icons** | Icon Library |
| **React Router** | Navigation |

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime |
| **Express.js** | API Framework |
| **MongoDB** | Database |
| **Mongoose** | ODM |
| **JWT** | Authentication |
| **bcryptjs** | Password Hashing |
| **express-validator** | Input Validation |

### AI & APIs
| Service | Purpose |
|---------|---------|
| **Google Gemini** | Text & Image Generation |
| **Gemini Flash** | Fast AI Responses |
| **Imagen 3** | Image Generation (Fallback) |

---

## 📁 Project Structure

```
marketing-agent/
├── backend/
│   ├── middleware/
│   │   └── auth.js              # JWT authentication
│   ├── models/
│   │   ├── User.js              # User schema
│   │   ├── Campaign.js          # Campaign schema
│   │   ├── Competitor.js        # Competitor tracking
│   │   ├── Influencer.js        # Influencer data
│   │   ├── CachedCampaign.js    # AI suggestion cache
│   │   └── ...
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── campaigns.js         # Campaign CRUD + AI generation
│   │   ├── competitors.js       # Competitor analysis
│   │   ├── dashboard.js         # Dashboard data + insights
│   │   ├── chat.js              # AI assistant
│   │   └── ...
│   ├── services/
│   │   ├── geminiAI.js          # Gemini API integration
│   │   ├── socialMediaAPI.js    # Social platform APIs
│   │   └── ...
│   └── server.js                # Express app entry
├── frontend/
│   ├── components/
│   │   ├── Layout.tsx           # App layout
│   │   └── ChatBot.tsx          # AI assistant widget
│   ├── pages/
│   │   ├── Dashboard.tsx        # Main dashboard
│   │   ├── Campaigns.tsx        # Campaign management
│   │   ├── Competitors.tsx      # Competitor analysis
│   │   ├── Influencers.tsx      # Influencer discovery
│   │   ├── Settings.tsx         # User settings
│   │   └── ...
│   ├── services/
│   │   └── api.ts               # API client
│   ├── context/
│   │   └── ThemeContext.tsx     # Dark/Light mode
│   └── types.ts                 # TypeScript definitions
└── README.md
```

---

## 🔌 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |
| PUT | `/api/auth/onboarding` | Complete onboarding |

### Campaigns
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/campaigns` | List all campaigns |
| POST | `/api/campaigns` | Create campaign |
| GET | `/api/campaigns/:id` | Get campaign details |
| PUT | `/api/campaigns/:id` | Update campaign |
| DELETE | `/api/campaigns/:id` | Delete campaign |
| POST | `/api/campaigns/generate-campaign-posts` | AI generate posts |
| POST | `/api/campaigns/:id/publish` | Publish to social media |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/overview` | Dashboard data |
| GET | `/api/dashboard/campaign-suggestions` | AI suggestions |
| POST | `/api/dashboard/rival-post` | Generate rival post |

### Competitors
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/competitors` | List competitors |
| POST | `/api/competitors` | Add competitor |
| GET | `/api/competitors/posts` | Get competitor posts |
| POST | `/api/competitors/:id/analyze` | Run SWOT analysis |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/message` | Send message to AI |
| GET | `/api/chat/suggestions` | Get chat suggestions |

---

## ⚡ Performance Optimizations

Gravity is optimized for fast response times (<3 seconds):

- **Response Time Monitoring** - Automatic logging of slow requests
- **Database Query Optimization** - Parallel queries with `Promise.all()`
- **MongoDB Lean Queries** - `.lean()` for faster reads
- **AI Response Caching** - 5-minute TTL for Gemini responses
- **Dashboard Caching** - 1-minute TTL for dashboard data
- **Request Timeouts** - 8s for AI, 10s default
- **Graceful Fallbacks** - AI insights timeout with default data

---

## 🔒 Security Considerations

Current security measures:
- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt (salt rounds: 10)
- ✅ Input validation with express-validator
- ✅ CORS configuration
- ✅ MongoDB injection prevention via Mongoose

Recommended for production:
- 🔲 Add rate limiting (express-rate-limit)
- 🔲 Add security headers (helmet)
- 🔲 Encrypt OAuth tokens at rest
- 🔲 Add CSRF protection
- 🔲 Implement account lockout
- 🔲 Add audit logging

---

## 🚀 Deployment

### Docker (Recommended)

```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

### Environment Variables for Production

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=very_long_random_string
FRONTEND_URL=https://yourdomain.com
```

### Platforms
- **Vercel** - Frontend deployment
- **Railway** - Backend + MongoDB
- **Render** - Full-stack deployment
- **AWS/GCP** - Enterprise deployment

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style
- Add TypeScript types for new features
- Write meaningful commit messages
- Test thoroughly before submitting PR

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Google Gemini](https://deepmind.google/technologies/gemini/) - AI capabilities
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework
- [Lucide](https://lucide.dev/) - Beautiful icons
- [Recharts](https://recharts.org/) - Chart library

---

<div align="center">

**Built with ❤️ by [Nebulaa](https://nebulaa.ai)**

[Report Bug](https://github.com/TheGraphicKing/Marketing-agent---nebula/issues) • [Request Feature](https://github.com/TheGraphicKing/Marketing-agent---nebula/issues)

</div>
