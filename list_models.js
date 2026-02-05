const { GoogleGenAI } = require("@google/genai");

// Retrieve API Key provided in argument or fallback (user should provide it)
const apiKey = process.argv[2] || "YOUR_API_KEY_HERE";

if (apiKey === "YOUR_API_KEY_HERE") {
    console.error("Please provide your API key as an argument.");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });

async function list() {
    console.log("Listing models...");
    try {
        const models = await ai.models.list();
        console.log("Models:", models);
    } catch (e) {
        console.error("Error listing models:", e);
    }
}

list();
