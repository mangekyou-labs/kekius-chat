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
 * Extract token ID from user message
 */
function extractTokenId(message: string) {
    // Extract Hedera token ID (0.0.XXXXX format)
    const tokenIdRegex = /\b0\.0\.\d+\b/g;
    const tokenMatches = message.match(tokenIdRegex);
    return tokenMatches && tokenMatches.length > 0 ? tokenMatches[0] : null;
}

/**
 * Execute Hedera Token Service (HTS) operations
 */
export async function hederaTokenOperations(
    intent: string,
    message: string,
    chatHistory: any[],
    addToChat: (msg: any) => void,
    accountId: string | null
) {
    try {
        // For now, just provide information about the HCS-10 implementation
        const infoResponse = await queryHederaOpenRouter(
            `I can help you with Hedera token operations like creating, associating, or managing tokens.
             
            This task is currently being integrated with the HCS-10 protocol which provides secure, decentralized communication between agents on Hedera.
             
            Once implemented, you'll be able to perform token operations directly through the agent using the Hedera Token Service.`,
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
        console.error("Error in token operations task:", error);

        const errorResponse = await queryHederaOpenRouter(
            `I encountered an error while trying to help with token operations: ${error.message || "Unknown error"}. Please try again later.`,
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