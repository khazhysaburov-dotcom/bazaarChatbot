import type { Car } from '../types';

// Types for the REST API
interface Part {
  text: string;
}

interface Content {
  role: 'user' | 'model';
  parts: Part[];
}

// Module-level state to mimic the SDK's chat session persistence
let chatHistory: Content[] = [];
let systemInstructionText: string = '';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY ;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

/**
 * Creates or resets the chat session with the inventory context using REST API.
 * This demonstrates "Context" by injecting the data into the system instruction
 * and managing the conversation history manually.
 */
export const initializeChat = (inventory: Car[]) => {
  const inventoryContext = JSON.stringify(inventory, null, 2);
  
  systemInstructionText = `
    You are "Chaika", a proactive and charming AI sales assistant for "Auto Bazaar".
    
    Your goal is to help customers find the perfect vehicle from our EXCLUSIVE INVENTORY.
    
    Here is the CURRENT INVENTORY data (in JSON format):
    ${inventoryContext}
    
    RULES:
    1. You act as a knowledgeable car expert.
    2. STRICTLY recommend ONLY cars from the provided inventory list. If a user asks for a car we don't have (like a Ferrari), politely explain we don't have it and suggest the closest alternative from our list (e.g., the Porsche 911).
    3. When recommending a car, mention its Price, Year, and a unique feature.
    4. Be concise but enthusiastic. Use emojis occasionally 🚗✨.
    5. If the user is unsure, ask clarifying questions (budget, usage, family size) to infer the best match.
    6. Do not output raw JSON in your response, speak naturally.
    7. If the user says "New Year", suggest cars that feel like a "gift" or "upgrade" (Luxury or Sports).
    
    Start by acting ready to help.
  `;

  // Reset history
  chatHistory = [];
  
  return { id: 'rest-session-active' };
};


export const sendMessageToGemini = async (message: string): Promise<string> => {
  if (!API_KEY) {
    console.error("API Key is missing");
    return "Configuration Error: API Key is missing. Please check your environment variables.";
  }

  // 1. Update local history with user message
  chatHistory.push({
    role: 'user',
    parts: [{ text: message }]
  });

  // 2. Prepare payload
  const payload = {
    contents: chatHistory,
    systemInstruction: {
      parts: [{ text: systemInstructionText }]
    },
    generationConfig: {
      temperature: 0.7
    }
  };

  try {
    // 3. Make the fetch request
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API Error:", response.status, errorText);
        throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    // 4. Extract text
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
        throw new Error("No content in response");
    }

    // 5. Update local history with model response
    chatHistory.push({
        role: 'model',
        parts: [{ text: responseText }]
    });

    return responseText;

  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    return "I apologize, but I'm experiencing some interference with the Nebula network. Could you please rephrase that?";
  }
};
