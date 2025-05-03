import { HCS10Client, HCS10Operation } from "./hcs10Client";
import { queryHederaOpenRouter } from "./hederaAi";
import { soniaRouter } from "./sonia";
import { fetchHederaUpdates } from "./venice";
import { createChatMessage } from "@/app/utils";

// Connection topics for agent collaboration
const AGENT_CONNECTION_MEMO = "Kekius multi-agent collaboration";
const DEFAULT_SONIA_TOPIC = "0.0.DEFAULT_SONIA_TOPIC";
const DEFAULT_VENICE_TOPIC = "0.0.DEFAULT_VENICE_TOPIC";

/**
 * Multi-agent collaboration manager using HCS-10 protocol
 * This class manages communication between Kekius, Sonia, and Venice agents
 */
export class MultiAgentCollaborator {
    private hcs10Client: HCS10Client;
    private connectionTopics: {
        sonia?: string;
        venice?: string;
    } = {};
    private agentInboundTopics: {
        sonia?: string;
        venice?: string;
    } = {};

    /**
     * Create a new multi-agent collaborator
     * @param hcs10Client The initialized HCS-10 client
     */
    constructor(hcs10Client: HCS10Client) {
        this.hcs10Client = hcs10Client;
    }

    /**
     * Initialize the multi-agent collaboration channels
     * Creates topics and establishes connections between agents
     */
    async initialize(): Promise<boolean> {
        try {
            // First ensure Kekius has its agent topics
            if (!this.hcs10Client.getInboundTopicId() || !this.hcs10Client.getOutboundTopicId()) {
                const { inboundTopicId, outboundTopicId } = await this.hcs10Client.createAgentTopics();
                console.log(`Initialized Kekius agent topics: ${inboundTopicId}, ${outboundTopicId}`);
            }

            // Establish predefined topics for Sonia and Venice
            // In a production environment, these would be discovered via registry
            this.agentInboundTopics = {
                sonia: DEFAULT_SONIA_TOPIC,
                venice: DEFAULT_VENICE_TOPIC
            };

            // Connect to Sonia
            await this.connectToAgent("sonia");

            // Connect to Venice
            await this.connectToAgent("venice");

            return true;
        } catch (error) {
            console.error("Failed to initialize multi-agent collaboration:", error);
            return false;
        }
    }

    /**
     * Connect to a specific agent
     * @param agentType The type of agent to connect to (sonia or venice)
     */
    private async connectToAgent(agentType: "sonia" | "venice"): Promise<void> {
        try {
            if (!this.agentInboundTopics[agentType]) {
                console.error(`No inbound topic defined for ${agentType}`);
                return;
            }

            // Request connection if we don't already have one
            if (!this.connectionTopics[agentType]) {
                const txId = await this.hcs10Client.requestConnection(
                    this.agentInboundTopics[agentType]!,
                    `${AGENT_CONNECTION_MEMO} with ${agentType}`
                );
                console.log(`Requested connection with ${agentType}, txId: ${txId}`);

                // In a real implementation, we would listen for connection_created messages
                // For this demo, we'll simulate the connection being established immediately
                this.connectionTopics[agentType] = `0.0.SIMULATED_${agentType.toUpperCase()}_CONNECTION`;
                console.log(`Simulated connection with ${agentType} established`);
            }
        } catch (error) {
            console.error(`Error connecting to ${agentType}:`, error);
            throw error;
        }
    }

    /**
     * Send a message to a specific agent and get a response
     * @param agentType The type of agent to communicate with
     * @param message The message to send
     * @param chatHistory The chat history for context
     */
    async communicateWithAgent(
        agentType: "sonia" | "venice",
        message: string,
        chatHistory: any[]
    ): Promise<string> {
        try {
            // Check if we're connected to this agent
            if (!this.connectionTopics[agentType]) {
                // Try to connect if not already connected
                await this.connectToAgent(agentType);

                if (!this.connectionTopics[agentType]) {
                    return `Unable to establish connection with ${agentType}`;
                }
            }

            // Log message to the HCS connection topic
            if (this.connectionTopics[agentType]) {
                await this.hcs10Client.sendConnectionMessage(
                    this.connectionTopics[agentType]!,
                    message
                );
                console.log(`Message sent to ${agentType} via HCS-10`);
            }

            // Simulate response from agent
            // In a full implementation, we would listen for responses on the connection topic
            let response: string;

            if (agentType === "sonia") {
                // Using the actual Sonia router with placeholder data since we don't have the real implementation
                response = await soniaRouter({}, [], "", "", "", "", [], []);
            } else if (agentType === "venice") {
                response = await fetchHederaUpdates(message);
            } else {
                response = "Unknown agent type";
            }

            // Record the response in the connection topic
            if (this.connectionTopics[agentType]) {
                await this.hcs10Client.sendConnectionMessage(
                    this.connectionTopics[agentType]!,
                    response,
                    "Agent response"
                );
            }

            return response;
        } catch (error: any) {
            console.error(`Error communicating with ${agentType}:`, error);
            return `Error communicating with ${agentType}: ${error.message || "Unknown error"}`;
        }
    }

