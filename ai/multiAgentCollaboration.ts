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
    private messageHandlers: Map<string, (message: any) => void> = new Map();
    private stopPollingFunctions: Map<string, () => void> = new Map();

    /**
     * Create a new multi-agent collaborator
     * @param hcs10Client The initialized HCS-10 client
     */
    constructor(hcs10Client: HCS10Client) {
        this.hcs10Client = hcs10Client;

        // Set default agent topics if available
        this.agentInboundTopics = {
            sonia: DEFAULT_SONIA_TOPIC,
            venice: DEFAULT_VENICE_TOPIC
        };
    }

    /**
     * Initialize connections with collaborative agents
     */
    async initializeConnections(): Promise<void> {
        try {
            // Find registered agents that match our criteria
            const agents = await this.hcs10Client.findRegisteredAgents();

            // Look for Sonia and Venice agents
            for (const agent of agents) {
                if (agent.metadata?.name?.toLowerCase().includes('sonia')) {
                    this.agentInboundTopics.sonia = agent.inbound_topic_id;
                    console.log(`Found Sonia agent with inbound topic: ${agent.inbound_topic_id}`);
                }

                if (agent.metadata?.name?.toLowerCase().includes('venice')) {
                    this.agentInboundTopics.venice = agent.inbound_topic_id;
                    console.log(`Found Venice agent with inbound topic: ${agent.inbound_topic_id}`);
                }
            }

            // Try to connect to found agents
            if (this.agentInboundTopics.sonia !== DEFAULT_SONIA_TOPIC) {
                await this.connectToAgent('sonia');
            }

            if (this.agentInboundTopics.venice !== DEFAULT_VENICE_TOPIC) {
                await this.connectToAgent('venice');
            }
        } catch (error) {
            console.error("Error initializing agent connections:", error);
        }
    }

    /**
     * Connect to a specific agent
     * @param agentType The type of agent to connect to
     * @returns True if connection was successful
     */
    async connectToAgent(agentType: "sonia" | "venice"): Promise<boolean> {
        try {
            const inboundTopicId = this.agentInboundTopics[agentType];

            if (!inboundTopicId || inboundTopicId.includes('DEFAULT')) {
                console.error(`No valid inbound topic ID for ${agentType}`);
                return false;
            }

            console.log(`Connecting to ${agentType} via inbound topic ${inboundTopicId}`);

            // Request connection
            await this.hcs10Client.requestConnection(
                inboundTopicId,
                `${AGENT_CONNECTION_MEMO} with ${agentType}`
            );

            // Set up monitoring for the agent's response
            // We'll look for connection_created messages on the agent's outbound topic
            const stopPolling = this.hcs10Client.startMessagePolling(
                inboundTopicId,
                (message) => this.handleConnectionResponse(agentType, message)
            );

            // Store the stop polling function
            this.stopPollingFunctions.set(agentType, stopPolling);

            return true;
        } catch (error) {
            console.error(`Error connecting to ${agentType}:`, error);
            return false;
        }
    }

    /**
     * Handle connection response from an agent
     * @param agentType The type of agent
     * @param message The response message
     */
    private handleConnectionResponse(agentType: "sonia" | "venice", message: any): void {
        if (message.op === HCS10Operation.CONNECTION_CREATED && message.connection_topic_id) {
            // Store the connection topic
            this.connectionTopics[agentType] = message.connection_topic_id;
            console.log(`Connection established with ${agentType} on topic ${message.connection_topic_id}`);

            // Stop polling the inbound topic
            if (this.stopPollingFunctions.has(agentType)) {
                this.stopPollingFunctions.get(agentType)!();
                this.stopPollingFunctions.delete(agentType);
            }

            // Start monitoring the connection topic for messages
            this.startConnectionMonitoring(agentType, message.connection_topic_id);
        }
    }

    /**
     * Start monitoring a connection topic for messages
     * @param agentType The type of agent
     * @param connectionTopicId The connection topic ID
     */
    private startConnectionMonitoring(agentType: "sonia" | "venice", connectionTopicId: string): void {
        const stopPolling = this.hcs10Client.startMessagePolling(
            connectionTopicId,
            (message) => {
                // Process messages from the agent
                if (message.op === HCS10Operation.MESSAGE) {
                    console.log(`Received message from ${agentType}:`, message.parsedData);

                    // Call the agent's message handler if registered
                    if (this.messageHandlers.has(agentType)) {
                        this.messageHandlers.get(agentType)!(message.parsedData);
                    }
                }
            }
        );

        // Store the stop polling function
        this.stopPollingFunctions.set(`${agentType}_connection`, stopPolling);
    }

    /**
     * Register a message handler for an agent
     * @param agentType The type of agent
     * @param handler The message handler function
     */
    registerMessageHandler(agentType: "sonia" | "venice", handler: (message: any) => void): void {
        this.messageHandlers.set(agentType, handler);
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
                const connected = await this.connectToAgent(agentType);

                if (!connected) {
                    return `Unable to establish connection with ${agentType}. Could not find a valid agent or connection failed.`;
                }

                // Wait a moment for the connection to be established
                await new Promise(resolve => setTimeout(resolve, 3000));

                if (!this.connectionTopics[agentType]) {
                    return `Connection to ${agentType} is pending. Please try again in a few moments.`;
                }
            }

            // Send message to the HCS connection topic
            if (this.connectionTopics[agentType]) {
                await this.hcs10Client.sendConnectionMessage(
                    this.connectionTopics[agentType]!,
                    JSON.stringify({
                        type: "query",
                        text: message,
                        timestamp: Date.now()
                    })
                );
                console.log(`Message sent to ${agentType} via HCS-10`);
            } else {
                return `No active connection with ${agentType}`;
            }

            // For the demo, simulate response from agent since we can't wait for the actual response
            let response: string;

            if (agentType === "sonia") {
                // Using the actual Sonia router with placeholder data
                response = await soniaRouter({}, [], "", "", "", "", [], []);
            } else if (agentType === "venice") {
                response = await fetchHederaUpdates(message);
            } else {
                response = "Unknown agent type";
            }

            // Record the simulated response in the connection topic for demo purposes
            if (this.connectionTopics[agentType]) {
                await this.hcs10Client.sendConnectionMessage(
                    this.connectionTopics[agentType]!,
                    JSON.stringify({
                        type: "response",
                        text: response,
                        timestamp: Date.now()
                    }),
                    "Simulated agent response"
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
        // Stop all polling
        for (const [key, stopPolling] of this.stopPollingFunctions.entries()) {
            stopPolling();
        }
        this.stopPollingFunctions.clear();

        // Close each connection
        for (const [agentType, connectionTopic] of Object.entries(this.connectionTopics)) {
            if (connectionTopic) {
                try {
                    await this.hcs10Client.closeConnection(
                        connectionTopic,
                        "Session ended",
                        "Closing multi-agent collaboration"
                    );
                    console.log(`Closed connection with ${agentType}`);
                } catch (error) {
                    console.error(`Error closing connection with ${agentType}:`, error);
                }
            }
        }

        // Clear connection topics
        this.connectionTopics = {};
    }
} 