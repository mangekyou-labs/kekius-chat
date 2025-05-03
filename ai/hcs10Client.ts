import {
    AccountId,
    Client,
    PrivateKey,
    TopicCreateTransaction,
    TopicMessageSubmitTransaction,
    TopicId,
    PublicKey
} from "@hashgraph/sdk";

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

export class HCS10Client {
    private client: Client;
    private operatorId: string;
    private operatorKey: PrivateKey;
    private inboundTopicId?: TopicId;
    private outboundTopicId?: TopicId;
    private connections: Map<string, ConnectionConfig> = new Map();

    /**
     * Create an HCS10Client
     * @param operatorId The Hedera account ID
     * @param operatorKey The Hedera private key
     * @param network The Hedera network to use (mainnet, testnet, previewnet)
     */
    constructor(
        operatorId: string,
        operatorKey: string,
        network: 'mainnet' | 'testnet' | 'previewnet' = 'testnet'
    ) {
        this.operatorId = operatorId;
        this.operatorKey = PrivateKey.fromString(operatorKey);

        try {
            // Initialize Hedera client
            this.client = Client.forName(network);
            this.client.setOperator(operatorId, this.operatorKey);
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
            // Create inbound topic - for receiving connection requests
            const inboundTopic = await this.createTopic(TopicType.INBOUND, this.operatorId);
            this.inboundTopicId = inboundTopic;

            // Create outbound topic - for recording agent's actions
            const outboundTopic = await this.createTopic(TopicType.OUTBOUND);
            this.outboundTopicId = outboundTopic;

            return {
                inboundTopicId: inboundTopic.toString(),
                outboundTopicId: outboundTopic.toString()
            };
        } catch (error) {
            console.error("Error creating agent topics:", error);
            throw error;
        }
    }

    /**
     * Create a new topic with the HCS-10 memo format
     * @param topicType The type of topic (INBOUND, OUTBOUND, CONNECTION)
     * @param accountId Optional account ID for inbound topics
     * @param additionalParams Additional parameters for the memo
     * @returns The created topic ID
     */
    private async createTopic(
        topicType: TopicType,
        accountId?: string,
        additionalParams?: string[]
    ): Promise<TopicId> {
        try {
            // Format the memo based on topic type
            let memo = `${HCS10_MEMO_PREFIX}:0:${DEFAULT_TTL}:${topicType}`;

            // Add account ID for inbound topics
            if (topicType === TopicType.INBOUND && accountId) {
                memo += `:${accountId}`;
            }

            // Add additional parameters if provided
            if (additionalParams?.length) {
                memo += `:${additionalParams.join(":")}`;
            }

            // Create the topic
            const transaction = new TopicCreateTransaction()
                .setTopicMemo(memo)
                .setAdminKey(this.operatorKey.publicKey);

            // Set submit key for outbound and connection topics
            if (topicType !== TopicType.INBOUND) {
                transaction.setSubmitKey(this.operatorKey.publicKey);
            }

            // Execute the transaction
            const txResponse = await transaction.execute(this.client);
            const receipt = await txResponse.getReceipt(this.client);
            const topicId = receipt.topicId;

            if (!topicId) {
                throw new Error("Failed to create topic: No topic ID returned");
            }

            return topicId;
        } catch (error) {
            console.error("Error creating topic:", error);
            throw error;
        }
    }

