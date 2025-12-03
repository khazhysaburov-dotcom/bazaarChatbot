import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import type { Car } from '../types';

let chatSession: Chat | null = null;

// Initialize the API client
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

/**
 * Creates or resets the chat session with the inventory context.
 * This demonstrates "Context" by injecting the data into the system instruction.
 */
export const initializeChat = (inventory: Car[]) => {
  const inventoryContext = JSON.stringify(inventory, null, 2);
  
  const systemInstruction = `
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

  chatSession = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.7,
    },
  });

  return chatSession;
};

/**
 * Sends a message to the Gemini model and returns the response text.
 */
export const sendMessageToGemini = async (message: string): Promise<string> => {
  if (!chatSession) {
    throw new Error("Chat session not initialized. Call initializeChat first.");
  }

  try {
    const result: GenerateContentResponse = await chatSession.sendMessage({
      message: message
    });
    return result.text || "I'm having trouble connecting to the network right now. Please try again.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I apologize, but I'm experiencing some interference. Could you rephrase that?";
  }
};