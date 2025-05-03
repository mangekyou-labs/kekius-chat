import { HederaAgentKit } from 'hedera-agent-kit';
import { PrivateKey } from '@hashgraph/sdk';

export interface HederaWalletConfig {
    accountId: string;
    privateKey?: string;
    publicKey?: string;
    network?: 'mainnet' | 'testnet' | 'previewnet';
}

export class HederaWallet {
    private agentKit: HederaAgentKit | null = null;
    private config: HederaWalletConfig;

    constructor(config: HederaWalletConfig) {
        this.config = config;
    }

    connect(): HederaAgentKit {
        if (this.agentKit) {
            return this.agentKit;
        }

        const { accountId, privateKey, publicKey, network = 'testnet' } = this.config;

        if (!accountId) {
            throw new Error('Account ID is required to connect to Hedera');
        }

        // Create a new instance of HederaAgentKit
        this.agentKit = new HederaAgentKit(
            accountId,
            privateKey,
            publicKey,
            network
        );

        return this.agentKit;
    }

    disconnect(): void {
        this.agentKit = null;
    }

    isConnected(): boolean {
        return this.agentKit !== null;
    }

    // Generate a new key pair
    static generateKeyPair() {
        const privateKey = PrivateKey.generateED25519();
        const publicKey = privateKey.publicKey;

        return {
            privateKeyString: privateKey.toString(),
            publicKeyString: publicKey.toString()
        };
    }

    // Get the agent kit instance
    getAgentKit(): HederaAgentKit | null {
        return this.agentKit;
    }
}

// Helper function to create a wallet instance
export function createHederaWallet(config: HederaWalletConfig): HederaWallet {
    return new HederaWallet(config);
} 