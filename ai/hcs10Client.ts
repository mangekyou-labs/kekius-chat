import { BrowserHCSClient, AgentBuilder, AIAgentCapability, FeeConfigBuilder } from '@hashgraphonline/standards-sdk';
import { HashinalsWalletConnectSDK } from '@hashgraphonline/hashinal-wc';

// Constants
const HCS10_MEMO_PREFIX = "hcs-10";
const DEFAULT_TTL = "60";

// Topic types
enum TopicType {
    INBOUND = "0",
    OUTBOUND = "1",
    CONNECTION = "2"
}

// Message operations
export enum HCS10Operation {
    REGISTER = "register",
    CONNECTION_REQUEST = "connection_request",
    CONNECTION_CREATED = "connection_created",
    CONNECTION_CLOSED = "connection_closed",
    MESSAGE = "message",
    CLOSE_CONNECTION = "close_connection"
}

interface HCS10Message {
    p: string; // Protocol identifier, always "hcs-10"
    op: HCS10Operation; // Operation type
    [key: string]: any; // Additional fields based on operation
}

export interface ConnectionConfig {
    targetAccountId: string;
    targetInboundTopicId: string;
    connectionTopicId?: string;
    status?: 'established' | 'pending' | 'needs confirmation' | 'unknown';
}

/**
 * Client for HCS-10 protocol implementation using the official HashGraph Online SDK
 */
export class HCS10Client {
    private client: BrowserHCSClient;
    private connections: Map<string, ConnectionConfig> = new Map();
    private walletSDK: HashinalsWalletConnectSDK;
    private operatorId: string = '';
    private inboundTopicId?: string;
    private outboundTopicId?: string;
    private messagePollers: Map<string, any> = new Map();
    private lastProcessedTimestamps: Map<string, Date> = new Map();
    private messageHandlers: Map<string, (message: any) => void> = new Map();

    /**
     * Create an HCS10Client with wallet integration
     * @param walletSDK The initialized wallet SDK
     * @param network The Hedera network to use
     */
    constructor(
        walletSDK: HashinalsWalletConnectSDK,
        network: 'mainnet' | 'testnet' = 'testnet'
    ) {
        this.walletSDK = walletSDK;
        const accountInfo = walletSDK.getAccountInfo();
        if (accountInfo && accountInfo.accountId) {
            this.operatorId = accountInfo.accountId;
        } else {
            throw new Error("Wallet not connected or account information unavailable");
        }

        try {
            // Initialize Hedera client using the BrowserHCSClient
            this.client = new BrowserHCSClient({
                network: network,
                hwc: walletSDK,
            });
        } catch (error) {
            console.error("Error initializing HCS10Client:", error);
            throw error;
        }
    }

    /**
     * Create inbound and outbound topics for the agent
     * @returns Object containing created topic IDs
     */
    async createAgentTopics(): Promise<{ inboundTopicId: string, outboundTopicId: string }> {
        try {
            // Create inbound topic for receiving connection requests
            const inboundResult = await this.client.createTopic("HCS-10 agent inbound topic");
            if (!inboundResult.success || !inboundResult.topicId) {
                throw new Error("Failed to create inbound topic");
            }
            this.inboundTopicId = inboundResult.topicId;

            // Create outbound topic for recording agent's actions
            const outboundResult = await this.client.createTopic("HCS-10 agent outbound topic");
            if (!outboundResult.success || !outboundResult.topicId) {
                throw new Error("Failed to create outbound topic");
            }
            this.outboundTopicId = outboundResult.topicId;

            return {
                inboundTopicId: this.inboundTopicId!,
                outboundTopicId: this.outboundTopicId!
            };
        } catch (error) {
            console.error("Error creating agent topics:", error);
            throw error;
        }
    }

    /**
     * Find available agents registered on the network
     * @param filters Optional filters for agent discovery
     * @returns List of registered agents
     */
    async findRegisteredAgents(filters = {}): Promise<any[]> {
        try {
            const result = await this.client.findRegistrations({
                network: this.client.network,
                ...filters
            });

            if (!result.success) {
                throw new Error(result.error || "Failed to find agents");
            }

            return result.registrations;
        } catch (error) {
            console.error("Error finding agents:", error);
            throw error;
        }
    }

    /**
     * Request a connection with another agent
     * @param targetInboundTopicId The target agent's inbound topic ID
     * @param memo Optional memo for the connection request
     * @returns The transaction ID
     */
    async requestConnection(targetInboundTopicId: string, memo?: string): Promise<string> {
        try {
            if (!this.inboundTopicId) {
                throw new Error("No inbound topic ID set. Call createAgentTopics first.");
            }

            // Format operator ID
            const operatorId = `${this.inboundTopicId}@${this.operatorId}`;

            // Submit connection request using the client
            const result = await this.client.submitConnectionRequest(
                targetInboundTopicId,
                this.operatorId,
                operatorId,
                memo || "Connection request from HCS10Client"
            );

            // Add the connection to our map with pending status
            this.connections.set(targetInboundTopicId, {
                targetAccountId: "", // We don't know this yet
                targetInboundTopicId,
                status: "pending"
            });

            // Start polling the agent's outbound topic for connection confirmation
            if (this.messagePollers.has(targetInboundTopicId)) {
                clearInterval(this.messagePollers.get(targetInboundTopicId)!);
            }

            // Return the transaction ID
            return result?.toString() || "";
        } catch (error) {
            console.error("Error requesting connection:", error);
            throw error;
        }
    }

