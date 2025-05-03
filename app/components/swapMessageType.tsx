import type { ChatMessage, ContractInput } from "../types";
import { createChatMessage } from "../utils";
import { useState } from "react";

const SwapMessageType = ({
  text = "",
  executing,
  handleExit,
  contractInput,
  updateChat,
  updateExecuting,
  hederaAccountId,
  token,
}: {
  text?: string;
  executing: boolean;
  handleExit: () => void;
  contractInput: ContractInput;
  updateChat: (cb: (prevChat: ChatMessage[]) => ChatMessage[]) => void;
  updateExecuting: (executing: boolean) => void;
  hederaAccountId: string | null;
  token: string;
}) => {
  const [error, setError] = useState<string | null>(null);

  const confirmSwap = async (contractInput: ContractInput) => {
    try {
      if (hederaAccountId === null) {
        return;
      }

      setError(null);
      updateExecuting(true);

      // Prepare the swap parameters
      const swapParams = {
        accountId: hederaAccountId,
        sourceToken: contractInput.funds?.[0]?.denom || "",
        sourceAmount: contractInput.funds?.[0]?.amount || "0",
        targetToken: contractInput.executeMsg.execute_routes?.target_asset_denom ||
          contractInput.executeMsg.send?.target_denom || "",
        minReceiveAmount: contractInput.executeMsg.execute_routes?.minimum_receive ||
          contractInput.executeMsg.send?.minimum_receive || "0"
      };

      // Call the Hedera Swap API
      const response = await fetch('/api/hedera/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(swapParams),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Swap failed");
      }

      // Update chat with successful swap message
      updateChat((prevChat) => [
        ...prevChat,
        createChatMessage({
          sender: "ai",
          text: `Swap success! Here is your transaction ID: ${data.transactionId}`,
          type: "text",
          intent: "general",
        }),
      ]);

      updateExecuting(false);
    } catch (error) {
      updateExecuting(false);

      if (error instanceof Error) {
        const errorMessage = error.message;
        setError(errorMessage);

        // Check if the error message indicates minimum receive amount condition failed
        if (errorMessage.toLowerCase().includes("minimum receive")) {
          updateChat((prevChat) => [
            ...prevChat,
            createChatMessage({
              sender: "ai",
              text: `Swap failed: The swap failed because your minimum receive amount is too high. Please adjust your slippage settings to proceed with the swap.`,
              type: "text",
              intent: "general",
            }),
          ]);
        } else {
          updateChat((prevChat) => [
            ...prevChat,
            createChatMessage({
              sender: "ai",
              text: `Swap failed: ${errorMessage}`,
              type: "text",
              intent: "general",
            }),
          ]);
        }
      } else {
        // Fallback for errors that are not instances of Error
        updateChat((prevChat) => [
          ...prevChat,
          createChatMessage({
            sender: "ai",
            text: `Swap failed: Unknown error occurred`,
            type: "text",
            intent: "general",
          }),
        ]);
      }
    }
  };

  return (
    <div className="p-3 rounded-xl bg-zinc-800 text-white max-w-[75%]">
      <h3 className="text-lg font-semibold mb-2">Your Swap Details</h3>
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
          >
            Exit
          </button>
          <button
            type="button"
            onClick={() => {
              if (contractInput) {
                confirmSwap(contractInput);
              }
            }}
            className="mt-3 px-4 py-2 bg-white text-green-700 font-semibold rounded-lg hover:bg-gray-300"
          >
            Confirm
          </button>
        </div>
      )}

      {executing && (
        <div className="mt-3 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-2">Processing swap...</span>
        </div>
      )}
    </div>
  );
};

export default SwapMessageType;
