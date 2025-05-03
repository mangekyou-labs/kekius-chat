import { IntentCategorization } from "./intentClassification";
import { HEDERA_INTENTS } from "./hederaIntents";

export class HederaIntentClassifier {
    private intentClassifier: IntentCategorization;

    constructor() {
        this.intentClassifier = new IntentCategorization(HEDERA_INTENTS);
    }

    classify(input: string): string {
        return this.intentClassifier.classify(input);
    }
}

// Default export for easy import
export default function classifyHederaIntent(input: string): string {
    const classifier = new HederaIntentClassifier();
    return classifier.classify(input);
} 