import { HederaAgentService } from "../services/hederaAgentService";
import { createChatMessage } from "@/app/utils";
import { queryOpenRouter } from "../ai";
import { queryHederaOpenRouter } from "../hederaAi";

// Default configuration for testing
const DEFAULT_CONFIG = {
    accountId: process.env.HEDERA_ACCOUNT_ID || '0.0.123456',
    privateKey: process.env.HEDERA_PRIVATE_KEY,
    network: (process.env.HEDERA_NETWORK || 'testnet') as 'mainnet' | 'testnet' | 'previewnet'
};

/**
 * Extract topic ID and message content from user message
 */
function extractMessagingDetails(message: string) {
    // Extract Hedera topic ID (0.0.XXXXX format)
    const topicIdRegex = /\b0\.0\.\d+\b/g;
    const topicMatches = message.match(topicIdRegex);
    const topicId = topicMatches && topicMatches.length > 0 ? topicMatches[0] : null;

    // Extract "content" part from message
    let content = message;

    // Try to find patterns like "send a message to topic X saying Y" or "submit Y to topic X"
    const contentPatterns = [
        /(?:send|submit|post)(?:.*?)(?:message|topic)(?:.*?)saying\s+["']?(.*?)["']?(?:\s*$|\s*to\s*topic)/i,
        /(?:send|submit|post)(?:.*?)["']?(.*?)["']?(?:\s*$|\s*to\s*topic)/i,
        /(?:message|content)\s+["']?(.*?)["']?(?:\s*$|\s*to\s*topic)/i
    ];

    for (const pattern of contentPatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
            content = match[1];
            break;
        }
    }

    // If topic was mentioned but no specific content was extracted, use everything except the topic ID
    if (topicId && content === message) {
        content = message.replace(topicId, '').trim();
    }

    return {
        topicId,
        content
    };
}

/**
 * Handle Hedera Consensus Service (HCS) messaging
 * @param intent The detected intent
 * @param message The user's message
 * @param chatHistory The chat history
 * @param addToChat Function to add messages to the chat
 * @param accountId The user's Hedera account ID
 */
export async function hederaMessaging(
    intent: string,
    message: string,
    chatHistory: any[],
    addToChat: (msg: any) => void,
    accountId: string | null
) {
    try {
        // For now, just provide information about the HCS-10 implementation
        const infoResponse = await queryHederaOpenRouter(
            `I can help you with Hedera Consensus Service (HCS) messaging features.
             
            This functionality is currently being upgraded to use the HCS-10 protocol which provides a standardized way for agents to communicate using Hedera's consensus service.
             
            Once implemented, you'll be able to create topics, submit messages, and retrieve message history directly through this interface.`,
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
        console.error("Error in messaging task:", error);

        const errorResponse = await queryHederaOpenRouter(
            `I encountered an error while trying to help with HCS messaging: ${error.message || "Unknown error"}. Please try again later.`,
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