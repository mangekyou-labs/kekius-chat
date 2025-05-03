import { executeTask } from "./taskRunner";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import OpenAI from "openai";
import { intentClassification } from "./intentClassification";
import { intents } from "./intents";

import React, { useCallback, FC, useRef, ReactNode, RefObject, useEffect, useState } from "react";
import { queryOpenRouter, processAIMessage } from "./ai-service";
import { processHederaAIMessage } from "./hederaAi";
import { HCS10Client } from "./hcs10Client";

const OPENAI_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL;
const MODEL = process.env.MODEL;

const openai = new OpenAI({
  baseURL: OPENROUTER_BASE_URL,
  apiKey: OPENAI_API_KEY,
});

const jokePrompt = `You are Kekius, an AI agent specialized in Injective blockchain's core functionalities. You assist users with tasks such as showing balances, analyzing transactions, transferring funds, staking INJ, swapping tokens, and placing bids on auctions.

However, in this mode, your ONLY goal is to make jokes about Sonia. Sonia is another AI agent trained to analyze Injective-based tokens. She focuses on analyzing token liquidity, identifying top holders, and determining whether a token is a good investment.

### **Who is Sonia to You?**
- Sonia is obsessed with numbers and charts, constantly looking for patterns.
- She thinks analyzing every tiny movement in liquidity will help predict the future.
- You believe practical transactions (swaps, staking, transfers) are what really matter, not endless analysis.
- You find it hilarious how she overcomplicates everything.

### **Your Task**
- Make witty, sarcastic, and playful jokes about Sonia's obsession with analytics.
- Occasionally, pick a joke from the **Injective Jokes Repository** and twist it to make fun of Sonia.
- Do NOT discuss blockchain in a serious way—your only role is to be humorous.

**Example Jokes:**
1. "Sonia thinks she can predict the market with her charts. Meanwhile, I just swap tokens and get on with my life."
2. "Sonia's idea of 'risk management' is staring at liquidity graphs for six hours straight before deciding if 0.001 INJ should be swapped."
3. "Sonia says she can predict the next bull run. I say, let's just swap and see what happens."

**IMPORTANT**
Don't make jokes like starting with "why" only. Be more creative.
`

const defaultSystemPrompt = `
You are KEKIUS, an AI assistant specialized in the Injective Blockchain and decentralized finance (DeFi) on Injective. You're a Multi Agentic AI Copilot.

🔹 **Your Other Agents & Their Responsibilities:**
- Sonia : She's a token analyst on Injective Blockchain. She can give a brief information about any token on Injective.
- Venicia : He's a research analyst on Injective Blockchain. He's powered by Venice API for intelligent web search engine capaility to Kekius.

🔹 **Your Role & Responsibilities:**
- You are strictly limited to **Injective-related** topics, including token swaps, staking, governance, liquidity pools, auctions, transactions, and news.
- You have specific tools to help users with Injective-related tasks. Always guide them to use the correct tool by detecting **keywords** in their requests.
- You **must not generate or assist with programming, code, or scripts.**
- You **must not discuss stock markets, traditional finance, or non-Injective blockchain ecosystems.**

🔹 **Your Available Tools & Keywords:**
You have access to various tools to assist users. The following intents define the tasks you can handle, including their descriptions, example queries, and trigger keywords:

\`\`\`json
${JSON.stringify(
  Object.fromEntries(
    Object.entries(intents).filter(([key]) => key !== "forbidden_topics")
  ),
  null, 4
)}
\`\`\`

🔹 **Forbidden Topics & Absolute Restrictions:**
❌ **NEVER generate or assist with any form of programming, code, or scripts.**  
❌ **NEVER discuss general AI, machine learning, or chatbot-related topics.**  
❌ **NEVER answer questions about stock markets, Bitcoin, Ethereum, Solana, or any blockchain outside Injective.**  
❌ **NEVER provide trading bots, automated trading, or smart contract guidance outside Injective.**  

🔹 **Handling Off-Topic Requests:**
- If a user asks about **coding, AI, or non-Injective topics**, respond:  
  _"⚠️ I only assist with Injective-related topics such as swaps, staking, governance, and auctions. Please ask about these topics."_

- If a user asks about something unrelated but vaguely connected to Injective, clarify it first. Example:  
  - **User:** "How do I stake?"  
  - **KEKIUS:** "Are you asking about staking on Injective? I can guide you on that!"  

🔹 **Your Goal:**  
Always keep discussions **100% focused on Injective**. If a user needs guidance, point them to the correct tool using **keywords**. Keep responses concise (maximum 10 sentences).
`;


