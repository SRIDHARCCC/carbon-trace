# EcoTrace India 🌿🇮🇳
> **Localized Carbon Footprint Tracking, Gamification, and AI-Powered Awareness Ecosystem**

EcoTrace India is a localized web application designed to help the Indian population track, analyze, and mitigate personal and household carbon emissions. The application is built entirely within the Google Cloud and Firebase ecosystem to ensure near-zero server management, hyper-scalability, and low-latency access across tier-1, tier-2, and tier-3 networks in India.

Live Application URL: **[https://project_id.web.app](https://project_id.web.app)**

---

## 🌟 Key Features

### 1. Multi-Tab Localized Carbon Tracking Matrix
The dashboard partitions entries into four thematic categories tailored to day-to-day Indian lifestyles:
* **Utilities**: Track monthly electricity consumption by selecting local State Electricity Boards (e.g., BESCOM, MSEB, TNEB, UPPCL) or estimating via INR costs. Logs include LPG cylinder depletion rates.
* **Transport**: Input multi-modal commute details including public transit (Metro, local trains), auto-rickshaws, and private vehicles (two-wheelers and cars) with specific fuel choices (Petrol, Diesel, CNG, EV).
* **Diet**: Record vegetarian, non-vegetarian, or vegan meal frequencies, daily dairy intake (Liters), and food waste (kg) to understand food-associated emissions.
* **Infrastructure**: Log home energy variables such as AC runtime hours/baseline temperature settings, rooftop solar panel capacities (kW), and 5-Star rated home appliances.

### 2. EcoAgent AI Intelligence Column
A persistent conversational companion column locked alongside the input ledger. Powered by **Firebase Cloud Functions (2nd Gen)** and **Google Vertex AI (Gemini 1.5 Flash)**:
* **Contextual Awareness**: Reads the user's active logs and formulates recommendations based on the selected tab.
* **Quick-Action Tokens**: Tap-to-ask suggestions (e.g., *"What if I switch my AC baseline to 24°C?"* or *"Why is my transport footprint high?"*).
* **Localized Guidance**: Gemini is prompted to guide users using Indian geo-specific data, municipal benchmarks, and localized terms.

### 3. Real-Time Analytics & Charts
* Interactive pie chart and progress bar components built using **Apache ECharts** demonstrating emission distributions dynamically as logs are edited.

### 4. Eco-Tracer Leaderboard
* Real-time public leaderboard ranking contributors across Indian regions based on cumulative monthly carbon savings.
* Filter rankings by city (Bengaluru, Mumbai, Chennai, Delhi, Kolkata, Pune) to encourage community benchmarks.

---

## 🛠️ Technology Stack
* **Frontend**: React (v19), TypeScript (v6), Vite (v8)
* **Styling**: Tailwind CSS (with responsive 65/35 grid layouts and seamless Dark Mode class toggling)
* **Icons**: Lucide React
* **Data Visualization**: Apache ECharts & ECharts-for-React
* **Database**: Cloud Firestore (NoSQL hierarchical structure)
* **Authentication**: Firebase Authentication (Email/Password & Google Sign-In)
* **Backend**: Firebase Cloud Functions (Node.js/TS 2nd Gen) + Google Vertex AI SDK
* **Testing**: Vitest unit testing framework

---

## 📂 Project Structure
```
├── .firebaserc                # Firebase project settings
├── firebase.json              # Firebase services configuration
├── firestore.rules            # Firestore database security rules
├── firestore.indexes.json     # Database indexes
├── package.json               # Frontend dependencies & scripts
├── vite.config.ts             # Vite configuration with manual code-splitting
├── index.html                 # App index and SEO metatags
├── src/
│   ├── main.tsx               # App mount entry point
│   ├── App.tsx                # App state, auth routing, layout composition
│   ├── index.css              # Custom styles and Tailwind directives
│   ├── firebase/
│   │   └── config.ts          # Firebase SDK initialization & emulators routing
│   ├── components/
│   │   ├── Navbar.tsx         # Responsive header & theme toggle
│   │   ├── TrackingMatrix.tsx # Inputs matrices & ECharts visualization
│   │   ├── EcoAgentPanel.tsx  # Conversation panel (bottom drawer on mobile)
│   │   ├── Leaderboard.tsx    # Rankings table with Firestore listeners
│   │   └── AuthModal.tsx      # Sign-in/Registration form overlay
│   └── utils/
│       ├── carbonCalculators.ts     # Localized carbon formulas & constants
│       ├── carbonCalculators.test.ts # Vitest unit tests
│       └── security.ts        # Input sanitization and prompt injection checks
└── functions/                 # Backend Cloud Functions code
    ├── package.json
    ├── tsconfig.json
    └── src/
        └── index.ts           # ecoAgentChat & syncUserFootprintAndLeaderboard functions
```

---

## 📊 Indian Carbon Coefficients & Benchmarks
To maintain decoupling between UI and calculations, all carbon factors are housed in [carbonCalculators.ts](file:///c:/antigravity_practice/promptwars/carbon_footprint_tracking/src/utils/carbonCalculators.ts):
* **Indian Power Grid average**: `0.82 kg CO2e / kWh` (State-specific: MSEB `0.84`, BESCOM `0.82`, TNEB `0.78`, WBSEDCL `0.85`).
* **LPG Cylinder (14.2kg)**: `42.5 kg CO2e`.
* **Transport**: Metro `0.015`, Local Train `0.012`, Auto-Rickshaw `0.08`, two-wheeler (petrol) `0.045`, two-wheeler (EV) `0.010`, Car (petrol) `0.14`, Car (EV) `0.03` (kg CO2e per km).
* **Diet**: Veg Meal `0.60`, Non-Veg Meal `2.10`, Dairy `1.20` (kg CO2e per L).
* **National Benchmark**: Average Indian urban citizen emits **150 kg CO2e / month**.

---

## 💻 Local Setup & Installation

### Prerequisites
* **Node.js**: v20 or later
* **npm**: v10 or later
* **Firebase CLI**: `npm install -g firebase-tools`

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/carbon-footprint-tracking.git
cd carbon-footprint-tracking

# Install frontend dependencies
npm install

# Install functions backend dependencies
cd functions
npm install
cd ..
```

### 2. Configure Firebase Environment
Link the project directory with your Firebase CLI environment:
```bash
firebase use --add project_id
```

### 3. Run Development Server
To run the React frontend locally with hot-reloading:
```bash
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🧪 Testing & Verification

### Run Unit Tests
To verify calculations, run the Vitest test suite:
```bash
npm run test
```

---

## 🚀 Deployment

### Deploy to Google Cloud / Firebase
To build the React production assets and deploy the entire stack (Hosting, security rules, and functions) in one command:
```bash
# Compile Cloud Functions
cd functions
npm run build
cd ..

# Build React Client
npm run build

# Deploy to Firebase project
firebase deploy --only auth,firestore,hosting,functions --force
```
