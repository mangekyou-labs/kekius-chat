import { useChat } from "../providers/chatProvider";
import { useState } from "react";
import { createChatMessage } from "../utils";

const PlaceBidAmountMessageType = ({
  handleExit,
  hederaAccountId,
  token
}: {
  hederaAccountId: string | null;
  handleExit: () => void;
  token: string;
}) => {
  const [amount, setAmount] = useState<string>();
  const { addMessage } = useChat();
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const confirmBid = async () => {
    try {
      if (amount === undefined || hederaAccountId === null) {
        return;
      }

      setIsProcessing(true);
      setErrorMessage("");

      // Fetch current auction information to validate bid
      const auctionResponse = await fetch('/api/hedera/auction/latest');
      const auctionData = await auctionResponse.json();

      if (!auctionResponse.ok) {
        throw new Error(auctionData.message || "Failed to fetch auction information");
      }

      // Check if bid amount is sufficient
      const minBidAmount = auctionData.minBidAmount || 0;
      if (Number(amount) < minBidAmount) {
        setErrorMessage(`Min bid must be more than ${minBidAmount} HBAR`);
        return;
      }

      // Submit bid to Hedera
      const bidResponse = await fetch('/api/hedera/auction/bid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: hederaAccountId,
          auctionId: auctionData.auctionId,
          amount: Number(amount)
        }),
      });

      const bidResult = await bidResponse.json();

      if (!bidResponse.ok) {
        throw new Error(bidResult.message || "Bid submission failed");
      }

      addMessage(token,
        createChatMessage({
          sender: "ai",
          text: `Bid success! Here is your transaction ID: ${bidResult.transactionId}`,
          type: "text",
        })
      );
    } catch (error) {
      console.error("Error placing bid:", error);
      setErrorMessage(error instanceof Error ? error.message : String(error));
      addMessage(token,
        createChatMessage({
          sender: "ai",
          text: `Failed to place bid: ${error instanceof Error ? error.message : String(error)}`,
          type: "error",
        })
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-3 rounded-xl bg-zinc-800 text-white max-w-[75%]">
      <h3 className="text-lg font-semibold mb-2">Enter Bid Amount:</h3>
      {errorMessage && (
        <div className="text-red-400 mb-2">
          {errorMessage}
        </div>
      )}
      <input
        type="number"
        placeholder="Amount in HBAR"
        className="p-2 rounded-lg bg-gray-700 text-white w-full"
        onChange={(e) => setAmount(e.target.value)}
        disabled={isProcessing}
      />
      <div className="space-x-4">
        <button
          type="button"
          onClick={handleExit}
          className="mt-3 px-4 py-2 bg-white text-red-700 font-semibold rounded-lg hover:bg-gray-300"
          disabled={isProcessing}
        >
          Exit
        </button>
        <button
          type="button"
          onClick={confirmBid}
          className="mt-3 px-4 py-2 bg-white text-green-700 font-semibold rounded-lg hover:bg-gray-300"
          disabled={isProcessing || !amount}
        >
          {isProcessing ? "Processing..." : "Confirm"}
        </button>
      </div>
    </div>
  );
};

export default PlaceBidAmountMessageType;
