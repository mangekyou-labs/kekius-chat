/**
 * Regular expression to match a Hedera topic ID (e.g., 0.0.12345)
 */
const TOPIC_ID_REGEX = /0\.0\.(\d+)/;

/**
 * Regular expression to match a Hedera account ID (e.g., 0.0.12345)
 */
const ACCOUNT_ID_REGEX = /0\.0\.(\d+)/;

/**
 * Extract a topic ID from text
 * @param text Text to extract topic ID from
 * @returns Topic ID or null if not found
 */
export function extractTopicId(text: string): string | null {
    const match = text.match(TOPIC_ID_REGEX);
    return match ? match[0] : null;
}

/**
 * Extract an account ID from text
 * @param text Text to extract account ID from
 * @returns Account ID or null if not found
 */
export function extractAccountId(text: string): string | null {
    const match = text.match(ACCOUNT_ID_REGEX);
    return match ? match[0] : null;
}

/**
 * Check if a string is a valid Hedera ID (topic ID or account ID)
 * @param id String to check
 * @returns Whether the string is a valid Hedera ID
 */
export function isValidHederaId(id: string): boolean {
    return TOPIC_ID_REGEX.test(id);
}

/**
 * Format HBAR amount with proper units
 * @param amount Amount in tinybars (smallest unit)
 * @returns Formatted amount string
 */
export function formatHbarAmount(amount: number): string {
    // Convert tinybars to HBAR (1 HBAR = 100,000,000 tinybars)
    const hbar = amount / 100000000;

    // Format with commas and fixed precision
    return `${hbar.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8
    })} ℏ`;
}

/**
 * Truncate a Hedera transaction ID for display
 * @param transactionId Full transaction ID
 * @returns Truncated transaction ID
 */
export function truncateTransactionId(transactionId: string): string {
    if (!transactionId || transactionId.length < 20) {
        return transactionId;
    }

    // Format as: 0.0.12345@1609459200.000000000-abcd...1234
    const parts = transactionId.split('@');
    if (parts.length !== 2) {
        return transactionId;
    }

    const accountId = parts[0];
    const secondPart = parts[1];

    // Further split by hyphen to get the seconds and nonce
    const secondParts = secondPart.split('-');
    if (secondParts.length !== 2) {
        return transactionId;
    }

    const seconds = secondParts[0];
    const nonce = secondParts[1];

    // Truncate the nonce if it's too long
    const truncatedNonce = nonce.length > 8
        ? `${nonce.substring(0, 4)}...${nonce.substring(nonce.length - 4)}`
        : nonce;

    return `${accountId}@${seconds}-${truncatedNonce}`;
}

/**
 * Validate a Hedera memo (max 100 bytes)
 * @param memo Memo to validate
 * @returns Trimmed memo that fits within limits
 */
export function validateHederaMemo(memo: string): string {
    // Hedera memos have a max length of 100 bytes
    const encoder = new TextEncoder();
    const bytes = encoder.encode(memo);

    if (bytes.length <= 100) {
        return memo;
    }

    // Truncate to fit within 100 bytes
    let truncated = memo;
    while (encoder.encode(truncated).length > 97) { // 97 to leave room for "..."
        truncated = truncated.slice(0, -1);
    }

    return truncated + "...";
}

/**
 * Parse a Hedera timestamp in seconds.nanoseconds format
 * @param timestamp Timestamp in seconds.nanoseconds format
 * @returns JavaScript Date object
 */
export function parseHederaTimestamp(timestamp: string): Date {
    const parts = timestamp.split('.');
    const seconds = parseInt(parts[0], 10);
    const nanoseconds = parts.length > 1 ? parseInt(parts[1], 10) : 0;

    // Convert to milliseconds and create Date
    const milliseconds = seconds * 1000 + Math.floor(nanoseconds / 1000000);
    return new Date(milliseconds);
}

/**
 * Format a date as a Hedera timestamp (seconds.nanoseconds)
 * @param date Date to format
 * @returns Hedera timestamp string
 */
export function formatHederaTimestamp(date: Date): string {
    const seconds = Math.floor(date.getTime() / 1000);
    const nanoseconds = (date.getTime() % 1000) * 1000000;
    return `${seconds}.${nanoseconds.toString().padStart(9, '0')}`;
} 