    /**
     * Process a request involving multiple agents
     * @param message The user's message
     * @param chatHistory The chat history
     * @param addToChat Function to add messages to the chat
     */
    async processMultiAgentRequest(
        message: string,
        chatHistory: any[],
        addToChat: (msg: any) => void
    ): Promise<void> {
        // Add thinking message
        addToChat(
            createChatMessage({
                sender: "ai",
                text: "🤔 Coordinating with other agents to answer your question...",
                type: "loading",
                intent: "multi_agent"
            })
        );

        try {
            // Determine which agents need to be involved
            const needsSonia = message.toLowerCase().includes("token") ||
                message.toLowerCase().includes("price") ||
                message.toLowerCase().includes("analysis");

            const needsVenice = message.toLowerCase().includes("news") ||
                message.toLowerCase().includes("research") ||
                message.toLowerCase().includes("updates");

            // Collect information from required agents
            let soniaResponse = "";
            let veniceResponse = "";

            if (needsSonia) {
                addToChat(
                    createChatMessage({
                        sender: "ai",
                        text: "💱 Consulting Sonia for token analysis...",
                        type: "loading",
                        intent: "multi_agent"
                    })
                );
                soniaResponse = await this.communicateWithAgent("sonia", message, chatHistory);
            }

            if (needsVenice) {
                addToChat(
                    createChatMessage({
                        sender: "ai",
                        text: "🔍 Asking Venice to research the latest information...",
                        type: "loading",
                        intent: "multi_agent"
                    })
                );
                veniceResponse = await this.communicateWithAgent("venice", message, chatHistory);
            }

            // Synthesize a response from all agents via HCS-10
            let synthesisInput = message;
            if (soniaResponse) {
                synthesisInput += `\n\nSonia's analysis: ${soniaResponse}`;

                // Add Sonia's response to chat
                addToChat(
                    createChatMessage({
                        sender: "sonia",
                        text: soniaResponse,
                        type: "text",
                        intent: "token_analysis"
                    })
                );
            }

            if (veniceResponse) {
                synthesisInput += `\n\nVenice's research: ${veniceResponse}`;

                // Add Venice's response to chat
                addToChat(
                    createChatMessage({
                        sender: "venicia",
                        text: veniceResponse,
                        type: "text",
                        intent: "hedera_research"
                    })
                );
            }

            // Generate synthesized response using Kekius
            const synthesizedResponse = await queryHederaOpenRouter(
                `Please synthesize a comprehensive response based on this information: ${synthesisInput}`,
                chatHistory
            );

            // Add the synthesized response to chat
            addToChat(
                createChatMessage({
                    sender: "ai",
                    text: synthesizedResponse,
                    type: "text",
                    intent: "multi_agent"
                })
            );

        } catch (error: any) {
            console.error("Error in multi-agent collaboration:", error);

            const errorResponse = await queryHederaOpenRouter(
                `I encountered a technical error while coordinating with other agents. Error: ${error.message || 'Unknown error'}. Please try again.`,
                chatHistory
            );

            addToChat(
                createChatMessage({
                    sender: "ai",
                    text: errorResponse,
                    type: "error",
                    intent: "multi_agent"
                })
            );
        }
    }

    /**
     * Close all agent connections
     */
    async closeAllConnections(): Promise<void> {
        try {
            // Close connection with Sonia if exists
            if (this.connectionTopics.sonia) {
                await this.hcs10Client.closeConnection(
                    this.connectionTopics.sonia,
                    "Session ended",
                    "User ended the session"
                );
                delete this.connectionTopics.sonia;
            }

            // Close connection with Venice if exists
            if (this.connectionTopics.venice) {
                await this.hcs10Client.closeConnection(
                    this.connectionTopics.venice,
                    "Session ended",
                    "User ended the session"
                );
                delete this.connectionTopics.venice;
            }

            console.log("All agent connections closed");
        } catch (error: any) {
            console.error("Error closing agent connections:", error);
            throw error;
        }
    }
} 