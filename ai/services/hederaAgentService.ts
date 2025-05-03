import { HederaAgentKit } from 'hedera-agent-kit';
import * as hederaTokenTools from '../tools/hederaTokenTools';
import * as hederaMessaging from '../tools/hederaMessaging';
import { HederaWalletConfig } from '../../wallet/hederaWallet';

// Default network configuration
const DEFAULT_NETWORK = 'testnet';

/**
 * HederaAgentService provides a high-level interface for the AI agent to interact with Hedera
 */
export class HederaAgentService {
    private agentKit: HederaAgentKit | null = null;
    private config: HederaWalletConfig;
    private initialized: boolean = false;

    constructor(config: HederaWalletConfig) {
        this.config = config;
    }

    /**
     * Initialize the Hedera Agent Kit
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            // Initialize the agent kit
            this.agentKit = await hederaTokenTools.initializeAgentKit(this.config);

            // Share the same agent kit instance with the messaging module
            await hederaMessaging.initializeAgentKit(this.config);

            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize Hedera Agent Service:', error);
            throw error;
        }
    }

    /**
     * Process a user query about tokens and get relevant information
     * @param query User's query text
     * @returns Response with token information
     */
    async processTokenQuery(query: string): Promise<any> {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Extract token ID from the query
            const tokenId = hederaTokenTools.getTokenFromMessage(query);

            if (!tokenId) {
                return {
                    success: false,
                    message: "No valid Hedera token ID found in the query. Please provide a token ID in the format 0.0.XXXXX."
                };
            }

            // Get token details
            const tokenDetails = await hederaTokenTools.getTokenDetails(tokenId, DEFAULT_NETWORK as any);

            if (!tokenDetails) {
                return {
                    success: false,
                    message: `Could not find token details for ${tokenId}.`
                };
            }

            // Get token holders
            const holders = await hederaTokenTools.getTokenHolders(tokenId, DEFAULT_NETWORK as any);

            return {
                success: true,
                tokenDetails,
                holders,
                formattedHoldersTable: hederaTokenTools.generateTokenHoldersTableHTML(holders)
            };
        } catch (error) {
            console.error('Error processing token query:', error);
            return {
                success: false,
                message: `Error processing token query: ${error}`
            };
        }
    }

    /**
     * Process a messaging query and interact with the HCS (Hedera Consensus Service)
     * @param query User's query text
     * @returns Response with messaging information
     */
    async processMessagingQuery(query: string): Promise<any> {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Extract topic ID from the query
            const topicId = hederaMessaging.getTopicFromMessage(query);

            if (!topicId) {
                // Create a new topic if no topic ID was found
                const topicMemo = `AI Agent Communication Channel - ${new Date().toISOString()}`;
                const result = await hederaMessaging.createTopic(topicMemo, true);

                return {
                    success: true,
                    action: 'created',
                    result,
                    message: `Created a new topic for agent communication.`
                };
            }

            // Get topic info and messages
            const topicInfo = await hederaMessaging.getTopicInfo(topicId, DEFAULT_NETWORK as any);
            const messages = await hederaMessaging.getTopicMessages(topicId, DEFAULT_NETWORK as any);

            return {
                success: true,
                action: 'query',
                topicInfo,
                messages: hederaMessaging.formatMessages(messages),
                message: `Found ${messages.length} messages on topic ${topicId}.`
            };
        } catch (error) {
            console.error('Error processing messaging query:', error);
            return {
                success: false,
                message: `Error processing messaging query: ${error}`
            };
        }
    }

    /**
     * Send a message to a topic
     * @param topicId Topic ID
     * @param message Message to send
     * @returns Result of the message submission
     */
    async sendMessage(topicId: string, message: string): Promise<any> {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const result = await hederaMessaging.submitMessage(topicId, message);

            return {
                success: true,
                result,
                message: `Message successfully sent to topic ${topicId}.`
            };
        } catch (error) {
            console.error('Error sending message:', error);
            return {
                success: false,
                message: `Error sending message: ${error}`
            };
        }
    }

    /**
     * Transfer tokens to another account
     * @param tokenId Token ID
     * @param recipientId Recipient account ID
     * @param amount Amount to transfer
     * @returns Result of the token transfer
     */
    async transferToken(tokenId: string, recipientId: string, amount: number): Promise<any> {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const result = await hederaTokenTools.transferToken(tokenId, recipientId, amount);

            return {
                success: true,
                result,
                message: `Successfully transferred ${amount} of token ${tokenId} to ${recipientId}.`
            };
        } catch (error) {
            console.error('Error transferring token:', error);
            return {
                success: false,
                message: `Error transferring token: ${error}`
            };
        }
    }

    /**
     * Get all token balances for the current account
     * @returns Token balance information
     */
    async getAllBalances(): Promise<any> {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const balances = await hederaTokenTools.getAllTokenBalances(DEFAULT_NETWORK as any);

            return {
                success: true,
                balances: hederaTokenTools.formatTokenBalanceData(balances),
                message: `Found ${balances.length} token balances.`
            };
        } catch (error) {
            console.error('Error getting token balances:', error);
            return {
                success: false,
                message: `Error getting token balances: ${error}`
            };
        }
    }
} 