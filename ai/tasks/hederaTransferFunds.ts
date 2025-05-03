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
 * Extract token ID and recipient from message
 */
function extractTransferDetails(message: string) {
    // Extract Hedera account ID (0.0.XXXXX format)
    const accountIdRegex = /\b0\.0\.\d+\b/g;
    const accountMatches = message.match(accountIdRegex);

    // Extract token ID if present, otherwise assume HBAR
    const tokenIdRegex = /token\s+(?:id\s+)?(\b0\.0\.\d+\b)/i;
    const tokenMatch = message.match(tokenIdRegex);

    // Extract amount
    const amountRegex = /\b(\d+(?:\.\d+)?)\s*(?:hbar|tokens?|$)/i;
    const amountMatch = message.match(amountRegex);

    // If we found multiple account IDs, assume first is recipient
    let recipientId = accountMatches && accountMatches.length > 0 ? accountMatches[0] : null;

    // If we found a token ID and it's the same as a potential recipient, look for another recipient
    const tokenId = tokenMatch ? tokenMatch[1] : null;
    if (tokenId && tokenId === recipientId && accountMatches && accountMatches.length > 1) {
        recipientId = accountMatches[1];
    }

    // Extract amount or default to 1
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 1;

    return {
        tokenId,
        recipientId,
        amount
    };
}

/**
 * Handle Hedera HBAR and token transfer operations
 * @param intent The detected intent
 * @param message The user's message
 * @param chatHistory The chat history
 * @param addToChat Function to add messages to the chat
 * @param accountId The user's Hedera account ID
 */
export async function hederaTransferFunds(
    intent: string,
    message: string,
    chatHistory: any[],
    addToChat: (msg: any) => void,
    accountId: string | null
) {
    try {
        // For now, just provide information about the HCS-10 implementation
        const infoResponse = await queryHederaOpenRouter(
            `I can help you with transferring HBAR or tokens on the Hedera network. 
             
            This task is currently being integrated with the HCS-10 protocol which provides secure, decentralized communication between agents on Hedera.
             
            Once implemented, you'll be able to transfer funds directly through the agent using the Hedera Consensus Service.`,
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
        console.error("Error in transfer funds task:", error);

        const errorResponse = await queryHederaOpenRouter(
            `I encountered an error while trying to help with fund transfers: ${error.message || "Unknown error"}. Please try again later.`,
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