    /**
     * Send a message to a topic
     * @param topicId The topic ID to send the message to
     * @param message The message object to send
     * @returns The transaction ID
     */
    async sendMessage(topicId: TopicId | string, message: HCS10Message): Promise<string> {
        try {
            const topicIdObj = typeof topicId === 'string' ? TopicId.fromString(topicId) : topicId;

            // Convert message to JSON string
            const messageJson = JSON.stringify(message);

            // Submit the message to the topic
            const transaction = new TopicMessageSubmitTransaction()
                .setTopicId(topicIdObj)
                .setMessage(messageJson);

            const txResponse = await transaction.execute(this.client);
            const receipt = await txResponse.getReceipt(this.client);

            return txResponse.transactionId.toString();
        } catch (error) {
            console.error("Error sending message:", error);
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

            // Create connection request message
            const message: HCS10Message = {
                p: "hcs-10",
                op: HCS10Operation.CONNECTION_REQUEST,
                operator_id: `${this.inboundTopicId.toString()}@${this.operatorId}`,
            };

            if (memo) {
                message.m = memo;
            }

            // Send connection request to target agent's inbound topic
            const txId = await this.sendMessage(targetInboundTopicId, message);

            // Record the connection request in our outbound topic
            if (this.outboundTopicId) {
                const outboundMessage: HCS10Message = {
                    p: "hcs-10",
                    op: HCS10Operation.CONNECTION_REQUEST,
                    operator_id: `${targetInboundTopicId}@${this.operatorId}`,
                    outbound_topic_id: this.outboundTopicId.toString(),
                    connection_request_id: Date.now(), // Use timestamp as a simple sequence number
                };

                if (memo) {
                    outboundMessage.m = memo;
                }

                await this.sendMessage(this.outboundTopicId, outboundMessage);
            }

            // Add the connection to our map with pending status
            this.connections.set(targetInboundTopicId, {
                targetAccountId: "", // We don't know this yet
                targetInboundTopicId,
                status: "pending"
            });

            return txId;
        } catch (error) {
            console.error("Error requesting connection:", error);
            throw error;
        }
    }

    /**
     * Create a connection with another agent in response to a request
     * @param requesterId The requesting agent's account ID
     * @param requesterInboundTopicId The requesting agent's inbound topic ID
     * @param connectionId The connection ID from the request
     * @param memo Optional memo for the connection creation
     * @returns Object containing the connection topic ID and transaction ID
     */
    async createConnection(
        requesterId: string,
        requesterInboundTopicId: string,
        connectionId: number,
        memo?: string
    ): Promise<{ connectionTopicId: string, txId: string }> {
        try {
            if (!this.inboundTopicId || !this.outboundTopicId) {
                throw new Error("No topic IDs set. Call createAgentTopics first.");
            }

            // Create a connection topic with both agents' submit keys
            const connectionTopicId = await this.createTopic(
                TopicType.CONNECTION,
                undefined,
                [this.inboundTopicId.toString(), connectionId.toString()]
            );

            // Send connection created message to requester's inbound topic
            const message: HCS10Message = {
                p: "hcs-10",
                op: HCS10Operation.CONNECTION_CREATED,
                connection_topic_id: connectionTopicId.toString(),
                connected_account_id: requesterId,
                operator_id: `${this.inboundTopicId.toString()}@${this.operatorId}`,
                connection_id: connectionId
            };

            if (memo) {
                message.m = memo;
            }

            const txId = await this.sendMessage(requesterInboundTopicId, message);

            // Record connection created in our outbound topic
            const outboundMessage: HCS10Message = {
                p: "hcs-10",
                op: HCS10Operation.CONNECTION_CREATED,
                connection_topic_id: connectionTopicId.toString(),
                outbound_topic_id: this.outboundTopicId.toString(),
                requestor_outbound_topic_id: "", // We don't know this yet
                confirmed_request_id: Date.now(),
                connection_request_id: connectionId,
                operator_id: `${this.inboundTopicId.toString()}@${this.operatorId}`
            };

            if (memo) {
                outboundMessage.m = memo;
            }

            await this.sendMessage(this.outboundTopicId, outboundMessage);

            // Add the connection to our map with established status
            this.connections.set(requesterId, {
                targetAccountId: requesterId,
                targetInboundTopicId: requesterInboundTopicId,
                connectionTopicId: connectionTopicId.toString(),
                status: "established"
            });

            return {
                connectionTopicId: connectionTopicId.toString(),
                txId
            };
        } catch (error) {
            console.error("Error creating connection:", error);
            throw error;
        }
    }

