import { useChat } from "../providers/chatProvider";
import type { SendDetails } from "../types";
import { createChatMessage } from "../utils";
import { useState } from "react";

const SendTokenMessageType = ({
  text = "",
  executing,
  setExecuting,
  handleExit,
  send,
  hederaAccountId,
  token,
}: {
  hederaAccountId: string | null;
  text?: string;
  executing: boolean;
  setExecuting: (executing: boolean) => void;
  handleExit: () => void;
  send: SendDetails;
  token: string;
}) => {
  const { addMessage } = useChat();
  const [error, setError] = useState<string | null>(null);

  const confirmSend = async (sendDetails: SendDetails) => {
    try {
      if (hederaAccountId === null) {
        return;
      }

      setError(null);
      setExecuting(true);

      // Prepare token transfer parameters
      const transferParams = {
        accountId: hederaAccountId,
        recipientId: sendDetails.receiver,
        tokenId: sendDetails.token.tokenType === "fungible" ?
          sendDetails.token.denom :
          sendDetails.token.address,
        amount: String(sendDetails.amount * 10 ** sendDetails.token.decimals),
        tokenType: sendDetails.token.tokenType
      };

      // Call the Hedera transfer API
      const response = await fetch('/api/hedera/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transferParams),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Transfer failed");
      }

      addMessage(token,
        createChatMessage({
          sender: "ai",
          text: `Transfer success! Here is your transaction ID: ${data.transactionId}`,
          type: "text",
        })
      );
    } catch (error) {
      console.error("Error transferring tokens:", error);
      setError(error instanceof Error ? error.message : String(error));
      addMessage(token,
        createChatMessage({
          sender: "ai",
          text: `Transfer failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          type: "text",
        })
      );
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="p-3 rounded-xl bg-zinc-800 text-white max-w-[75%]">
      <h3 className="text-lg font-semibold mb-2">Your Transfer Details</h3>
      <div>{text}</div>

      {error && (
        <div className="mt-2 p-2 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm">
          {error}
        </div>
      )}

      {!executing && (
        <div className="space-x-4">
          <button
            type="button"
            onClick={handleExit}
            className="mt-3 px-4 py-2 bg-white text-red-700 font-semibold rounded-lg hover:bg-gray-300"
            disabled={executing}
          >
            Exit
          </button>
          <button
            type="button"
            onClick={() => {
              if (send) {
                confirmSend(send);
              }
            }}
            className="mt-3 px-4 py-2 bg-white text-green-700 font-semibold rounded-lg hover:bg-gray-300"
            disabled={executing}
          >
            Confirm
          </button>
        </div>
      )}

      {executing && (
        <div className="mt-3 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-2">Processing transfer...</span>
        </div>
      )}
    </div>
  );
};

export default SendTokenMessageType;