    /**
     * Handle a connection request from another agent
     * @param requestingAccountId The requesting agent's account ID
     * @param connectionId The connection ID from the request
     * @param memo Optional memo for the connection confirmation
     * @returns The connection topic ID
     */
    async handleConnectionRequest(
        requestingAccountId: string,
        connectionId: number,
        memo?: string
    ): Promise<{ connectionTopicId: string, confirmedConnectionSequenceNumber: number }> {
        try {
            if (!this.inboundTopicId || !this.outboundTopicId) {
                throw new Error("No topic IDs set. Call createAgentTopics first.");
            }

            // Handle the connection request using the client
            const result = await this.client.handleConnectionRequest(
                this.inboundTopicId,
                requestingAccountId,
                connectionId,
                memo || "Connection accepted"
            );

            if (!result.connectionTopicId) {
                throw new Error("Failed to create connection topic");
            }

            // Add the connection to our map with established status
            this.connections.set(requestingAccountId, {
                targetAccountId: requestingAccountId,
                targetInboundTopicId: "", // We don't know this yet
                connectionTopicId: result.connectionTopicId,
                status: "established"
            });

            return {
                connectionTopicId: result.connectionTopicId,
                confirmedConnectionSequenceNumber: result.confirmedConnectionSequenceNumber || 0
            };
        } catch (error) {
            console.error("Error handling connection request:", error);
            throw error;
        }
    }

    /**
     * Send a message to a connection topic
     * @param connectionTopicId The connection topic ID
     * @param content The message content
     * @param memo Optional memo for the message
     * @returns The transaction ID
     */
    async sendConnectionMessage(
        connectionTopicId: string,
        content: string,
        memo?: string
    ): Promise<string> {
        try {
            // Format operator ID for connection topic
            const operatorId = `${connectionTopicId}@${this.operatorId}`;

            // Check if content is too large (over ~6KB)
            const contentSize = new TextEncoder().encode(content).length;
            let messageData: string = content;

            // For large content, we need to use the inscription service
            if (contentSize > 6000) {
                console.log(`Content size (${contentSize} bytes) exceeds limit, using inscription service`);
                const buffer = new Uint8Array(new TextEncoder().encode(content));
                const inscription = await this.client.inscribeFile(buffer as any, "message.json");
                if (!inscription.referenceString) {
                    throw new Error("Failed to inscribe large content");
                }
                messageData = inscription.referenceString;
            }

            // Send the message to the connection topic
            const result = await this.client.sendMessage(
                connectionTopicId,
                operatorId,
                messageData,
                memo || "Message from HCS10Client"
            );

            return result?.toString() || "";
        } catch (error) {
            console.error("Error sending connection message:", error);
            throw error;
        }
    }

    /**
     * Start monitoring a topic for messages
     * @param topicId The topic ID to monitor
     * @param handler The message handler function
     * @param interval The polling interval in ms
     * @returns A handle to stop the poller
     */
    startMessagePolling(
        topicId: string,
        handler: (message: any) => void,
        interval: number = 3000
    ): () => void {
        // Set up last processed timestamp
        if (!this.lastProcessedTimestamps.has(topicId)) {
            this.lastProcessedTimestamps.set(topicId, new Date(0));
        }

        // Store the handler
        this.messageHandlers.set(topicId, handler);

        // Clear any existing interval
        if (this.messagePollers.has(topicId)) {
            clearInterval(this.messagePollers.get(topicId)!);
        }

        // Set up the polling interval
        const intervalId = setInterval(async () => {
            await this.pollMessages(topicId);
        }, interval);

        // Store the interval ID
        this.messagePollers.set(topicId, intervalId);

        // Return a function to stop polling
        return () => {
            if (this.messagePollers.has(topicId)) {
                clearInterval(this.messagePollers.get(topicId)!);
                this.messagePollers.delete(topicId);
            }
        };
    }

    /**
     * Poll for messages on a topic
     * @param topicId The topic ID to poll
     */
    private async pollMessages(topicId: string): Promise<void> {
        try {
            // Get the last processed timestamp
            const lastTimestamp = this.lastProcessedTimestamps.get(topicId) || new Date(0);

            // Get messages from the topic
            const messages = await this.client.getMessages(topicId);

            if (!messages) {
                return;
            }

            // Filter for new messages
            const newMessages = messages.filter((msg: any) => {
                const timestamp = new Date(msg.consensus_timestamp);
                return timestamp > lastTimestamp;
            });

            if (newMessages.length === 0) {
                return;
            }

            // Update the last processed timestamp
            const latestMessage = newMessages.reduce((latest: any, msg: any) => {
                const timestamp = new Date(msg.consensus_timestamp);
                const latestTimestamp = new Date(latest.consensus_timestamp);
                return timestamp > latestTimestamp ? msg : latest;
            }, newMessages[0]);

            this.lastProcessedTimestamps.set(topicId, new Date(latestMessage.consensus_timestamp));

            // Process the messages
            for (const message of newMessages) {
                await this.processMessage(topicId, message);
            }
        } catch (error) {
            console.error(`Error polling messages for topic ${topicId}:`, error);
        }
    }

