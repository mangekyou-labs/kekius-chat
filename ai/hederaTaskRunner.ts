import { queryHederaOpenRouter } from "./hederaAi";
import { createChatMessage } from "@/app/utils";
import { HCS10Client } from "./hcs10Client";

// Import Hedera-specific tasks
import { hederaTransferFunds } from "./tasks/hederaTransferFunds";
import { hederaTokenOperations } from "./tasks/hederaTokenOperations";
import { hederaMessaging } from "./tasks/hederaMessaging";
import { hederaAgentCommunication } from "./tasks/hederaAgentCommunication";
import { hederaBalanceCheck } from "./tasks/hederaBalanceCheck";
import { hederaTokenInfo } from "./tasks/hederaTokenInfo";
import { hederaTransactionSearch } from "./tasks/hederaTransactionSearch";
import { MultiAgentCollaborator } from "./multiAgentCollaboration";

// Map of intent to task
const TASK_MAP: Record<string, any> = {
    greeting: generalHederaResponse,
    hedera_balance: hederaBalanceCheck,
    hedera_token_info: hederaTokenInfo,
    hedera_token_operations: hederaTokenOperations,
    hedera_transaction_search: hederaTransactionSearch,
    hedera_transfer: hederaTransferFunds,
    hedera_messaging: hederaMessaging,
    hedera_agent_communication: hederaAgentCommunication,
    multi_agent_collaboration: handleMultiAgentCollaboration,
    // Add more task mappings as needed
};

/**
 * Execute a Hedera-specific task based on the detected intent
 * @param intent The detected intent
 * @param message The user's message
 * @param chatHistory The chat history
 * @param addToChat Function to add messages to the chat
 * @param accountId The user's Hedera account ID
 * @param hederaClient Optional HCS-10 client for agent communication
 */
export const executeTask = async (
    intent: string,
    message: string,
    chatHistory: any[],
    addToChat: (msg: any) => void,
    accountId: string | null,
    hederaClient?: HCS10Client
) => {
    const taskHandler = TASK_MAP[intent] || generalHederaResponse;

    if (taskHandler === hederaAgentCommunication || taskHandler === handleMultiAgentCollaboration) {
        // These tasks require HCS-10 client
        if (!hederaClient) {
            // No Hedera client available, explain to user
            addToChat(
                createChatMessage({
                    sender: "ai",
                    text:
                        "I need to set up agent communication using the HCS-10 protocol, but I don't have a client configured yet. Please connect a Hedera wallet first.",
                    type: "text",
                    intent: intent
                })
            );
            return;
        }

        await taskHandler(intent, message, chatHistory, addToChat, accountId, hederaClient);
    } else {
        // Standard tasks don't need HCS-10 client
        await taskHandler(intent, message, chatHistory, addToChat, accountId);
    }
};

/**
 * Process a general Hedera-related query
 * @param intent The detected intent
 * @param message The user's message
 * @param chatHistory The chat history
 * @param addToChat Function to add messages to the chat
 * @param accountId The user's Hedera account ID
 */
async function generalHederaResponse(
    intent: string,
    message: string,
    chatHistory: any[],
    addToChat: (msg: any) => void,
    accountId: string | null
) {
    // Pass the query to the Hedera AI backend
    const response = await queryHederaOpenRouter(message, chatHistory);

    // Add the AI response to chat
    addToChat(
        createChatMessage({
            sender: "ai",
            text: response,
            type: "text",
            intent: intent
        })
    );
}

/**
 * Handle multi-agent collaboration using HCS-10 protocol
 * @param intent The detected intent
 * @param message The user's message
 * @param chatHistory The chat history
 * @param addToChat Function to add messages to the chat
 * @param accountId The user's Hedera account ID
 * @param hederaClient The HCS-10 client
 */
async function handleMultiAgentCollaboration(
    intent: string,
    message: string,
    chatHistory: any[],
    addToChat: (msg: any) => void,
    accountId: string | null,
    hederaClient: HCS10Client
) {
    // Initialize the multi-agent collaborator if needed
    const collaborator = new MultiAgentCollaborator(hederaClient);

    try {
        // Initialize the collaborator (create topics, establish connections)
        await collaborator.initialize();

        // Process the multi-agent request
        await collaborator.processMultiAgentRequest(message, chatHistory, addToChat);
    } catch (error: any) {
        console.error("Error in multi-agent collaboration:", error);

        // Fallback to regular HederaAI response
        const errorResponse = await queryHederaOpenRouter(
            `I encountered an error while coordinating with other agents: ${error.message || "Unknown error"}. Let me answer your question directly.`,
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