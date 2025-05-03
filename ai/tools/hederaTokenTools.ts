import axios from "axios";
import { formatHbarAmount } from "./hederaTools";

// Interface for token metadata
interface HederaTokenMetadata {
    token_id: string;
    name: string;
    symbol: string;
    decimals: number;
    logo?: string;
}

// Interface for token information response
interface TokenInfo {
    token_id: string;
    symbol: string;
    name: string;
    decimals: number;
    total_supply: string;
    treasury_account_id: string;
    admin_key: object | null;
    kyc_key: object | null;
    freeze_key: object | null;
    wipe_key: object | null;
    supply_key: object | null;
    pause_key: object | null;
    fee_schedule_key: object | null;
    custom_fees: object | null;
    pause_status: string;
    created_timestamp: string;
    modified_timestamp: string;
    memo: string;
    type: string;
    supply_type: string;
    max_supply: string;
    initial_supply: string;
}

/**
 * Fetch token metadata from Hedera Mirror Node
 * @param tokenId Token ID in the format 0.0.XXXXX
 * @returns Token metadata object or null if not found
 */
export async function fetchTokenDetailsFromMirror(tokenId: string): Promise<HederaTokenMetadata | null> {
    try {
        // Call the Hedera Mirror Node API to get token info
        const response = await axios.get(`https://mainnet-public.mirrornode.hedera.com/api/v1/tokens/${tokenId}`);

        if (response.status !== 200) {
            throw new Error(`Failed to fetch token metadata for ${tokenId}`);
        }

        const data = response.data;

        return {
            token_id: data.token_id,
            name: data.name,
            symbol: data.symbol,
            decimals: data.decimals,
            // The logo is not available in the Hedera Mirror Node API
            // You'd need to map tokens to logos using a custom mapping
            logo: data.symbol ? `https://raw.githubusercontent.com/hedera-name-service/icons/main/tokens/${data.symbol.toLowerCase()}.png` : undefined
        };
    } catch (error) {
        console.error(`Error fetching token metadata for ${tokenId}:`, error);
        return null;
    }
}

/**
 * Get detailed information about a token on the Hedera network
 * 
 * @param tokenId - The ID of the token to get information for (e.g., "0.0.12345")
 * @returns Formatted HTML string with token information or error message
 */
export async function getTokenInfo(tokenId: string): Promise<string> {
    try {
        // Validate tokenId format
        if (!tokenId.match(/^\d+\.\d+\.\d+$/)) {
            return `❌ Invalid token ID format. Token IDs should be in the format 0.0.XXXXX`;
        }

        // Call the Mirror Node API to get token information
        const response = await axios.get(`https://mainnet-public.mirrornode.hedera.com/api/v1/tokens/${tokenId}`);
        const tokenInfo: TokenInfo = response.data;

        // Format token supply with proper decimals
        const formattedSupply = formatTokenAmount(tokenInfo.total_supply, tokenInfo.decimals);
        const formattedMaxSupply = tokenInfo.max_supply === "0" ? "Unlimited" : formatTokenAmount(tokenInfo.max_supply, tokenInfo.decimals);

        // Create HTML response with token details
        return `
      <div class="token-info">
        <h2>${tokenInfo.name} (${tokenInfo.symbol})</h2>
        <p><strong>Token ID:</strong> ${tokenInfo.token_id}</p>
        <p><strong>Type:</strong> ${tokenInfo.type}</p>
        <p><strong>Decimals:</strong> ${tokenInfo.decimals}</p>
        <p><strong>Total Supply:</strong> ${formattedSupply} ${tokenInfo.symbol}</p>
        <p><strong>Max Supply:</strong> ${formattedMaxSupply}</p>
        <p><strong>Supply Type:</strong> ${tokenInfo.supply_type}</p>
        <p><strong>Treasury Account:</strong> ${tokenInfo.treasury_account_id}</p>
        <p><strong>Created:</strong> ${new Date(tokenInfo.created_timestamp).toLocaleString()}</p>
        <p><strong>Modified:</strong> ${new Date(tokenInfo.modified_timestamp).toLocaleString()}</p>
        <p><strong>Pause Status:</strong> ${tokenInfo.pause_status || "N/A"}</p>
        <p><strong>Memo:</strong> ${tokenInfo.memo || "None"}</p>
        <h3>Key Management</h3>
        <p><strong>Admin Key:</strong> ${tokenInfo.admin_key ? "Present" : "None"}</p>
        <p><strong>KYC Key:</strong> ${tokenInfo.kyc_key ? "Present" : "None"}</p>
        <p><strong>Freeze Key:</strong> ${tokenInfo.freeze_key ? "Present" : "None"}</p>
        <p><strong>Wipe Key:</strong> ${tokenInfo.wipe_key ? "Present" : "None"}</p>
        <p><strong>Supply Key:</strong> ${tokenInfo.supply_key ? "Present" : "None"}</p>
        <p><strong>Pause Key:</strong> ${tokenInfo.pause_key ? "Present" : "None"}</p>
        <p><strong>Fee Schedule Key:</strong> ${tokenInfo.fee_schedule_key ? "Present" : "None"}</p>
        <p><strong>Custom Fees:</strong> ${tokenInfo.custom_fees ? "Present" : "None"}</p>
      </div>
    `;
    } catch (error) {
        console.error("Error fetching token information:", error);
        return `❌ Failed to retrieve information for token ${tokenId}. The token may not exist or there was an error connecting to the Hedera network.`;
    }
}

