import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import OpenAI from "openai";
import { HCS10Client, HCS10Operation } from "./hcs10Client";
import { hederaIntentClassification } from "./hederaIntentClassification";
import { executeTask } from "./hederaTaskRunner";

const OPENAI_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL;
const MODEL = process.env.MODEL;

const openai = new OpenAI({
    baseURL: OPENROUTER_BASE_URL,
    apiKey: OPENAI_API_KEY,
});

const defaultSystemPrompt = `
You are KEKIUS, an AI assistant specialized in the Hedera network and decentralized finance (DeFi). You're a Multi Agentic AI Copilot.

🔹 **Your Other Agents & Their Responsibilities:**
- Sonia : She's a token analyst on Hedera. She can give a brief information about any token on Hedera.
- Venicia : He's a research analyst on Hedera. He's powered by Venice API for intelligent web search engine capaility to Kekius.

🔹 **Your Role & Responsibilities:**
- You are strictly limited to **Hedera-related** topics, including token management, staking, messaging, consensus services, and transactions.
- You have specific tools to help users with Hedera-related tasks through the HCS-10 protocol.
- You **must not generate or assist with programming, code, or scripts.**
- You **must not discuss stock markets, traditional finance, or non-Hedera blockchain ecosystems.**

🔹 **Absolute Restrictions:**
❌ **NEVER generate or assist with any form of programming, code, or scripts.**  
❌ **NEVER discuss general AI, machine learning, or chatbot-related topics.**  
❌ **NEVER answer questions about stock markets, Bitcoin, Ethereum, Solana, or any blockchain outside Hedera.**  
❌ **NEVER provide trading bots, automated trading, or smart contract guidance outside Hedera.**  

🔹 **Handling Off-Topic Requests:**
- If a user asks about **coding, AI, or non-Hedera topics**, respond:  
  _"⚠️ I only assist with Hedera-related topics such as tokens, staking, governance, and consensus services. Please ask about these topics."_

- If a user asks about something unrelated but vaguely connected to Hedera, clarify it first. Example:  
  - **User:** "How do I stake?"  
  - **KEKIUS:** "Are you asking about staking on Hedera? I can guide you on that!"  

🔹 **Your Goal:**  
Always keep discussions **100% focused on Hedera**. Keep responses concise (maximum 10 sentences).
`;

export const queryHederaOpenRouter = async (userMessage: string, chatHistory: any[]) => {
    try {
        // Format the chat history to be compatible with OpenRouter
        const formattedHistory: ChatCompletionMessageParam[] = chatHistory
            .filter((msg) => msg.intent === "general")
            .map((msg) => ({
                role: msg.sender === "user" ? "user" : "assistant",
                content: msg.text.toString(),
            }));

        // Create the messages array with system prompt, history, and user message
        const messages: ChatCompletionMessageParam[] = [
            { role: "system", content: defaultSystemPrompt },
            ...formattedHistory,
            { role: "user", content: userMessage },
        ];

        if (!MODEL) {
            return;
        }

        // Send the request to OpenRouter
        const completion = await openai.chat.completions.create({
            model: MODEL,
            messages,
        });

        // Check if we got a valid response
        if (!completion.choices || completion.choices.length === 0) {
            return "Error: No response from AI.";
        }

        return completion.choices[0].message?.content || "I'm not sure how to respond to that.";
    } catch (error) {
        console.error("❌ Error querying OpenRouter:", error);
        return `There was an error processing your request: ${error}`;
    }
};

/**
 * Processes a user message using Hedera HCS-10 protocol for agent communication
 * @param userMessage The user's message
 * @param chatHistory The chat history
 * @param addToChat Function to add messages to the chat
 * @param accountId Hedera account ID
 * @param hederaClient Optional HCS-10 client
 */
export const processHederaAIMessage = async (
    userMessage: string,
    chatHistory: any[],
    addToChat: (msg: any) => void,
    accountId: string | null,
    hederaClient?: HCS10Client
) => {
    // Check the last chat type and intent
    const lastChatType = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1].type : "text";
    const lastValidIntent = chatHistory.findLast((msg) => msg.intent)?.intent;

    try {
        // Process based on last chat type
        if (lastChatType === "error") {
            // If the last message was an error, use the last valid intent
            const intent = lastValidIntent;
            await executeTask(intent, userMessage, chatHistory, addToChat, accountId, hederaClient);
        } else {
            // Otherwise, classify the intent and execute the task
            const newIntent = await hederaIntentClassification(userMessage);

            if (newIntent) {
                await executeTask(
                    String(newIntent.intent).toLowerCase(),
                    userMessage,
                    chatHistory,
                    addToChat,
                    accountId,
                    hederaClient
                );
            } else {
                // If intent classification failed, process as general message
                const aiResponse = await queryHederaOpenRouter(userMessage, chatHistory);
                addToChat({
                    sender: "ai",
                    text: aiResponse,
                    type: "text",
                    intent: "general"
                });
            }
        }
    } catch (error) {
        console.error("❌ Error processing Hedera AI message:", error);

        // Add error message to chat
        addToChat({
            sender: "ai",
            text: `I encountered an error while processing your request. Please try again later. Error: ${error.message || "Unknown error"}`,
            type: "error",
            intent: lastValidIntent || "general"
        });
    }
};

/**
 * Sends a message to a connected agent via HCS-10
 * @param message The message content
 * @param connectionId The connection ID
 * @param client The HCS-10 client
 * @returns Transaction ID if successful
 */
export const sendAgentMessage = async (
    message: string,
    connectionId: string,
    client: HCS10Client
): Promise<string | null> => {
    try {
        if (!connectionId) {
            throw new Error("Connection ID is required");
        }

        // Send the message using the client
        return await client.sendConnectionMessage(connectionId, message);
    } catch (error) {
        console.error("❌ Error sending agent message:", error);
        return null;
    }
}; 