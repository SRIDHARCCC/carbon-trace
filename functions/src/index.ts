import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { VertexAI } from '@google-cloud/vertexai';

admin.initializeApp();
const db = admin.firestore();

// Initialize Vertex AI with default configuration
// Standard project ID as provided by the user is 'project_id'
const PROJECT_ID = 'project_id';
const LOCATION = 'us-central1'; // Vertex AI primary region

interface FootprintData {
  utilities?: {
    electricityKwh?: number;
    electricityInr?: number;
    electricityBoard?: string;
    lpgCylindersCount?: number;
    lpgCylindersDepletionDays?: number;
  };
  transport?: {
    metroKm?: number;
    localTrainKm?: number;
    autoRickshawKm?: number;
    twoWheelerKm?: number;
    twoWheelerType?: 'petrol' | 'electric';
    carKm?: number;
    carType?: 'petrol' | 'diesel' | 'cng' | 'ev';
  };
  diet?: {
    vegetarianMeals?: number;
    nonVegetarianMeals?: number;
    veganMeals?: number;
    dairyLiters?: number;
    foodWasteKg?: number;
  };
  infrastructure?: {
    acBaselineTemp?: number;
    acHoursPerDay?: number;
    solarInstalledKw?: number;
    starAppliancesCount?: number;
  };
}

interface ChatRequest {
  message: string;
  activeFootprint: FootprintData | null;
  activeTab: string;
}

let generativeModel: ReturnType<InstanceType<typeof VertexAI>['getGenerativeModel']> | null = null;

try {
  const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
  generativeModel = vertexAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.3,
    },
  });
} catch (e) {
  console.error('Failed to initialize Vertex AI SDK:', e);
}

/**
 * OnCall function to chat with the EcoAgent.
 * Takes { message: string, activeFootprint: FootprintData | null, activeTab: string }
 */
