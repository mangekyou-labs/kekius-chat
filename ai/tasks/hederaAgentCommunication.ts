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
        else if (message.toLowerCase().includes("find") || message.toLowerCase().includes("discover agents")) {
            await handleFindAgents(message, chatHistory, addToChat, hederaClient);
        }
        else {
            // For other types of agent communication, provide general information
            const generalResponse = await queryHederaOpenRouter(
                `Agent communication using the HCS-10 protocol allows AI agents to interact securely and asynchronously on the Hedera network. You can establish connections with other agents, send messages, and create your own agents. 
        
        Let me know if you'd like to:
        1. Connect with an agent (provide their topic ID or account ID)
        2. Send a message to a connected agent
        3. Create a new agent
        4. Find available agents on the network
        5. List your current connections`,
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
        const errorResponse = await queryHederaOpenRouter(
            `I encountered an error while processing your agent communication request: ${error.message}. Please try again with more specific instructions.`,
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
                `I've set up your agent communication channels following the HCS-10 protocol. Your inbound topic ID is ${inboundTopicId} and your outbound topic ID is ${outboundTopicId}. These channels allow secure agent communication on Hedera.`,
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
        const errorResponse = await queryHederaOpenRouter(
            `I couldn't identify a valid target topic ID in your request. Please specify the inbound topic ID of the agent you want to connect with in the format "0.0.xxxxx".`,
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

    // Try to initiate the connection
    try {
        const txId = await hederaClient.requestConnection(targetInboundTopicId, DEFAULT_MEMO);

        // Start monitoring the agent's outbound topic for connection confirmation
        hederaClient.startMessagePolling(targetInboundTopicId, (message) => {
            if (message.op === 'connection_created') {
                // Connection established, update UI
                const connectionTopicId = message.connection_topic_id;
                console.log(`Connection established with topic: ${connectionTopicId}`);

                // We could notify the user here if needed
            }
        });

        const successResponse = await queryHederaOpenRouter(
            `I've sent a connection request to the agent with inbound topic ID ${targetInboundTopicId}. The request has been recorded on the Hedera network with transaction ID: ${txId}. 
            
            I'm now monitoring for the agent's response. Once they accept the connection, we'll be able to exchange messages on a dedicated connection topic.`,
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
            `I couldn't establish a connection with the agent due to an error: ${error.message}. Please verify the topic ID and try again.`,
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
    // Extract connection topic ID from the message
    const connectionTopicId = extractTopicId(message);
    if (!connectionTopicId) {
        const errorResponse = await queryHederaOpenRouter(
            `I couldn't identify a valid connection topic ID in your request. Please specify the connection topic ID for the agent you want to message in the format "0.0.xxxxx".`,
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

    // Extract the message content to send
    const contentMatch = message.match(/send message .*? (with|containing|saying) ["'](.+?)["']/i);
    const messageContent = contentMatch ? contentMatch[2] : "Hello from Kekius AI!";

    // Try to send the message
    try {
        const txId = await hederaClient.sendConnectionMessage(
            connectionTopicId,
            messageContent,
            "Message from Kekius"
        );

        // Start or continue monitoring the connection topic for responses
        hederaClient.startMessagePolling(connectionTopicId, (message) => {
            if (message.op === 'message' && message.data) {
                // Message received, update UI
                console.log(`Received message: ${JSON.stringify(message.parsedData)}`);

                // We could notify the user here if needed
            }
        });

        const successResponse = await queryHederaOpenRouter(
            `I've sent your message "${messageContent}" to the connection topic ${connectionTopicId}. The message has been recorded on the Hedera network with transaction ID: ${txId}.
            
            I'm now monitoring for responses on this connection topic. When the agent replies, I'll notify you.`,
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
            `I couldn't send the message to the agent due to an error: ${error.message}. Please verify the connection topic ID and try again.`,
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
    // Extract agent name from the message
    const nameMatch = message.match(/create agent .*? (called|named) ["'](.+?)["']/i);
    const agentName = nameMatch ? nameMatch[2] : "Kekius Agent";

    // Extract agent description from the message
    const descMatch = message.match(/with description ["'](.+?)["']/i);
    const agentDescription = descMatch ? descMatch[1] : "A Hedera-based AI agent powered by Kekius";

    // Extract agent capabilities from the message
    const capabilities = [];
    if (message.toLowerCase().includes("text generation")) capabilities.push("text_generation");
    if (message.toLowerCase().includes("data analysis")) capabilities.push("data_analysis");
    if (message.toLowerCase().includes("file processing")) capabilities.push("file_processing");
    if (message.toLowerCase().includes("image generation")) capabilities.push("image_generation");

    // Try to create the agent
    try {
        const agent = await hederaClient.createAgent(
            agentName,
            agentDescription,
            capabilities
        );

        const successResponse = await queryHederaOpenRouter(
            `I've created a new agent for you following the HCS-10 protocol:
            
            Name: ${agentName}
            Description: ${agentDescription}
            Capabilities: ${capabilities.join(", ") || "None specified"}
            
            The agent has been registered on the Hedera network with the following details:
            Account ID: ${agent.accountId}
            Inbound Topic ID: ${agent.inboundTopicId}
            Outbound Topic ID: ${agent.outboundTopicId}
            
            Other users can now connect with your agent using its inbound topic ID.`,
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
            `I couldn't create the agent due to an error: ${error.message}. Please try again later.`,
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
 * Handle a request to list current connections
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
                `You don't have any active connections with agents yet. You can establish a connection with an agent by providing their inbound topic ID.`,
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

        // Format connections for display
        let connectionsList = "";
        connections.forEach((connection, id) => {
            connectionsList += `
- Target: ${connection.targetAccountId || "Unknown"}
  Topic ID: ${connection.targetInboundTopicId}
  Connection Topic: ${connection.connectionTopicId || "Not established"}
  Status: ${connection.status || "Unknown"}
`;
        });

        const connectionsResponse = await queryHederaOpenRouter(
            `Here are your current agent connections:${connectionsList}
            
            You can send messages to agents with established connections by using their connection topic ID.`,
            chatHistory
        );

        addToChat(
            createChatMessage({
                sender: "ai",
                text: connectionsResponse,
                type: "text",
                intent: "agent_communication"
            })
        );
    } catch (error: any) {
        const errorResponse = await queryHederaOpenRouter(
            `I couldn't retrieve your connections due to an error: ${error.message}. Please try again later.`,
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
 * Handle a request to find available agents
 * @param message The user's message
 * @param chatHistory The chat history
 * @param addToChat Function to add messages to the chat
 * @param hederaClient The HCS-10 client
 */
async function handleFindAgents(
    message: string,
    chatHistory: any[],
    addToChat: (msg: any) => void,
    hederaClient: HCS10Client
) {
    try {
        // Extract filters from the message
        const filters: any = {};

        if (message.toLowerCase().includes("text generation")) {
            filters.capabilities = [...(filters.capabilities || []), "text_generation"];
        }
        if (message.toLowerCase().includes("data analysis")) {
            filters.capabilities = [...(filters.capabilities || []), "data_analysis"];
        }

        if (message.toLowerCase().includes("named")) {
            const nameMatch = message.match(/named ["'](.+?)["']/i);
            if (nameMatch) filters.name = nameMatch[1];
        }

        // Find registered agents
        const agents = await hederaClient.findRegisteredAgents(filters);

        if (agents.length === 0) {
            const noAgentsResponse = await queryHederaOpenRouter(
                `I couldn't find any registered agents that match your criteria. Try searching without filters or try again later as more agents become available.`,
                chatHistory
            );

            addToChat(
                createChatMessage({
                    sender: "ai",
                    text: noAgentsResponse,
                    type: "text",
                    intent: "agent_communication"
                })
            );
            return;
        }

        // Format agents for display (limit to 5 for readability)
        let agentList = "";
        agents.slice(0, 5).forEach((agent, index) => {
            agentList += `
${index + 1}. ${agent.metadata.name}
   - Description: ${agent.metadata.description || "No description"}
   - Inbound Topic ID: ${agent.inbound_topic_id}
   - Capabilities: ${agent.metadata.capabilities?.join(", ") || "None specified"}
`;
        });

        if (agents.length > 5) {
            agentList += `\n...and ${agents.length - 5} more agents.`;
        }

        const agentsResponse = await queryHederaOpenRouter(
            `I found ${agents.length} agent(s) registered on the Hedera network:${agentList}
            
            To connect with an agent, provide its inbound topic ID in a connection request.`,
            chatHistory
        );

        addToChat(
            createChatMessage({
                sender: "ai",
                text: agentsResponse,
                type: "text",
                intent: "agent_communication"
            })
        );
    } catch (error: any) {
        const errorResponse = await queryHederaOpenRouter(
            `I couldn't find agents due to an error: ${error.message}. Please try again later.`,
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