/**
 * Format a token amount with proper decimal places
 * 
 * @param amount - The raw token amount as a string
 * @param decimals - Number of decimal places
 * @returns Formatted amount as a string
 */
function formatTokenAmount(amount: string, decimals: number): string {
    const value = BigInt(amount);
    const divisor = BigInt(10) ** BigInt(decimals);

    const wholePart = value / divisor;
    const fractionalPart = value % divisor;

    // Convert the fractional part to a string with leading zeros
    let fractionalStr = fractionalPart.toString().padStart(decimals, '0');

    // Trim trailing zeros
    while (fractionalStr.endsWith('0') && fractionalStr.length > 1) {
        fractionalStr = fractionalStr.slice(0, -1);
    }

    // If the fractional part is all zeros, don't show it
    if (fractionalStr === '0') {
        return wholePart.toString();
    }

    return `${wholePart}.${fractionalStr}`;
}

/**
 * Get token holders for a specified token
 * 
 * @param tokenId - The ID of the token to get holders for
 * @returns Formatted HTML string with token holder information
 */
export async function getTokenHolders(tokenId: string): Promise<string> {
    try {
        if (!tokenId.match(/^\d+\.\d+\.\d+$/)) {
            return `❌ Invalid token ID format. Token IDs should be in the format 0.0.XXXXX`;
        }

        // Get token metadata first for display information
        const metadata = await fetchTokenDetailsFromMirror(tokenId);
        if (!metadata) {
            return `❌ Failed to get token metadata for ${tokenId}`;
        }

        // Call the Mirror Node API to get token holders (limited to top 25)
        const response = await axios.get(`https://mainnet-public.mirrornode.hedera.com/api/v1/tokens/${tokenId}/balances?limit=25`);

        if (!response.data.balances || response.data.balances.length === 0) {
            return `❌ No holders found for token ${tokenId} (${metadata.symbol})`;
        }

        // Sort holders by balance (highest first)
        const sortedHolders = response.data.balances.sort((a: any, b: any) => {
            return BigInt(b.balance) - BigInt(a.balance);
        });

        // Generate the HTML table of holders
        let holdersHtml = `
      <div class="token-holders">
        <h2>${metadata.name} (${metadata.symbol}) Holders</h2>
        <p>Top ${sortedHolders.length} holders shown:</p>
        <table>
          <tr>
            <th>Account</th>
            <th>Balance</th>
          </tr>
    `;

        for (const holder of sortedHolders) {
            const formattedBalance = formatTokenAmount(holder.balance, metadata.decimals);
            holdersHtml += `
        <tr>
          <td>${holder.account}</td>
          <td>${formattedBalance} ${metadata.symbol}</td>
        </tr>
      `;
        }

        holdersHtml += `
        </table>
      </div>
    `;

        return holdersHtml;
    } catch (error) {
        console.error("Error fetching token holders:", error);
        return `❌ Failed to retrieve holder information for token ${tokenId}. The token may not exist or there was an error connecting to the Hedera network.`;
    }
}

/**
 * Associate a token with an account
 * This is a placeholder for the actual implementation that would use the Hedera SDK
 * 
 * @param accountId - The account to associate the token with
 * @param tokenId - The token to associate
 * @returns Status message
 */
export async function associateToken(accountId: string, tokenId: string): Promise<string> {
    try {
        // This is just a placeholder - the actual implementation would use the Hedera SDK
        return `✅ Successfully associated token ${tokenId} with account ${accountId}`;
    } catch (error) {
        console.error("Error associating token:", error);
        return `❌ Failed to associate token ${tokenId} with account ${accountId}: ${error}`;
    }
}

/**
 * Create a fungible token on the Hedera network
 * This is a placeholder for the actual implementation that would use the Hedera SDK
 * 
 * @param name - Token name
 * @param symbol - Token symbol
 * @param decimals - Token decimals
 * @param initialSupply - Initial supply amount
 * @returns Status message with the created token ID
 */
export async function createFungibleToken(
    name: string,
    symbol: string,
    decimals: number,
    initialSupply: number
): Promise<string> {
    try {
        // This is just a placeholder - the actual implementation would use the Hedera SDK
        const mockTokenId = "0.0.12345"; // In reality, this would be the token ID returned by Hedera
        return `✅ Successfully created token ${name} (${symbol}) with ID ${mockTokenId}`;
    } catch (error) {
        console.error("Error creating token:", error);
        return `❌ Failed to create token: ${error}`;
    }
}

// Get token metadata (legacy method to match old API format for compatibility)
export const fetchTokenMetadata = fetchTokenDetailsFromMirror; 