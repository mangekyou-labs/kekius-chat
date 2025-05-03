import axios from "axios";
import { formatHbarAmount } from "./hederaTools";

interface StakingInfo {
    accountId: string;
    stakingPeriodStart: string;
    stakingPeriodEnd: string;
    stakedNodeId: string;
    stakedAmount: string;
    pendingReward: string;
    declinedReward: boolean;
}

interface StakingData {
    accountId: string;
    totalStaked: string;
    nodeStakes: Array<{
        nodeId: string;
        stake: string;
    }>;
    pendingRewards: string;
    stakingPeriod: {
        start: string;
        end: string;
    };
}

// Function to fetch the top staking nodes on Hedera
export async function fetchLatestAuction(node_id?: string | null) {
    try {
        // Mock data - in a real implementation you would fetch this from Hedera's Mirror Node
        // or another API that provides staking information
        const stakingData: StakingData[] = await fetchStakingData();

        if (!stakingData || stakingData.length === 0) {
            return "No active staking data available";
        }

        // If a specific node ID is provided, filter for it
        let filteredData = stakingData;
        if (node_id) {
            filteredData = stakingData.filter(data =>
                data.nodeStakes.some(node => node.nodeId === node_id)
            );

            if (filteredData.length === 0) {
                return `No staking data found for node ${node_id}`;
            }
        }

        return formatStakingDataAsHTML(filteredData);
    } catch (error) {
        console.error('Error fetching Hedera staking data:', error);
        return null;
    }
}

// Function to fetch staking data from Hedera Mirror Node
async function fetchStakingData(): Promise<StakingData[]> {
    try {
        // NOTE: This is simplified mock data
        // In a production implementation, you would call the Hedera Mirror Node API
        // to get real staking data

        const mockData: StakingData[] = [
            {
                accountId: "0.0.1234",
                totalStaked: "100000000000", // 1,000 HBAR in tinybars
                nodeStakes: [
                    { nodeId: "0.0.3", stake: "50000000000" },
                    { nodeId: "0.0.4", stake: "50000000000" }
                ],
                pendingRewards: "5000000000", // 50 HBAR in tinybars
                stakingPeriod: {
                    start: "2023-01-01T00:00:00Z",
                    end: "2024-01-01T00:00:00Z"
                }
            },
            {
                accountId: "0.0.5678",
                totalStaked: "200000000000", // 2,000 HBAR in tinybars
                nodeStakes: [
                    { nodeId: "0.0.3", stake: "100000000000" },
                    { nodeId: "0.0.5", stake: "100000000000" }
                ],
                pendingRewards: "10000000000", // 100 HBAR in tinybars
                stakingPeriod: {
                    start: "2023-02-01T00:00:00Z",
                    end: "2024-02-01T00:00:00Z"
                }
            },
            {
                accountId: "0.0.9012",
                totalStaked: "500000000000", // 5,000 HBAR in tinybars
                nodeStakes: [
                    { nodeId: "0.0.6", stake: "500000000000" }
                ],
                pendingRewards: "25000000000", // 250 HBAR in tinybars
                stakingPeriod: {
                    start: "2023-03-01T00:00:00Z",
                    end: "2024-03-01T00:00:00Z"
                }
            }
        ];

        return mockData;

        // Real implementation would look something like:
        // const response = await axios.get("https://mainnet-public.mirrornode.hedera.com/api/v1/network/staking");
        // return response.data;
    } catch (error) {
        console.error("Error fetching staking data:", error);
        return [];
    }
}

function formatStakingDataAsHTML(stakingData: StakingData[]): string {
    const formatTimestamp = (timestamp: string) =>
        new Date(timestamp).toLocaleString();

    const stakingItems = stakingData.map((data, index) => {
        const nodeStakes = data.nodeStakes.map((node, nodeIndex) =>
            `<strong>Node ${nodeIndex + 1}:</strong> ID: ${node.nodeId}, Staked: ${formatHbarAmount(parseInt(node.stake))}<br>`
        ).join('');

        return `<div class="staking-item">
      <strong>Account ${index + 1}:</strong> ${data.accountId}<br>
      <strong>Total Staked:</strong> ${formatHbarAmount(parseInt(data.totalStaked))}<br>
      <strong>Pending Rewards:</strong> ${formatHbarAmount(parseInt(data.pendingRewards))}<br>
      <strong>Staking Period:</strong> ${formatTimestamp(data.stakingPeriod.start)} to ${formatTimestamp(data.stakingPeriod.end)}<br>
      <h3>Node Stakes:</h3>
      ${nodeStakes}
    </div><br>`;
    }).join('');

    return `
    <h1>Hedera Staking Information</h1><br>
    <p>The following accounts have active staking on the Hedera network:</p><br>
    ${stakingItems}
  `;
}

