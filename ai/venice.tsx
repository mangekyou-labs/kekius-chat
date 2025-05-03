// Fetch Hedera news and updates
export async function fetchHederaUpdates(userMessage: string): Promise<string> {
    try {
        // Create a prompt for the web search API
        let searchMessage = userMessage.toLowerCase();

        // Prepare a list of URLs for reference
        const hederaUrls = [
            "https://hedera.com/blog",
            "https://cointelegraph.com/tags/hedera",
            "https://coindesk.com/tag/hedera",
            "https://hashpost.hedera.com/",
            "https://medium.com/hashgraph",
            "https://bsc.news/pro?search=hedera",
            "https://crypto.news/?s=hedera",
        ];

        // Perform web search using fetch API
        const response = await fetch("/api/web-search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query: `Latest news, updates, and developments about Hedera (HBAR) blockchain network related to: ${searchMessage}`
            }),
        });

        if (!response.ok) {
            throw new Error("Failed to fetch search results");
        }

        const data = await response.json();
        const result = data.result || "";

        // Format the results as bullet points with sources
        const formattedResults = formatSearchResults(result, hederaUrls);

        return formattedResults;
    } catch (error) {
        console.error("Error in fetchHederaUpdates:", error);
        return "I apologize, but I couldn't retrieve the latest Hedera updates. Please try again later.";
    }
}

// Helper function to format search results
function formatSearchResults(results: string, relevantUrls: string[]): string {
    // Split the search results into paragraphs
    const paragraphs = results.split("\n\n");

    // Filter out paragraphs that don't contain relevant information
    const relevantInfo = paragraphs.filter(paragraph => {
        // Check if paragraph contains a relevant URL
        return relevantUrls.some(url => paragraph.includes(url)) ||
            // Include paragraphs that mention Hedera, HBAR, or HTS
            paragraph.toLowerCase().includes("hedera") ||
            paragraph.toLowerCase().includes("hbar") ||
            paragraph.toLowerCase().includes("hashgraph") ||
            paragraph.toLowerCase().includes("hts"); // Hedera Token Service
    });

    // Format as bullet points
    let bulletPoints = "";
    for (const info of relevantInfo) {
        bulletPoints += `• ${info}\n\n`;
    }

    // If no relevant info found, return a fallback message
    if (!bulletPoints) {
        bulletPoints = "• I couldn't find specific recent updates about Hedera for your query. Try asking about a specific topic related to Hedera like 'news about Hedera partnerships' or 'recent Hedera network upgrades'.";
    }

    return bulletPoints;
} 