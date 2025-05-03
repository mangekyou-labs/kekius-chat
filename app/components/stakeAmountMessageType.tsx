import { useValidator } from "../providers/validatorProvider";
import { useChat } from "../providers/chatProvider";
import { useState } from "react";
import { createChatMessage } from "../utils";

const StakeAmountMessageType = ({
  handleExit,
  hederaAccountId,
  token
}: {
  hederaAccountId: string | null;
  handleExit: () => void;
  token: string;
}) => {
  const [amount, setAmount] = useState<string>();
  const { validatorAddress, setValidatorSelected } = useValidator();
  const { addMessage } = useChat();
  const [isStaking, setIsStaking] = useState(false);

  const confirmStake = async () => {
    try {
      if (amount === undefined || hederaAccountId === null) {
        return;
      }

      setIsStaking(true);

      // Call the Hedera API to stake tokens
      const response = await fetch('/api/hedera/stake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: hederaAccountId,
          validatorAddress: validatorAddress,
          amount: Number(amount)
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to stake");
      }

      addMessage(token,
        createChatMessage({
          sender: "ai",
          text: `Stake success! Here is your transaction ID: ${data.transactionId}`,
          type: "text",
        })
      );
      setValidatorSelected(false);
    } catch (error) {
      console.error("Error staking:", error);
      addMessage(token,
        createChatMessage({
          sender: "ai",
          text: `Failed to stake: ${error instanceof Error ? error.message : "Unknown error"}`,
          type: "error",
        })
      );
    } finally {
      setIsStaking(false);
    }
  };

  return (
    <div className="p-3 rounded-xl bg-zinc-800 text-white max-w-[75%]">
      <h3 className="text-lg font-semibold mb-2">Enter Staking Amount:</h3>
      <input
        type="number"
        placeholder="Amount in HBAR"
        className="p-2 rounded-lg bg-gray-700 text-white w-full"
        onChange={(e) => setAmount(e.target.value)}
        disabled={isStaking}
      />
      <div className="space-x-4">
        <button
          type="button"
          onClick={handleExit}
          className="mt-3 px-4 py-2 bg-white text-red-700 font-semibold rounded-lg hover:bg-gray-300"
          disabled={isStaking}
        >
          Exit
        </button>
        <button
          type="button"
          onClick={confirmStake}
          className="mt-3 px-4 py-2 bg-white text-green-700 font-semibold rounded-lg hover:bg-gray-300"
          disabled={isStaking || !amount}
        >
          {isStaking ? "Processing..." : "Confirm"}
        </button>
      </div>
    </div>
  );
};

export default StakeAmountMessageType;