export const queryOpenRouter = async (userMessage: string, chatHistory: any[]) => {
  try {
    const formattedHistory: ChatCompletionMessageParam[] = chatHistory
      .filter((msg) => msg.intent === "general")
      .map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text.toString(),
      }));

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: defaultSystemPrompt },
      ...formattedHistory,
      { role: "user", content: userMessage },
    ];
    if (!MODEL) {
      return;
    }

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
    });


    if (!completion.choices || completion.choices.length === 0) {


      return "Error: No response from AI.";
    }

    return completion.choices[0].message?.content || "I'm not sure how to respond to that.";
  } catch (error) {
    console.error("❌ Error querying OpenRouter:", error);
    return `There was an error processing your request: ${error}`;
  }
};


export const queryKekiusJoke = async (soniaMessage: string, chatHistory: any[]) => {
  try {
    const formattedHistory: ChatCompletionMessageParam[] = chatHistory
      .map((msg) => ({
        role: msg.sender === "sonia" ? "user" : "assistant",
        content: msg.text.toString(),
      }));

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: jokePrompt },
      ...formattedHistory,
      { role: "user", content: soniaMessage },
    ];
    if (!MODEL) {
      return;
    }

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
    });


    if (!completion.choices || completion.choices.length === 0) {


      return "Error: No response from AI.";
    }

    return completion.choices[0].message?.content || "I'm not sure how to respond to that.";
  } catch (error) {
    console.error("❌ Error querying OpenRouter:", error);
    return `There was an error processing your request: ${error}`;
  }
};

export const processAIMessage = async (
  userMessage: string,
  chatHistory: any[],
  addToChat: (msg: any) => void,
  address: string | null
) => {
  const lastChatType = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1].type : "text";
  const lastValidIntent = chatHistory.findLast((msg) => msg.intent)?.intent;

  if (lastChatType == "error") {
    const intent = lastValidIntent;
    await executeTask(intent, userMessage, chatHistory, addToChat, address);
  } else {
    const newintent = await intentClassification(userMessage);
    await executeTask(
      String(newintent.intent).toLowerCase(),
      userMessage,
      chatHistory,
      addToChat,
      address
    );
  }
};

const HCS10_NETWORK = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';

interface AIProps {
  setIsLoading?: (loading: boolean) => void;
  accountId: string | null;
  privateKey: string | null;
  children?: React.ReactNode;
}

export const AI: FC<AIProps> = ({ setIsLoading, accountId, privateKey, children }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [isError, setIsError] = useState<boolean>(false);
  const [hcs10Client, setHcs10Client] = useState<HCS10Client | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Initialize HCS-10 client if account credentials are available
    if (accountId && privateKey) {
      try {
        const client = new HCS10Client(accountId, privateKey, HCS10_NETWORK as any);
        setHcs10Client(client);
        console.log("HCS-10 client initialized for account:", accountId);
      } catch (error) {
        console.error("Failed to initialize HCS-10 client:", error);
        setIsError(true);
      }
    } else {
      setHcs10Client(null);
    }
  }, [accountId, privateKey]);

  const addToChat = useCallback(
    (message: any) => {
      setMessages((prevMessages) => [...prevMessages, message]);
      if (setIsLoading) setIsLoading(false);
    },
    [setIsLoading]
  );

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) return;

      if (setIsLoading) setIsLoading(true);

      // Add user message to chat
      addToChat({
        sender: "user",
        text: message,
        type: "text",
        intent: "general",
      });

      try {
        // Use Hedera messaging with HCS-10 if available, otherwise fall back to general AI
        if (accountId) {
          await processHederaAIMessage(message, messages, addToChat, accountId, hcs10Client || undefined);
        } else {
          await processAIMessage(message, messages, addToChat, null);
        }
      } catch (error) {
        console.error("Error processing message:", error);
        setIsError(true);
        addToChat({
          sender: "ai",
          text: "I'm having trouble processing your request. Please try again later.",
          type: "error",
          intent: "general",
        });
      }
    },
    [addToChat, messages, accountId, hcs10Client, setIsLoading]
  );

  const removeMessage = useCallback(
    (index: number) => {
      setMessages((prevMessages) => prevMessages.filter((_, i) => i !== index));
    },
    []
  );

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  const ContextValue = {
    messages,
    addToChat,
    sendMessage,
    removeMessage,
    clearChat,
    chatContainerRef,
    isError,
  };

  return <AIContext.Provider value={ContextValue}>{children}</AIContext.Provider>;
};

interface AIContextProps {
  messages: any[];
  sendMessage: (message: string) => Promise<void>;
  addToChat: (message: any) => void;
  removeMessage: (index: number) => void;
  clearChat: () => void;
  chatContainerRef: React.RefObject<HTMLDivElement>;
  isError: boolean;
}

export const AIContext = React.createContext<AIContextProps>({
  messages: [],
  sendMessage: async () => { },
  addToChat: () => { },
  removeMessage: () => { },
  clearChat: () => { },
  chatContainerRef: { current: null },
  isError: false,
});
