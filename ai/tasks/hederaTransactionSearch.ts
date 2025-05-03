import { createChatMessage } from "@/app/utils";
import { queryHederaOpenRouter } from "../hederaAi";

/**
 * Handle Hedera transaction search operations
 * @param intent The detected intent
 * @param message The user's message
 * @param chatHistory The chat history
 * @param addToChat Function to add messages to the chat
 * @param accountId The user's Hedera account ID
 */
export async function hederaTransactionSearch(
    intent: string,
    message: string,
    chatHistory: any[],
    addToChat: (msg: any) => void,
    accountId: string | null
) {
    try {
        // For now, just provide information about the HCS-10 implementation
        const infoResponse = await queryHederaOpenRouter(
            `I can help you search for and view transaction details on the Hedera network.
       
      This task is currently being integrated with the HCS-10 protocol which provides secure, decentralized communication between agents on Hedera.
       
      Once implemented, you'll be able to search for transactions and view their details directly through the agent.`,
            chatHistory
        );

        addToChat(
            createChatMessage({
                sender: "ai",
                text: infoResponse,
                type: "text",
                intent: intent
            })
        );
    } catch (error: any) {
        console.error("Error in transaction search task:", error);

        const errorResponse = await queryHederaOpenRouter(
            `I encountered an error while trying to help with transaction searches: ${error.message || "Unknown error"}. Please try again later.`,
            chatHistory
        );

        addToChat(
            createChatMessage({
                sender: "ai",
                text: errorResponse,
                type: "error",
                intent: intent
            })
        );
    }
} 