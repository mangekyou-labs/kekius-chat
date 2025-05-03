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

/**
 * Execute a task based on the detected intent
 * @param intent The detected intent
 * @param message The user's message
 * @param chatHistory The chat history
 * @param addToChat Function to add messages to the chat
 * @param accountId The Hedera account ID
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
    switch (intent) {
        // Core agent communication intent
        case "agent_communication":
            if (hederaClient) {
                await hederaAgentCommunication(intent, message, chatHistory, addToChat, accountId, hederaClient);
            } else {
                const noClientResponse = await queryHederaOpenRouter(
                    "I need to set up agent communication using the HCS-10 protocol, but I don't have a client configured yet. Please connect a Hedera wallet first.",
                    chatHistory
                );
                addToChat(
                    createChatMessage({
                        sender: "ai",
                        text: noClientResponse,
                        type: "text",
                        intent: intent
                    })
                );
            }
            return;

        // Hedera-specific task intents
        case "hbar_transfer":
            await hederaTransferFunds(intent, message, chatHistory, addToChat, accountId);
            return;

        case "token_operations":
            await hederaTokenOperations(intent, message, chatHistory, addToChat, accountId);
            return;

        case "messaging":
            await hederaMessaging(intent, message, chatHistory, addToChat, accountId);
            return;

        case "balance_check":
            await hederaBalanceCheck(intent, message, chatHistory, addToChat, accountId);
            return;

        case "token_info":
            await hederaTokenInfo(intent, message, chatHistory, addToChat, accountId);
            return;

        case "transaction_search":
            await hederaTransactionSearch(intent, message, chatHistory, addToChat, accountId);
            return;

        // Handle forbidden topics
        case "forbidden_topics":
            const forbiddenAiResponse = await queryHederaOpenRouter(message, chatHistory);
            addToChat(
                createChatMessage({
                    sender: "ai",
                    text: forbiddenAiResponse,
                    type: "text",
                    intent: intent
                })
            );
            return;

        // Default handling for other intents
        default:
            const aiResponse = await queryHederaOpenRouter(message, chatHistory);
            addToChat(
                createChatMessage({
                    sender: "ai",
                    text: aiResponse,
                    type: "text",
                    intent: "general"
                })
            );
            return;
    }
}; 