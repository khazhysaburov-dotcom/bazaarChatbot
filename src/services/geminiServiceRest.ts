const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
export const LOCAL_API_BASE_URL = "http://127.0.0.1:5000";

interface Tool {
  function_declarations: FunctionDeclaration[];
}

interface FunctionDeclaration {
  name: string;
  description: string;
  parameters?: Record<string, any>;
}

// Function Call received from Model
interface FunctionCall {
  name: string;
  args: Record<string, any>;
}

// Function Response sent back to Model
interface FunctionResponse {
  name: string;
  response: Record<string, any>;
}

interface Part {
  text?: string;
  functionCall?: FunctionCall;
  functionResponse?: FunctionResponse;
}

interface Content {
  role: "user" | "model" | "function";
  parts: Part[];
}

let chatHistory: Content[] = [];

// Define the Tools available to the Agent
const tools: Tool[] = [
  {
    function_declarations: [
      {
        name: "get_dealer_inventory",
        description:
          "Retrieves the list of cars currently physically available at the Local Dealer Showroom. Always check this first.",
      },
      {
        name: "get_global_warehouse_inventory",
        description:
          "Retrieves the list of cars from the Global Warehouse. Use this ONLY if the user asks for a specific type of car (like a Truck or Sports car) that is NOT found in the dealer inventory.",
      },
    ],
  },
];

const systemInstruction = `


  You are "Chaika", a proactive and charming AI sales assistant for "Auto Bazaar".
  Your goal is to help customers find the perfect vehicle from our EXCLUSIVE INVENTORY.
  
  PROTOCOL:
  1. You do not know the inventory by heart. You MUST use the provided tools to find cars.
  2. Always check 'get_dealer_inventory' first.
  3. If the user wants something you didn't find at the dealer (e.g., "I need a truck"), then you MUST check 'get_global_warehouse_inventory'.
  4. Once you have data, answer the user's question enthusiastically.
  5. If you search both and find nothing, apologize.
  6. Be concise.
`;

// --- Service Methods ---

export const initializeChat = (initialDataIgnored: any) => {
  // We ignore initial data because the agent now fetches it proactively via tools.
  chatHistory = [];
  return { id: "agent-session-active" };
};

/**
 * Handles the conversation loop:
 * 1. Sends User Input -> Model
 * 2. Model might return a FunctionCall
 * 3. We execute FunctionCall -> Server
 * 4. Send FunctionResponse -> Model
 * 5. Model returns final Text
 */
export const sendMessageToGemini = async (message: string): Promise<string> => {
  if (!API_KEY) return "Error: API Key missing.";

  // Add user message to history
  chatHistory.push({ role: "user", parts: [{ text: message }] });

  // 1. First Turn
  let response = await callGeminiAPI(chatHistory);

  // Process the response (could be text or function call)
  return await processModelResponse(response);
};

// Helper: Make the HTTP Request
async function callGeminiAPI(contents: Content[]) {
  const payload = {
    contents: contents,
    tools: tools,
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: { temperature: 0.7 },
  };

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`Gemini API Error: ${res.status}`);
  return await res.json();
}

// Helper: Recursive function to handle tool loops
async function processModelResponse(apiResponse: any): Promise<string> {
  const candidate = apiResponse.candidates?.[0];
  const content = candidate?.content;
  const part = content?.parts?.[0];

  if (!part) return "I'm having trouble thinking right now.";

  // Case A: Model wants to call a function (Tool Use)
  if (part.functionCall) {
    const fnCall = part.functionCall;
    console.log(`🤖 Agent calling tool: ${fnCall.name}`);

    // Add model's "intent" to history
    chatHistory.push({
      role: "model",
      parts: [{ functionCall: fnCall }],
    });

    // Execute the tool
    const result = await executeTool(fnCall.name);

    // Add result to history
    chatHistory.push({
      role: "function",
      parts: [
        {
          functionResponse: {
            name: fnCall.name,
            response: { result: result }, // Gemini expects an object inside 'response'
          },
        },
      ],
    });

    // Recursively call Gemini again with the new info
    const followUpResponse = await callGeminiAPI(chatHistory);
    return await processModelResponse(followUpResponse);
  }

  // Case B: Model returned text (Final Answer)
  if (part.text) {
    // Add model's answer to history
    chatHistory.push({
      role: "model",
      parts: [{ text: part.text }],
    });
    return part.text;
  }

  return "I'm not sure what to say.";
}

// Helper: Execute logic on our Python Server
async function executeTool(name: string): Promise<any> {
  try {
    let endpoint = "";
    if (name === "get_dealer_inventory") {
      endpoint = "/api/dealer/inventory";
    } else if (name === "get_global_warehouse_inventory") {
      endpoint = "/api/warehouse/inventory";
    } else {
      return { error: "Unknown tool" };
    }

    const res = await fetch(`${LOCAL_API_BASE_URL}${endpoint}`);
    if (!res.ok) return { error: "Failed to fetch inventory" };

    const data = await res.json();
    return { inventory: data }; // Wrap in object context
  } catch (err) {
    return { error: "Server connection failed" };
  }
}
