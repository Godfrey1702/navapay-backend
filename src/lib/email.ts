import { Resend } from 'resend';
import { env } from '../config/env.js';

const resend = new Resend(env.RESEND_API_KEY);

export async function sendPasswordResetEmail(email: string, resetToken: string) {
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await resend.emails.send({
        from: 'Navapay <onboarding@resend.dev>',
        // TEMPORARY: Resend sandbox mode only allows sending to the account owner's own
        // email until a domain is verified at resend.com/domains. Remove this once verified.
        to: env.NODE_ENV === 'production' ? email : 'navapay4u@gmail.com',
        subject: 'Reset your Navapay password',
        html: `
            <div style="font-family: 'Poppins', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #ffffff;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="color: #1B4332; font-size: 24px; margin: 0;">Navapay</h1>
                </div>
                <h2 style="color: #1B4332; font-size: 20px;">Reset your password</h2>
                <p style="color: #555; line-height: 1.6;">
                    You requested a password reset. Click the button below to set a new password.
                    This link expires in <strong>1 hour</strong>.
                </p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${resetUrl}"
                       style="background: #1B4332; color: #B5E550; padding: 14px 32px;
                              border-radius: 8px; text-decoration: none; font-weight: 600;
                              display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p style="color: #999; font-size: 13px;">
                    If you didn't request this, ignore this email. Your password won't change.
                </p>
                <p style="color: #999; font-size: 12px;">
                    Or copy this link: ${resetUrl}
                </p>
            </div>
        `,
    });
}
