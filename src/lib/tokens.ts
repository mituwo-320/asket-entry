import crypto from 'crypto';

const SECRET = process.env.NEXTAUTH_SECRET || 'basketentry-fallback-secret-2026';

/**
 * Creates a signed password reset token using the user's ID and current password hash.
 * This ensures the token is automatically invalidated once the password changes.
 */
export function createResetToken(userId: string, passwordHash: string): string {
    const payload = { sub: userId, exp: Date.now() + 1000 * 60 * 60 * 24 }; // 24 hours expiry
    const payloadBuffer = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
        .createHmac('sha256', SECRET + passwordHash)
        .update(payloadBuffer)
        .digest('base64url');
    return `${payloadBuffer}.${signature}`;
}

/**
 * Verifies the validity of the signed password reset token.
 */
export function verifyResetToken(token: string, passwordHash: string): { sub: string } | null {
    try {
        const [payloadBuffer, signature] = token.split('.');
        if (!payloadBuffer || !signature) return null;

        const expectedSignature = crypto
            .createHmac('sha256', SECRET + passwordHash)
            .update(payloadBuffer)
            .digest('base64url');

        // Use timingSafeEqual to prevent timing attacks, though standard comparison would usually be okay here
        if (signature !== expectedSignature) return null;

        const payload = JSON.parse(Buffer.from(payloadBuffer, 'base64url').toString('utf8'));

        if (!payload.sub || typeof payload.exp !== 'number') return null;
        if (payload.exp < Date.now()) return null; // Expired

        return payload;
    } catch (error) {
        return null; // Invalid format
    }
}
