import axios from "axios";
import { fetchTokenPriceDirectly } from "./fetchTokenPrice";
import { formatHbarAmount } from "./hederaTools";

interface HederaTokenMetadata {
  token_id: string;
  name: string;
  symbol: string;
  decimals: number;
  logo?: string;
}

export async function fetchTokenMetadata(tokenId: string): Promise<HederaTokenMetadata | null> {
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

export const fetchHederaBalance = async (hederaAddress: string) => {
  try {
    // Fetch HBAR balance from the Mirror Node
    const accountResponse = await axios.get(`https://mainnet-public.mirrornode.hedera.com/api/v1/accounts/${hederaAddress}`);

    if (accountResponse.status !== 200) {
      throw new Error(`Failed to fetch account data for ${hederaAddress}`);
    }

    const hbarBalance = accountResponse.data.balance.balance;

    // Fetch tokens for the account
    const tokensResponse = await axios.get(`https://mainnet-public.mirrornode.hedera.com/api/v1/accounts/${hederaAddress}/tokens`);

    if (tokensResponse.status !== 200) {
      throw new Error(`Failed to fetch token data for ${hederaAddress}`);
    }

    const tokenBalances = tokensResponse.data.tokens;
    const nonZeroTokens = tokenBalances.filter((token: any) => parseInt(token.balance) > 0);

    // Format HBAR balance
    const formattedHbar = [{
      symbol: "HBAR",
      amount: parseFloat(hbarBalance) / 10 ** 8, // HBAR has 8 decimals
      balance: parseFloat(hbarBalance) / 10 ** 8, // Using HBAR as its own value for simplicity
      logo: "https://raw.githubusercontent.com/hedera-name-service/icons/main/tokens/hbar.png",
      address: "HBAR"
    }];

    // Format token balances
    const formattedTokenBalances = [];

    for (const token of nonZeroTokens) {
      const metadata = await fetchTokenMetadata(token.token_id);

      if (!metadata) {
        continue;
      }

      const decimals = metadata.decimals;
      const logo = metadata.logo || "";
      const symbol = metadata.symbol;

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get the token price if available
      const price = await fetchTokenPriceDirectly(symbol);

      let balance = 0;
      const amount = parseFloat(token.balance) / 10 ** decimals;

      if (price !== null) {
        balance = amount * Number(price);
      }

      formattedTokenBalances.push({
        symbol: symbol,
        amount: amount,
        balance: balance,
        logo: logo,
        address: token.token_id
      });
    }

    // Return HBAR and token balances
    return {
      hbar: formattedHbar,
      tokens: formattedTokenBalances
    };
  } catch (error) {
    console.error("❌ Error fetching Hedera balance:", error);
    return null;
  }
};

// Helper function to convert NFT IDs to proper format
export const formatNftId = (tokenId: string, serialNumber: number): string => {
  return `${tokenId}/${serialNumber}`;
};

// Function to fetch NFTs owned by an account
export const fetchHederaNfts = async (hederaAddress: string) => {
  try {
    const response = await axios.get(`https://mainnet-public.mirrornode.hedera.com/api/v1/accounts/${hederaAddress}/nfts`);

    if (response.status !== 200) {
      throw new Error(`Failed to fetch NFT data for ${hederaAddress}`);
    }

    const nfts = response.data.nfts;
    const formattedNfts = [];

    for (const nft of nfts) {
      const tokenMetadata = await fetchTokenMetadata(nft.token_id);

      if (!tokenMetadata) {
        continue;
      }

      // For each NFT, we'd typically want to fetch its metadata
      // This would typically be done by fetching from IPFS using the metadata URI
      // For simplicity, we're just using basic token metadata
      formattedNfts.push({
        tokenId: nft.token_id,
        serialNumber: nft.serial_number,
        nftId: formatNftId(nft.token_id, nft.serial_number),
        name: tokenMetadata.name || "Unknown NFT",
        symbol: tokenMetadata.symbol || "",
        logo: tokenMetadata.logo || ""
      });
    }

    return formattedNfts;
  } catch (error) {
    console.error("❌ Error fetching Hedera NFTs:", error);
    return [];
  }
};
