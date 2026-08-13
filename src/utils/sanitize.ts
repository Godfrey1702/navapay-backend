export function sanitizeUser(user: any) {
    const {
        passwordHash,
        passwordResetToken,
        passwordResetExpiry,
        emailVerificationToken,
        emailVerificationExpiry,
        transactionPin,
        transactionPinResetToken,
        transactionPinResetExpiry,
        ...safe
    } = user;
    return safe;
}
