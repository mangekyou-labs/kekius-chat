import { HederaAgentKit } from 'hedera-agent-kit';
import { TopicId } from '@hashgraph/sdk';
import { createHederaWallet, HederaWalletConfig } from '../../wallet/hederaWallet';

// Create and initialize wallet
let agentKit: HederaAgentKit | null = null;

export async function initializeAgentKit(config: HederaWalletConfig): Promise<HederaAgentKit> {
    if (agentKit) return agentKit;

    const wallet = createHederaWallet(config);
    agentKit = wallet.connect();
    return agentKit;
}

/**
 * Create a new topic for agent communication
 * @param topicMemo Topic description or memo
 * @param isSubmitKey Whether to use submit key
 * @param custodial Whether to use custodial or non-custodial mode
 * @returns Topic creation result
 */
export async function createTopic(
    topicMemo: string,
    isSubmitKey: boolean = false,
    custodial: boolean = true
) {
    try {
        if (!agentKit) {
            throw new Error('Agent Kit not initialized. Call initializeAgentKit first.');
        }

        const result = await agentKit.createTopic(
            topicMemo,
            isSubmitKey,
            custodial
        );

        return result;
    } catch (error) {
        console.error('Error creating topic:', error);
        throw error;
    }
}

/**
 * Submit a message to a topic
 * @param topicId Topic ID
 * @param message Message content
 * @param custodial Whether to use custodial or non-custodial mode
 * @returns Message submission result
 */
export async function submitMessage(
    topicId: string,
    message: string,
    custodial: boolean = true
) {
    try {
        if (!agentKit) {
            throw new Error('Agent Kit not initialized. Call initializeAgentKit first.');
        }

        const result = await agentKit.submitTopicMessage(
            TopicId.fromString(topicId),
            message,
            custodial
        );

        return result;
    } catch (error) {
        console.error('Error submitting message:', error);
        throw error;
    }
}

/**
 * Get topic information
 * @param topicId Topic ID
 * @param networkType Network type
 * @returns Topic information
 */
export async function getTopicInfo(
    topicId: string,
    networkType: 'mainnet' | 'testnet' | 'previewnet' = 'testnet'
) {
    try {
        if (!agentKit) {
            throw new Error('Agent Kit not initialized. Call initializeAgentKit first.');
        }

        const info = await agentKit.getTopicInfo(
            TopicId.fromString(topicId),
            networkType
        );

        return info;
    } catch (error) {
        console.error('Error getting topic info:', error);
        throw error;
    }
}

/**
 * Get messages from a topic
 * @param topicId Topic ID
 * @param networkType Network type
 * @param lowerTimestamp Lower timestamp boundary
 * @param upperTimestamp Upper timestamp boundary
 * @returns Array of topic messages
 */
export async function getTopicMessages(
    topicId: string,
    networkType: 'mainnet' | 'testnet' | 'previewnet' = 'testnet',
    lowerTimestamp?: number,
    upperTimestamp?: number
) {
    try {
        if (!agentKit) {
            throw new Error('Agent Kit not initialized. Call initializeAgentKit first.');
        }

        const messages = await agentKit.getTopicMessages(
            TopicId.fromString(topicId),
            networkType,
            lowerTimestamp,
            upperTimestamp
        );

        return messages;
    } catch (error) {
        console.error('Error getting topic messages:', error);
        return [];
    }
}

/**
 * Delete a topic
 * @param topicId Topic ID
 * @param custodial Whether to use custodial or non-custodial mode
 * @returns Topic deletion result
 */
export async function deleteTopic(
    topicId: string,
    custodial: boolean = true
) {
    try {
        if (!agentKit) {
            throw new Error('Agent Kit not initialized. Call initializeAgentKit first.');
        }

        const result = await agentKit.deleteTopic(
            TopicId.fromString(topicId),
            custodial
        );

        return result;
    } catch (error) {
        console.error('Error deleting topic:', error);
        throw error;
    }
}

/**
 * Format messages for display
 * @param messages Array of HCS messages
 * @returns Formatted message objects
 */
export function formatMessages(messages: any[]) {
    if (!messages || messages.length === 0) {
        return [];
    }

    return messages.map(msg => ({
        id: msg.sequenceNumber || msg.id,
        sender: msg.payer || msg.sender,
        content: msg.message,
        timestamp: msg.consensusTimestamp,
        topicId: msg.topicId,
    }));
}

/**
 * Extract topic ID from a message
 * @param userMessage User message
 * @returns Extracted topic ID or null
 */
export const getTopicFromMessage = (userMessage: string) => {
    // Regular expression to match Hedera topic IDs (0.0.XXXXX format)
    const topicIdRegex = /\b0\.0\.\d+\b/g;
    const matches = userMessage.match(topicIdRegex);

    if (matches && matches.length > 0) {
        return matches[0];
    }

    return null;
}; 