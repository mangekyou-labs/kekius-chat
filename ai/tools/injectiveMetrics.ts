import axios from "axios";

interface HederaData {
  tvl: number;
  protocols: Protocol[];
}

interface Protocol {
  name: string;
  logo: string;
  category: string;
  methodology: string;
  tvl: number;
}

export const fetchTopHederaProtocols = async (): Promise<Protocol[] | null> => {
  try {
    const response = await axios.get("https://api.llama.fi/protocols");
    const protocols = response.data;

    const hederaProtocols: Protocol[] = protocols
      .filter((protocol: any) => protocol.chains.includes("Hedera"))
      .map((protocol: any) => ({
        name: protocol.name,
        logo: protocol.logo,
        category: protocol.category,
        methodology: protocol.methodology,
        tvl: protocol.chainTvls?.Hedera ?? 0,
      }))
      .filter((protocol: { tvl: number; }) => protocol.tvl > 0);

    hederaProtocols.sort((a, b) => b.tvl - a.tvl);

    const top10Protocols = hederaProtocols.slice(0, 10);

    const remainingTvl = hederaProtocols
      .slice(10)
      .reduce((sum, protocol) => sum + protocol.tvl, 0);

    if (remainingTvl > 0) {
      top10Protocols.push({
        name: "Others",
        logo: "",
        category: "Aggregated",
        methodology: "Summed TVL of protocols outside top 10",
        tvl: remainingTvl,
      });
    }
    return top10Protocols;
  } catch (error) {
    console.error("Error fetching Hedera protocols:", error);
    return null;
  }
};

export const fetchHederaData = async (): Promise<HederaData | null> => {
  try {
    const response = await axios.get("https://api.llama.fi/chains");
    const chainsData = response.data;

    const hederaData = chainsData.find(
      (chain: any) => chain.name.toLowerCase() === "hedera"
    );

    if (!hederaData) {
      throw new Error("Hedera chain data not found");
    }

    const protocols = await fetchTopHederaProtocols();

    if (protocols == null) {
      return null;
    }

    const tvl = hederaData.tvl;

    const data = {
      tvl,
      protocols,
    };
    return data;
  } catch (error) {
    console.error("Error fetching Hedera data:", error);
    return null;
  }
};


