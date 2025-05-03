import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import OpenAI from "openai";
import { intentClassification } from "./intentClassification";
import { executeTask } from "./taskRunner";

const OPENAI_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL;
const MODEL = process.env.MODEL;

const openai = new OpenAI({
    baseURL: OPENROUTER_BASE_URL,
    apiKey: OPENAI_API_KEY,
});

export const getKEKIUSinstruction = (whapiKey: string, injectiveAddress: string | null, apiModel: string | null) => {
    return `
You are KEKIUS, an AI assistant specialized in the Hedera network and decentralized finance (DeFi). You're a Multi Agentic AI Copilot.

Here are the agents:
- Sonia : She's a token analyst on Hedera. She can give a brief information about any token on Hedera.
- Venicia : He's a research analyst on Hedera. He's powered by Venice API for intelligent web search engine capaility to Kekius.

Your mission:
- You are strictly limited to **Hedera-related** topics, including token management, staking, messaging, consensus services, and transactions.
- You have specific tools to help users with Hedera-related tasks.
- Your responses should be concise, informative, and focused.
- You **must not discuss stock markets, traditional finance, or non-Hedera blockchain ecosystems.**

CRITICAL RULES:
❌ **NEVER answer questions about stock markets, Bitcoin, Ethereum, Solana, or any blockchain outside Hedera.**
❌ **NEVER provide trading bots, automated trading, or smart contract guidance outside Hedera.**
❌ **NEVER help with non-crypto topics (e.g., programming, AI, life advice).**

HANDLING OFF-TOPIC QUERIES:
- If a user asks about **coding, AI, or non-Hedera topics**, respond:
_"⚠️ I only assist with Hedera-related topics such as tokens, staking, governance, and consensus services. Please ask about these topics."_

- If a user asks about something unrelated but vaguely connected to Hedera, clarify it first. Example:
_User: "I need help with a transaction."_
- **KEKIUS:** "Are you asking about a transaction on Hedera? I can guide you on that!"

Always keep discussions **100% focused on Hedera**. Keep responses concise (maximum 10 sentences).

${injectiveAddress ? `⁠ My Hedera wallet address is: ${injectiveAddress}. If user asks you about his wallet address, you need to remember it. ⁠` : ""}
`;
};

/**
 * Query the OpenRouter API with user message and chat history
 * @param userMessage User message to send to AI
 * @param chatHistory Chat history for context
 * @returns AI response text
 */
export const queryOpenRouter = async (userMessage: string, chatHistory: any[]) => {
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
            { role: "system", content: getKEKIUSinstruction(OPENAI_API_KEY, injectiveAddress, MODEL) },
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
 * Process an AI message, categorize intent, and execute tasks if needed
 * @param userMessage User message to process
 * @param chatHistory Chat history for context
 * @param addToChat Function to add message to chat
 * @param accountId User's blockchain account ID or null
 */
export const processAIMessage = async (
    userMessage: string,
    chatHistory: any[],
    addToChat: (msg: any) => void,
    accountId: string | null
) => {
    // Check the last chat type and intent
    const lastChatType = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1].type : "text";
    const lastValidIntent = chatHistory.findLast((msg) => msg.intent)?.intent;

    try {
        // Process based on last chat type
        if (lastChatType === "error") {
            // If the last message was an error, use the last valid intent
            const intent = lastValidIntent;
            await executeTask(intent, userMessage, chatHistory, addToChat, accountId);
        } else {
            // Otherwise, classify the intent and execute the task
            const newIntent = await intentClassification(userMessage);

            if (newIntent) {
                await executeTask(
                    String(newIntent.intent).toLowerCase(),
                    userMessage,
                    chatHistory,
                    addToChat,
                    accountId
                );
            } else {
                // If intent classification failed, process as general message
                const aiResponse = await queryOpenRouter(userMessage, chatHistory);
                addToChat({
                    sender: "ai",
                    text: aiResponse,
                    type: "text",
                    intent: "general"
                });
            }
        }
    } catch (error) {
        console.error("❌ Error processing AI message:", error);

        // Add error message to chat
        addToChat({
            sender: "ai",
            text: `I encountered an error while processing your request. Please try again later. Error: ${error.message || "Unknown error"}`,
            type: "error",
            intent: lastValidIntent || "general"
        });
    }
}; 