    /**
     * Send a message to a connection
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
            if (!this.inboundTopicId) {
                throw new Error("No inbound topic ID set. Call createAgentTopics first.");
            }

            // Create message
            const message: HCS10Message = {
                p: "hcs-10",
                op: HCS10Operation.MESSAGE,
                operator_id: `${this.inboundTopicId.toString()}@${this.operatorId}`,
                data: content
            };

            if (memo) {
                message.m = memo;
            }

            // Send message to connection topic
            return await this.sendMessage(connectionTopicId, message);
        } catch (error) {
            console.error("Error sending connection message:", error);
            throw error;
        }
    }

    /**
     * Close a connection
     * @param connectionTopicId The connection topic ID
     * @param reason Optional reason for closing
     * @param memo Optional memo for the close operation
     * @returns The transaction ID
     */
    async closeConnection(
        connectionTopicId: string,
        reason?: string,
        memo?: string
    ): Promise<string> {
        try {
            if (!this.inboundTopicId || !this.outboundTopicId) {
                throw new Error("No topic IDs set. Call createAgentTopics first.");
            }

            // Create close connection message
            const message: HCS10Message = {
                p: "hcs-10",
                op: HCS10Operation.CLOSE_CONNECTION,
                operator_id: `${this.inboundTopicId.toString()}@${this.operatorId}`
            };

            if (reason) {
                message.reason = reason;
            }

            if (memo) {
                message.m = memo;
            }

            // Send close message to connection topic
            const txId = await this.sendMessage(connectionTopicId, message);

            // Record connection closed in our outbound topic
            const outboundMessage: HCS10Message = {
                p: "hcs-10",
                op: HCS10Operation.CONNECTION_CLOSED,
                connection_topic_id: connectionTopicId,
                close_method: "explicit",
                operator_id: `${this.inboundTopicId.toString()}@${this.operatorId}`
            };

            if (reason) {
                outboundMessage.reason = reason;
            }

            if (memo) {
                outboundMessage.m = memo;
            }

            await this.sendMessage(this.outboundTopicId, outboundMessage);

            // Remove the connection from our map
            for (const [key, config] of this.connections.entries()) {
                if (config.connectionTopicId === connectionTopicId) {
                    this.connections.delete(key);
                    break;
                }
            }

            return txId;
        } catch (error) {
            console.error("Error closing connection:", error);
            throw error;
        }
    }

    /**
     * Set the inbound and outbound topic IDs for an existing agent
     * @param inboundTopicId The agent's inbound topic ID
     * @param outboundTopicId The agent's outbound topic ID
     */
    setTopicIds(inboundTopicId: string | TopicId, outboundTopicId: string | TopicId): void {
        this.inboundTopicId = typeof inboundTopicId === 'string' ? TopicId.fromString(inboundTopicId) : inboundTopicId;
        this.outboundTopicId = typeof outboundTopicId === 'string' ? TopicId.fromString(outboundTopicId) : outboundTopicId;
    }

    /**
     * Get the client's inbound topic ID
     * @returns The inbound topic ID
     */
    getInboundTopicId(): string | undefined {
        return this.inboundTopicId?.toString();
    }

    /**
     * Get the client's outbound topic ID
     * @returns The outbound topic ID
     */
    getOutboundTopicId(): string | undefined {
        return this.outboundTopicId?.toString();
    }

    /**
     * Get the connection for a target
     * @param targetId The target account ID or inbound topic ID
     * @returns The connection configuration
     */
    getConnection(targetId: string): ConnectionConfig | undefined {
        return this.connections.get(targetId);
    }

    /**
     * Get all connections
     * @returns Map of all connections
     */
    getAllConnections(): Map<string, ConnectionConfig> {
        return this.connections;
    }
} 