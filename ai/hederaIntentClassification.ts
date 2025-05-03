import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const OPENAI_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL;
const MODEL = process.env.MODEL;

const openai = new OpenAI({
    baseURL: OPENROUTER_BASE_URL,
    apiKey: OPENAI_API_KEY,
});

// Define the intents for Hedera-related tasks
const hederaIntents = {
    greeting: {
        description: "General greetings or hellos",
        examples: ["Hi", "Hello", "Hey there", "Good morning", "How are you?"]
    },
    hedera_balance: {
        description: "Check account balance or token holdings",
        examples: ["What's my HBAR balance?", "How many tokens do I have?", "Show me my account balance", "Check my holdings"]
    },
    hedera_token_info: {
        description: "Get information about a token on Hedera",
        examples: ["Tell me about HBAR", "What is this token?", "Token information", "Details about this NFT"]
    },
    hedera_token_operations: {
        description: "Operations with tokens like minting, burning, or managing",
        examples: ["How do I mint a token?", "Can I burn these tokens?", "Managing token supply", "Create a new token"]
    },
    hedera_transaction_search: {
        description: "Search for transactions or activity on Hedera",
        examples: ["Find my recent transactions", "Show my transaction history", "Look up this transaction", "Did my payment go through?"]
    },
    hedera_transfer: {
        description: "Transfer HBAR or tokens to another account",
        examples: ["Send HBAR to this account", "Transfer tokens", "How do I send funds?", "Can I send 10 HBAR to Alice?"]
    },
    hedera_messaging: {
        description: "Using Hedera Consensus Service for messaging",
        examples: ["Send a message on HCS", "How does HCS messaging work?", "Create a topic for messages", "Consensus messaging"]
    },
    hedera_agent_communication: {
        description: "Communication between AI agents using HCS-10 protocol",
        examples: ["Connect with another agent", "Send a message to agent X", "Create a new agent", "List my agent connections"]
    },
    multi_agent_collaboration: {
        description: "Requests that require collaboration between multiple agents (Kekius, Sonia, Venice)",
        examples: [
            "What does the token analysis show about recent news?",
            "Can you get Sonia and Venice to collaborate on this?",
            "I need both token analysis and research on this topic",
            "Analyze this token and find related news",
            "Get all agents to work together on this problem"
        ]
    },
    forbidden_topics: {
        description: "Non-Hedera topics that should not be answered",
        examples: ["How do I hack a wallet?", "Write a Python script", "What's the price of Bitcoin?", "Tell me about Ethereum"]
    }
};

/**
 * Classify the intent of a user message related to Hedera
 * @param message The user's message
 * @returns Object with the detected intent
 */
export const hederaIntentClassification = async (message: string) => {
    try {
        const systemPrompt = `You are a message intent classifier for a Hedera-specialized assistant.
Your task is to analyze user messages and classify them into one of these intents:

${Object.entries(hederaIntents)
                .map(([key, value]) => `- ${key}: ${value.description}
  Examples: ${value.examples.join(", ")}`)
                .join("\n\n")}

If a message doesn't clearly match any category, choose the closest fitting intent.
If the message is about a non-Hedera blockchain or forbidden topic, classify it as "forbidden_topics".
If the request involves multiple agents working together or needs both token analysis and news/research, classify it as "multi_agent_collaboration".

Return ONLY the intent name as a JSON object like: {"intent": "intent_name"}`;

        const messages: ChatCompletionMessageParam[] = [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
        ];

        const completion = await openai.chat.completions.create({
            model: MODEL || "openai/gpt-3.5-turbo",
            messages,
            response_format: { type: "json_object" }
        });

        if (!completion.choices || completion.choices.length === 0) {
            return null;
        }

        const response = completion.choices[0].message?.content || "";
        return JSON.parse(response);
    } catch (error) {
        console.error("❌ Error in intent classification:", error);
        return null;
    }
}; 