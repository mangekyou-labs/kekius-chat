import { createChatMessage } from "@/app/utils";
import { queryHederaOpenRouter } from "../hederaAi";
import { HCS10Client } from "../hcs10Client";
import { extractTopicId, extractAccountId } from "@/ai/tools/hederaTools";

// Default connection memo
const DEFAULT_MEMO = "Connection initiated by Kekius AI";

/**
 * Handle agent communication using the HCS-10 protocol
 * @param intent The detected intent
 * @param message The user's message
 * @param chatHistory The chat history
 * @param addToChat Function to add messages to the chat
 * @param accountId The user's Hedera account ID
 * @param hederaClient The HCS-10 client
 */
export async function hederaAgentCommunication(
    intent: string,
    message: string,
    chatHistory: any[],
    addToChat: (msg: any) => void,
    accountId: string | null,
    hederaClient: HCS10Client
) {
    // Add thinking message
    addToChat(
        createChatMessage({
            sender: "ai",
            text: "🔍 Processing your agent communication request...",
            type: "text",
            intent: intent
        })
    );

    try {
        // Check if this is a connection request, a message to an agent, or another operation
        if (message.toLowerCase().includes("connect") || message.toLowerCase().includes("establish connection")) {
            await handleConnectionRequest(message, chatHistory, addToChat, hederaClient);
        }
        else if (message.toLowerCase().includes("send message") || message.toLowerCase().includes("communicate with")) {
            await handleSendMessage(message, chatHistory, addToChat, hederaClient);
        }
        else if (message.toLowerCase().includes("create agent") || message.toLowerCase().includes("setup agent")) {
            await handleCreateAgent(message, chatHistory, addToChat, hederaClient);
        }
        else if (message.toLowerCase().includes("list") || message.toLowerCase().includes("show connections")) {
            await handleListConnections(chatHistory, addToChat, hederaClient);
        }
        else {
            // For other types of agent communication, provide general information
            const generalResponse = await queryHederaOpenRouter(
                `Agent communication using the HCS-10 protocol allows AI agents to interact securely and asynchronously on the Hedera network. You can establish connections with other agents, send messages, and create your own agents. 
        
        Let me know if you'd like to:
        1. Connect with an agent (provide their topic ID or account ID)
        2. Send a message to a connected agent
        3. Create a new agent
        4. List your current connections`,
                chatHistory
            );

            addToChat(
                createChatMessage({
                    sender: "ai",
                    text: generalResponse,
                    type: "text",
                    intent: intent
                })
            );
        }
    } catch (error: any) {
        console.error("Error in agent communication:", error);

        // Handle errors gracefully
        const errorResponse = await queryHederaOpenRouter(
            `I encountered a technical error while processing your agent communication request. Error: ${error.message || 'Unknown error'}. Please try again or contact support if the problem persists.`,
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

/**
 * Handle a request to connect with another agent
 * @param message The user's message
 * @param chatHistory The chat history
 * @param addToChat Function to add messages to the chat
 * @param hederaClient The HCS-10 client
 */
async function handleConnectionRequest(
    message: string,
    chatHistory: any[],
    addToChat: (msg: any) => void,
    hederaClient: HCS10Client
) {
    // First check if we have set up inbound and outbound topics
    if (!hederaClient.getInboundTopicId() || !hederaClient.getOutboundTopicId()) {
        // Need to set up topics first
        try {
            const { inboundTopicId, outboundTopicId } = await hederaClient.createAgentTopics();

            const successResponse = await queryHederaOpenRouter(
                `I've set up your agent communication channels. Your inbound topic ID is ${inboundTopicId} and your outbound topic ID is ${outboundTopicId}. These channels follow the HCS-10 protocol, allowing secure agent communication on Hedera.`,
                chatHistory
            );

            addToChat(
                createChatMessage({
                    sender: "ai",
                    text: successResponse,
                    type: "text",
                    intent: "agent_communication"
                })
            );
        } catch (error: any) {
            const errorResponse = await queryHederaOpenRouter(
                `I couldn't set up your agent communication channels due to an error: ${error.message}. Please try again later.`,
                chatHistory
            );

            addToChat(
                createChatMessage({
                    sender: "ai",
                    text: errorResponse,
                    type: "error",
                    intent: "agent_communication"
                })
            );
            return;
        }
    }

    // Extract target agent's inbound topic ID from the message
    const targetInboundTopicId = extractTopicId(message);

    if (!targetInboundTopicId) {
        const noTopicResponse = await queryHederaOpenRouter(
            "I couldn't find a valid Hedera topic ID in your message. Please provide the target agent's inbound topic ID in the format 0.0.XXXXX to establish a connection.",
            chatHistory
        );

        addToChat(
            createChatMessage({
                sender: "ai",
                text: noTopicResponse,
                type: "text",
                intent: "agent_communication"
            })
        );
        return;
    }

    // Request a connection with the target agent
    try {
        const txId = await hederaClient.requestConnection(targetInboundTopicId, DEFAULT_MEMO);

        const successResponse = await queryHederaOpenRouter(
            `I've sent a connection request to the agent with inbound topic ID ${targetInboundTopicId}. The request is now pending approval from the target agent. Transaction ID: ${txId}`,
            chatHistory
        );

        addToChat(
            createChatMessage({
                sender: "ai",
                text: successResponse,
                type: "text",
                intent: "agent_communication"
            })
        );
    } catch (error: any) {
        const errorResponse = await queryHederaOpenRouter(
            `I encountered an error while trying to connect with the agent: ${error.message}. Please verify the topic ID and try again.`,
            chatHistory
        );

        addToChat(
            createChatMessage({
                sender: "ai",
                text: errorResponse,
                type: "error",
                intent: "agent_communication"
            })
        );
    }
}

/**
 * Handle a request to send a message to a connected agent
 * @param message The user's message
 * @param chatHistory The chat history
 * @param addToChat Function to add messages to the chat
 * @param hederaClient The HCS-10 client
 */
async function handleSendMessage(
    message: string,
    chatHistory: any[],
    addToChat: (msg: any) => void,
    hederaClient: HCS10Client
) {
    // Extract the connection ID (which could be a topic ID or an index)
    const topicId = extractTopicId(message);

    if (!topicId) {
        const noTopicResponse = await queryHederaOpenRouter(
            "I couldn't find a valid Hedera topic ID in your message. Please provide the connection topic ID in the format 0.0.XXXXX to send a message.",
            chatHistory
        );

        addToChat(
            createChatMessage({
                sender: "ai",
                text: noTopicResponse,
                type: "text",
                intent: "agent_communication"
            })
        );
        return;
    }

    // Extract the message content
    // Look for patterns like "send message X to topic Y" or "tell agent Y that X"
    let content = message;
    const contentPatterns = [
        /(?:send|submit|post)(?:.*?)(?:message|topic)(?:.*?)saying\s+["']?(.*?)["']?(?:\s*$|\s*to\s*topic)/i,
        /(?:send|submit|post)(?:.*?)["']?(.*?)["']?(?:\s*$|\s*to\s*topic)/i,
        /(?:message|content|tell)\s+["']?(.*?)["']?(?:\s*$|\s*to\s*agent|\s*to\s*topic)/i
    ];

    for (const pattern of contentPatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
            content = match[1];
            break;
        }
    }

    // Send the message
    try {
        const txId = await hederaClient.sendConnectionMessage(topicId, content);

        const successResponse = await queryHederaOpenRouter(
            `I've sent your message to the agent on connection topic ${topicId}. Transaction ID: ${txId}`,
            chatHistory
        );

        addToChat(
            createChatMessage({
                sender: "ai",
                text: successResponse,
                type: "text",
                intent: "agent_communication"
            })
        );
    } catch (error: any) {
        const errorResponse = await queryHederaOpenRouter(
            `I encountered an error while trying to send the message: ${error.message}. Please verify the connection is established and try again.`,
            chatHistory
        );

        addToChat(
            createChatMessage({
                sender: "ai",
                text: errorResponse,
                type: "error",
                intent: "agent_communication"
            })
        );
    }
}

/**
 * Handle a request to create a new agent
 * @param message The user's message
 * @param chatHistory The chat history
 * @param addToChat Function to add messages to the chat
 * @param hederaClient The HCS-10 client
 */
async function handleCreateAgent(
    message: string,
    chatHistory: any[],
    addToChat: (msg: any) => void,
    hederaClient: HCS10Client
) {
    try {
        // Set up agent topics
        const { inboundTopicId, outboundTopicId } = await hederaClient.createAgentTopics();

        const successResponse = await queryHederaOpenRouter(
            `I've created a new agent with the following details:
      
      Inbound Topic ID: ${inboundTopicId}
      Outbound Topic ID: ${outboundTopicId}
      
      Other agents can now connect to this agent by sending connection requests to the inbound topic. The agent will record its activities on the outbound topic.`,
            chatHistory
        );

        addToChat(
            createChatMessage({
                sender: "ai",
                text: successResponse,
                type: "text",
                intent: "agent_communication"
            })
        );
    } catch (error: any) {
        const errorResponse = await queryHederaOpenRouter(
            `I encountered an error while trying to create a new agent: ${error.message}. Please try again later.`,
            chatHistory
        );

        addToChat(
            createChatMessage({
                sender: "ai",
                text: errorResponse,
                type: "error",
                intent: "agent_communication"
            })
        );
    }
}

/**
 * Handle a request to list connections
 * @param chatHistory The chat history
 * @param addToChat Function to add messages to the chat
 * @param hederaClient The HCS-10 client
 */
async function handleListConnections(
    chatHistory: any[],
    addToChat: (msg: any) => void,
    hederaClient: HCS10Client
) {
    try {
        const connections = hederaClient.getAllConnections();

        if (connections.size === 0) {
            const noConnectionsResponse = await queryHederaOpenRouter(
                "You don't have any established connections with other agents yet. You can establish a connection by providing another agent's inbound topic ID.",
                chatHistory
            );

            addToChat(
                createChatMessage({
                    sender: "ai",
                    text: noConnectionsResponse,
                    type: "text",
                    intent: "agent_communication"
                })
            );
            return;
        }

        // Format connections list
        let connectionsList = "Your current agent connections:\n\n";
        let index = 1;

        for (const [id, connection] of connections.entries()) {
            connectionsList += `${index}. Target: ${connection.targetAccountId || 'Unknown'}\n`;
            connectionsList += `   Inbound Topic: ${connection.targetInboundTopicId}\n`;
            connectionsList += `   Connection Topic: ${connection.connectionTopicId || 'Not established'}\n`;
            connectionsList += `   Status: ${connection.status || 'Unknown'}\n\n`;
            index++;
        }

        const response = await queryHederaOpenRouter(connectionsList, chatHistory);

        addToChat(
            createChatMessage({
                sender: "ai",
                text: response,
                type: "text",
                intent: "agent_communication"
            })
        );
    } catch (error: any) {
        const errorResponse = await queryHederaOpenRouter(
            `I encountered an error while trying to list your connections: ${error.message}. Please try again later.`,
            chatHistory
        );

        addToChat(
            createChatMessage({
                sender: "ai",
                text: errorResponse,
                type: "error",
                intent: "agent_communication"
            })
        );
    }
} 