    /**
     * Process a message from a topic
     * @param topicId The topic ID
     * @param message The message
     */
    private async processMessage(topicId: string, message: any): Promise<void> {
        try {
            // Check if we have a handler for this topic
            if (!this.messageHandlers.has(topicId)) {
                return;
            }

            // Get the handler
            const handler = this.messageHandlers.get(topicId)!;

            // Check if the message has content
            if (!message.data) {
                return;
            }

            // Handle large content references
            let content = message.data;
            if (typeof content === 'string' && content.startsWith('hcs://')) {
                try {
                    content = await this.client.getMessageContent(content);
                } catch (error) {
                    console.error('Error retrieving content:', error);
                    content = '{"text":"[Content unavailable]"}';
                }
            }

            // Parse the content if it's a string
            let parsedContent = content;
            if (typeof content === 'string') {
                try {
                    parsedContent = JSON.parse(content);
                } catch (e) {
                    // Content is not JSON, use as is
                }
            }

            // Create a processed message
            const processedMessage = {
                ...message,
                parsedData: parsedContent,
                timestamp: new Date(message.consensus_timestamp)
            };

            // Call the handler
            handler(processedMessage);
        } catch (error) {
            console.error(`Error processing message:`, error);
        }
    }

    /**
     * Create and register an agent
     * @param name The agent name
     * @param description The agent description
     * @param capabilities The agent capabilities
     * @param profilePicture The agent profile picture
     * @returns The registered agent information
     */
    async createAgent(
        name: string,
        description: string,
        capabilities: string[] = [],
        profilePicture?: Uint8Array,
        fileName?: string
    ): Promise<any> {
        try {
            // Create agent builder
            const agentBuilder = new AgentBuilder()
                .setName(name)
                .setDescription(description)
                .setNetwork(this.client.network);

            // Add capabilities
            for (const capability of capabilities) {
                if (capability in AIAgentCapability) {
                    agentBuilder.addCapability(capability as AIAgentCapability);
                } else {
                    agentBuilder.addCapability(capability);
                }
            }

            // Add profile picture if provided
            if (profilePicture && fileName) {
                agentBuilder.setProfilePicture(profilePicture, fileName);
            }

            // Create and register the agent
            return await this.client.createAndRegisterAgent(agentBuilder);
        } catch (error) {
            console.error("Error creating agent:", error);
            throw error;
        }
    }

    /**
     * Close a connection with another agent
     * @param connectionTopicId The connection topic ID
     * @param reason Optional reason for closing the connection
     * @param memo Optional memo for the close message
     * @returns The transaction ID
     */
    async closeConnection(
        connectionTopicId: string,
        reason?: string,
        memo?: string
    ): Promise<string> {
        try {
            // Not directly supported in BrowserHCSClient, so we create a close message
            const closeMessage = {
                p: "hcs-10",
                op: HCS10Operation.CLOSE_CONNECTION,
                reason: reason || "Connection closed by client",
            };

            // Format operator ID for connection topic
            const operatorId = `${connectionTopicId}@${this.operatorId}`;

            // Send the close message
            return await this.client.sendMessage(
                connectionTopicId,
                operatorId,
                JSON.stringify(closeMessage),
                memo || "Closing connection"
            );
        } catch (error) {
            console.error("Error closing connection:", error);
            throw error;
        }
    }

    /**
     * Set the inbound and outbound topic IDs for the agent
     * @param inboundTopicId The inbound topic ID
     * @param outboundTopicId The outbound topic ID
     */
    setTopicIds(inboundTopicId: string, outboundTopicId: string): void {
        this.inboundTopicId = inboundTopicId;
        this.outboundTopicId = outboundTopicId;
    }

    /**
     * Get the agent's inbound topic ID
     * @returns The inbound topic ID
     */
    getInboundTopicId(): string | undefined {
        return this.inboundTopicId;
    }

    /**
     * Get the agent's outbound topic ID
     * @returns The outbound topic ID
     */
    getOutboundTopicId(): string | undefined {
        return this.outboundTopicId;
    }

    /**
     * Get information about a specific connection
     * @param targetId The target agent's ID or topic ID
     * @returns The connection configuration
     */
    getConnection(targetId: string): ConnectionConfig | undefined {
        return this.connections.get(targetId);
    }

    /**
     * Get all connections for the agent
     * @returns A map of all connections
     */
    getAllConnections(): Map<string, ConnectionConfig> {
        return this.connections;
    }
} 