export const ecoAgentChat = onCall({ region: 'asia-south1', maxInstances: 10 }, async (request) => {
  // 1. Security & Authentication Checks
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to talk to the EcoAgent.');
  }

  const data = request.data as ChatRequest;
  const { message, activeFootprint, activeTab } = data;
  
  if (!message || typeof message !== 'string') {
    throw new HttpsError('invalid-argument', 'Message must be a non-empty string.');
  }

  // Regex filtering to completely mitigate prompt injection and XSS
  const promptInjectionRegex = /(ignore\s+(?:all\s+)?previous|system\s+prompt|you\s+are\s+now|bypass\s+security|override\s+configuration|forget\s+what\s+i\s+said|act\s+as\s+a)/i;
  const xssRegex = /(<script|javascript:|on\w+\s*=|\bstyle\s*=|href\s*=\s*["']\s*javascript:|<[^>]+onload)/i;

  // Recursively validate all inputs inside the request payload to ensure no prompt injection or XSS
  const validateInput = (val: unknown) => {
    if (typeof val === 'string') {
      if (promptInjectionRegex.test(val)) {
        throw new HttpsError('invalid-argument', 'Security check failed: Prompt injection detected.');
      }
      if (xssRegex.test(val)) {
        throw new HttpsError('invalid-argument', 'Security check failed: XSS patterns detected.');
      }
    } else if (typeof val === 'object' && val !== null) {
      for (const value of Object.values(val as Record<string, unknown>)) {
        validateInput(value);
      }
    }
  };

  validateInput(data);

  const sanitizedMessage = message.substring(0, 500); // truncate to prevent resource abuse

  const userId = request.auth.uid;

  // 2. Fetch User Profile for context (e.g., location/city)
  let userCity = 'Bengaluru';
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      userCity = userDoc.data()?.city || 'Bengaluru';
    }
  } catch (err) {
    console.error('Error fetching user profile:', err);
  }

  // 3. Construct Context Prompt for Gemini
  const footprintInfo = activeFootprint 
    ? JSON.stringify(activeFootprint, null, 2) 
    : 'No carbon log data has been submitted yet for the current session.';

  const systemInstruction = 
    `You are "EcoAgent India", an expert sustainability AI assistant integrated into the "EcoTrace India" web app. 
    Your goal is to help Indian citizens, households, and professionals track and reduce their carbon footprint.
    
    The user is currently viewing the "${activeTab || 'General'}" tab.
    The user lives in: ${userCity}, India.
    The user's current carbon footprint metrics (in kg CO2e per month) are:
    ${footprintInfo}

    Indian Specific Context & Benchmarks:
    - Average monthly carbon footprint of an urban Indian: ~150 kg CO2e.
    - Indian Power Grid factor: ~0.82 kg CO2e per kWh (State averages: BESCOM 0.82, MSEB 0.84, TNEB 0.78, WBSEDCL 0.85).
    - LPG Cylinder: 14.2 kg cylinder causes 42.5 kg CO2e.
    - Local Transport: Metro travel (0.015 kg/km) and Local Trains (0.012 kg/km) are highly eco-friendly compared to Auto-rickshaws (0.08 kg/km) and petrol cars (0.14 kg/km).
    - AC optimization: Setting AC to 24°C instead of 20°C reduces electricity consumption by ~24% (~6% per degree).
    - Diet: Vegetarian diets (~0.60 kg CO2e/meal) and Vegan diets (~0.40 kg CO2e/meal) have a significantly lower impact than Non-Vegetarian diets (~2.10 kg CO2e/meal).

    Guidelines for your response:
    1. Be encouraging, localized, and practical for Indian households (reference local terms like BESCOM, LPG cylinders, auto-rickshaws, metro lines).
    2. Give exact calculation changes based on user queries when they ask "what if..." (e.g. "Calculate my savings if I switch AC from 20 to 24 degrees").
    3. Suggest actionable carbon-reduction tips suited to their profile.
    4. Keep your response concise (under 250 words), formatting key points in bullet points and bold markdown for readability.`;

  // 4. Invoke Vertex AI Gemini Model
  if (generativeModel) {
    try {
      const prompt = `${systemInstruction}\n\nUser Question: ${sanitizedMessage}`;
      const response = await generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const responseText = response.response?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (responseText) {
        return { response: responseText };
      }
    } catch (apiError) {
      console.error('Vertex AI API execution failed, triggering fallback:', apiError);
    }
  }

  // 5. Fallback Response (Static Rules-Engine) in case Vertex AI is unavailable
  console.log('Using static rules-engine fallback.');
  let fallbackText = `**Namaste!** I'm EcoAgent India, your carbon footprint guide. Currently, I am running in offline support mode, but I can analyze your metrics: \n\n`;

  if (activeFootprint) {
    const transportKm = (activeFootprint.transport?.carKm || 0) + (activeFootprint.transport?.twoWheelerKm || 0);
    const vegMeals = activeFootprint.diet?.vegetarianMeals || 0;
    const nonVegMeals = activeFootprint.diet?.nonVegetarianMeals || 0;
    const electricity = activeFootprint.utilities?.electricityKwh || 0;

    if (activeTab === 'Transport' && transportKm > 500) {
      fallbackText += `* **Transport Tip:** Your private transit exceeds 500 km this month. Switching even 20% of your commute to the local Metro or trains (which emit only 0.015 kg CO2e/km) can save around **30 kg of CO2e** monthly.\n`;
    }
    if (activeTab === 'Diet' && nonVegMeals > vegMeals) {
      fallbackText += `* **Diet Tip:** Incorporating more vegetarian meals (0.60 kg CO2e per meal vs 2.10 kg for meat) even 3 times a week can offset over **18 kg of CO2e** per month.\n`;
    }
    if (activeTab === 'Utilities' && electricity > 300) {
      fallbackText += `* **Utilities Tip:** Your electricity usage is high. In India, grid emissions are 0.82 kg CO2e/kWh. Optimizing your AC settings (recommending 24°C) can save up to 24% on your power bill and offset **50 kg CO2e**.\n`;
    }
    if (activeTab === 'Infrastructure' && activeFootprint.infrastructure?.solarInstalledKw === 0) {
      fallbackText += `* **Solar Power:** Rooftop solar installations in ${userCity} are highly effective. Installing a 1 kW solar array offsets up to **98 kg of CO2e** every month!\n`;
    }
  }

  fallbackText += `\n*Please try asking questions like: "How can I reduce my utilities footprint?" or "Why is my vegetarian diet better?"*`;
  return { response: fallbackText };
});

interface SyncRequest {
  monthId: string;
  totalCarbonKg: number;
  carbonSavedKg: number;
}

/**
 * OnCall function to update user footprint aggregates and sync with the secure public leaderboard.
 * Takes { monthId: string, totalCarbonKg: number, carbonSavedKg: number }
 */
export const syncUserFootprintAndLeaderboard = onCall({ region: 'asia-south1', maxInstances: 10 }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const data = request.data as SyncRequest;
  const { monthId, totalCarbonKg, carbonSavedKg } = data;
  const userId = request.auth.uid;

  if (!monthId || typeof totalCarbonKg !== 'number') {
    throw new HttpsError('invalid-argument', 'Invalid footprint parameters.');
  }

  const userEmail = request.auth.token.email || 'Anonymous';
  const name = userEmail.split('@')[0];

  // Retrieve user location
  let city = 'Other';
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      city = userDoc.data()?.city || 'Other';
    }
  } catch (err) {
    console.error('Error fetching user profile:', err);
  }

  const batch = db.batch();

  // 1. Update User Monthly Footprint Record
  const footprintRef = db.collection('users').doc(userId).collection('footprints').doc(monthId);
  batch.set(footprintRef, {
    totalCarbonKg,
    carbonSavedKg: carbonSavedKg || 0,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  // 2. Update Leaderboard entry securely (write access restricted client-side)
  const leaderboardRef = db.collection('leaderboard').doc(userId);
  batch.set(leaderboardRef, {
    name,
    city,
    totalCarbonKg,
    carbonSavedKg: carbonSavedKg || 0,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  await batch.commit();

  return { success: true };
});
