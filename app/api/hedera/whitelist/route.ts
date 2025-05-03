import { NextRequest, NextResponse } from 'next/server';

/**
 * GET handler for checking if a Hedera account is whitelisted
 * @param req Request object containing the accountId query parameter
 * @returns Response with isWhitelisted status
 */
export async function GET(req: NextRequest) {
    try {
        // Get accountId from query params
        const { searchParams } = new URL(req.url);
        const accountId = searchParams.get('accountId');

        if (!accountId) {
            return NextResponse.json(
                { error: 'Missing accountId parameter' },
                { status: 400 }
            );
        }

        // Here you would implement the actual check against your database or Hedera contract
        // For now, this is a placeholder implementation
        const isWhitelisted = await checkWhitelistStatus(accountId);

        return NextResponse.json({ isWhitelisted });
    } catch (error) {
        console.error('Error checking whitelist status:', error);
        return NextResponse.json(
            { error: 'Failed to check whitelist status' },
            { status: 500 }
        );
    }
}

/**
 * Helper function to check if an account is whitelisted
 * This would be implemented with your actual data source
 * @param accountId The Hedera account ID to check
 * @returns Whether the account is whitelisted
 */
async function checkWhitelistStatus(accountId: string): Promise<boolean> {
    // This is where you would implement the actual whitelist check logic
    // For example, querying a database or smart contract

    // Placeholder implementation
    try {
        // Example query to database
        // const user = await db.query('SELECT * FROM whitelisted_users WHERE account_id = ?', [accountId]);
        // return user.length > 0;

        // For testing purposes, return true for specific account patterns
        return accountId.startsWith('0.0.') || Math.random() > 0.5;
    } catch (error) {
        console.error('Error in whitelist check:', error);
        return false;
    }
} 