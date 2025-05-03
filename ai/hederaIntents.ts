import { IntentCategorization } from "./intentClassification";

export interface Intent {
    description: string;
    examples: string[];
    keywords: string[];
}

export interface IntentDefinition {
    [key: string]: Intent;
}

export const HEDERA_INTENTS: IntentDefinition = {
    get_staking_info: {
        description: "Provides staking information for Hedera (HBAR).",
        examples: [
            "What are the current staking rewards on Hedera?",
            "Tell me about staking on Hedera network.",
            "Explain HBAR staking options.",
            "What's the current staking APY for HBAR?",
            "How do I stake my HBAR?"
        ],
        keywords: [
            "staking", "stake HBAR", "HBAR staking", "staking rewards",
            "staking APY", "node staking", "validator staking"
        ]
    },
    transfer_hbar: {
        description: "Handles token transfers to another Hedera address.",
        examples: [
            "Send 10 HBAR to 0.0.12345",
            "Transfer 5 USDC to this Hedera account: 0.0.54321",
            "I want to send HBAR to my friend.",
            "Send tokens to this address.",
            "Move 100 HBAR from my wallet."
        ],
        keywords: [
            "send", "transfer", "pay", "send HBAR", "send tokens",
            "transfer HBAR", "send crypto", "payment", "hedera transfer"
        ]
    },
    get_token_price: {
        description: "Fetches the estimated USDT price for a given token on Hedera.",
        examples: [
            "What's the price of HBAR right now?",
            "Get me the current value of USDC.",
            "How much is 1 HBAR worth?",
            "Check price for HBAR token.",
            "What's the exchange rate for HBAR to USD?"
        ],
        keywords: [
            "price", "token price", "HBAR price", "token value",
            "exchange rate", "worth", "current price", "market price"
        ]
    },
    get_latest_consensus: {
        description: "Fetches and displays the latest consensus topics on Hedera.",
        examples: [
            "I want to see the latest consensus topics on Hedera.",
            "Get me the most recent HCS messages.",
            "Show me the newest Hedera Consensus Service data.",
            "What are the current consensus topics happening on Hedera?",
            "Fetch the latest Hedera consensus details."
        ],
        keywords: [
            "consensus", "Hedera consensus", "HCS", "consensus service",
            "latest topics", "consensus topics", "messaging", "topics"
        ]
    },
    search_tx: {
        description: "Searches for a transaction on Hedera Explorer.",
        examples: [
            "Find this transaction hash on Hedera.",
            "Look up 0.0.12345@1623456789.000000000 on HashScan.",
            "Show me details for this tx hash.",
            "Can you check the status of this transaction?",
            "Track this Hedera transaction for me."
        ],
        keywords: [
            "transaction", "tx", "hash", "transaction hash", "check transaction",
            "tx details", "transaction status", "find transaction", "explorer"
        ]
    },
    unstake_hbar: {
        description: "Handles the process of unstaking Hedera (HBAR) tokens from a node.",
        examples: [
            "I want to unstake my HBAR.",
            "How do I unstake from the network?",
            "Unstake all my staked HBAR.",
            "Withdraw my staked tokens.",
            "Remove my staked HBAR from node 0.0.3."
        ],
        keywords: [
            "unstake", "withdraw stake", "remove stake", "stop staking",
            "unstake HBAR", "end staking", "retrieve staked tokens"
        ]
    },
    get_own_balance: {
        description: "Retrieves the user's own wallet balances using their Hedera address.",
        examples: [
            "What's my HBAR balance?",
            "How much USDT do I have in my Hedera wallet?",
            "Show me my tokens.",
            "Fetch my Hedera portfolio.",
            "Check my wallet balance."
        ],
        keywords: [
            "my balance", "check balance", "my tokens", "wallet balance",
            "fetch my assets", "retrieve my portfolio", "my Hedera tokens",
            "list my tokens", "my Hedera wallet", "check my funds"
        ]
    },
    check_account_balance: {
        description: "Retrieves the full portfolio details of another user's Hedera address, including token balances and asset distribution.",
        examples: [
            "Check balance of 0.0.12345.",
            "What assets does this Hedera wallet hold?",
            "Retrieve the holdings of this Hedera address.",
            "Show me the tokens in 0.0.54321.",
            "Can you analyze the portfolio of this Hedera address?"
        ],
        keywords: [
            "check address", "wallet balance", "address holdings",
            "token balance", "check portfolio", "account assets",
            "show portfolio", "fetch holdings", "Hedera wallet details",
            "lookup address", "scan address", "check account",
            "another wallet", "Hedera address assets", "wallet scan"
        ]
    },
    token_swap: {
        description: "Helps users swap tokens on Hedera Network.",
        examples: [
            "I want to swap 5 HBAR for USDC.",
            "Exchange my HBAR for USDT.",
            "How can I convert HBAR to other tokens?",
            "Swap between tokens on Hedera.",
            "Trade my HBAR for another token."
        ],
        keywords: [
            "swap", "exchange", "convert", "trade", "token swap",
            "HBAR swap", "exchange tokens", "token conversion"
        ]
    },
    search_hedera_news: {
        description: "Finds the latest Hedera news on social media and news sites.",
        examples: [
            "What's the latest news about Hedera?",
            "Find Hedera updates on Twitter.",
            "Show me recent Hedera announcements.",
            "Get me the latest HBAR news.",
            "What's happening with Hedera recently?"
        ],
        keywords: [
            "hedera news", "latest hedera updates", "hedera twitter",
            "recent hedera posts", "hedera social media", "news", "updates"
        ]
    },
    joke: {
        description: "Tells a blockchain/crypto related joke.",
        examples: [
            "Tell me a joke about crypto.",
            "Make me laugh with a blockchain joke.",
            "Do you know any funny HBAR jokes?",
            "Share a humorous fact about cryptocurrencies.",
            "I need a laugh - tell me a joke about Hedera!"
        ],
        keywords: [
            "joke", "funny", "humor", "laugh", "comedy",
            "crypto joke", "blockchain joke", "Hedera joke"
        ]
    },
    irrelevant: {
        description: "Handles topics that are irrelevant to Hedera.",
        examples: [
            "Can you help me with my homework?",
            "What's the weather like today?",
            "Tell me about crypto outside Hedera.",
            "I need help with my taxes.",
            "Write me some Python code."
        ],
        keywords: [
            "crypto outside Hedera", "trading bots", "automated trading",
            "smart contract outside Hedera", "blockchain other than Hedera",
            "homework", "dating", "taxes", "weather", "non-crypto"
        ]
    },
    agent_conversation: {
        description: "Handle conversations between agents.",
        examples: [
            "Can Sonia and Jecta have a conversation?",
            "Let Jecta and Sonia have a debate about Hedera.",
            "What would Sonia say to Jecta about crypto?",
            "Have the agents discuss the future of blockchain."
        ],
        keywords: [
            "agents talk", "debate", "discussion", "conversation",
            "talk to each other", "agents interact", "Sonia and Jecta"
        ]
    },
    get_metrics: {
        description: "Fetches the Total Value Locked (TVL) details of the Hedera Ecosystem, including top protocols and aggregated TVL.",
        examples: [
            "Give me the details of the TVLs of Hedera Ecosystem.",
            "Show me the total TVL of Hedera.",
            "List the top protocols on Hedera by TVL.",
            "Fetch Hedera's DeFi TVL rankings.",
            "What are the biggest protocols by TVL on Hedera?"
        ],
        keywords: [
            "TVL", "Hedera TVL", "total value locked", "protocol TVL",
            "top TVL protocols", "Hedera ecosystem TVL", "defi TVL",
            "biggest protocols by TVL", "tvl details", "hedera defi rankings"
        ]
    },
    get_governance_proposals: {
        description: "Fetches and displays recent governance proposals on the Hedera network.",
        examples: [
            "I want to see the proposals of Hedera.",
            "Show me the Hedera governance proposals.",
            "List current proposals.",
            "What are the latest governance proposals?",
            "Display active proposals on Hedera.",
            "Get me the most recent Hedera proposals.",
            "What's happening in Hedera governance?"
        ],
        keywords: [
            "proposal", "proposals", "governance", "hedera governance",
            "latest proposals", "recent proposals", "active proposals",
            "governance update", "governance list", "hedera proposals",
            "governance activity", "see proposals", "get proposals",
            "show proposals", "fetch proposals", "display proposals",
            "proposals of Hedera", "current proposals", "governance overview"
        ]
    },
    token_info: {
        description: "Get information about a specific token on Hedera.",
        examples: [
            "Tell me about HBAR token.",
            "What's the market cap of HBAR?",
            "Give me details on this Hedera token.",
            "What is the circulating supply of HBAR?",
            "Information about USDC on Hedera."
        ],
        keywords: [
            "token info", "token details", "market cap", "circulation",
            "token supply", "token stats", "token analysis", "token data",
            "about token", "token description", "token overview"
        ]
    },
    general_questions: {
        description: "Handles general questions about Hedera, greetings, and polite interactions.",
        examples: [
            "Hello there!",
            "How are you?",
            "Thank you for your help.",
            "What can you do?",
            "Tell me about Hedera.",
            "Can you explain how Hedera works?",
            "What makes Hedera special?",
            "I'm new to Hedera—where should I start?",
            "How does staking work on Hedera?",
            "Is Hedera good for trading?"
        ],
        keywords: [
            "hi", "hello", "thanks", "goodbye", "help", "capabilities",
            "Hedera", "blockchain", "crypto basics", "how does Hedera work",
            "explain Hedera", "what is Hedera", "learn about Hedera",
            "getting started with Hedera", "understanding Hedera",
            "features", "introduction", "benefits"
        ]
    }
};

export default function classifyHederaIntent(input: string): string {
    const intentClassifier = new IntentCategorization(HEDERA_INTENTS);
    return intentClassifier.classify(input);
} 