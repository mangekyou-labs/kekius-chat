import { createChatMessage } from "@/app/utils";
import { queryKekiusJoke } from "../ai";
import { querySoniaJoke } from "../sonia";

export async function jokeTool(
    intent: string,
    message: string,
    chatHistory: any[],
    addToChat: (msg: any) => void,
    address: string | null
) {
    let messages: any[] = [];
    let latestMessage = message;
    const randNumber = getRandomNumber();

    for (let i = 0; i < randNumber; i++) {

        const kekiusResponse = await queryKekiusJoke(latestMessage, messages);
        messages.push({ sender: "kekius", text: kekiusResponse });

        addToChat(
            createChatMessage({
                sender: "ai",
                text: kekiusResponse,
                type: "text",
                intent: intent,
            })
        );


        if (kekiusResponse) {
            const soniaResponse = await querySoniaJoke(kekiusResponse, messages);
            messages.push({ sender: "sonia", text: soniaResponse });

            addToChat(
                createChatMessage({
                    sender: "sonia",
                    text: soniaResponse,
                    type: "text",
                    intent: intent,
                })
            );


            if (soniaResponse) {
                latestMessage = soniaResponse;
            }
        }
    }
}

const getRandomNumber = (): number => {
    const numbers = [1, 2, 3];
    return numbers[Math.floor(Math.random() * numbers.length)];
};
