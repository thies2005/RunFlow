
import nodemailer from 'nodemailer';
import { logger } from '@/lib/logging/logger';

export const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
});

const DEFAULT_FROM = process.env.SMTP_FROM || '"RunFlow" <noreply@runflow.app>';

export async function sendWelcomeEmail(email: string, code: string) {
    logger.info('Attempting to send welcome email', { email });
    try {
        const info = await transporter.sendMail({
            from: DEFAULT_FROM,
            to: email,
            subject: 'Welcome to RunFlow! Verify your email',
            text: `Welcome to RunFlow! Please verify your email using this code: ${code}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1>Welcome to RunFlow!</h1>
                    <p>Thank you for joining. To complete your registration, please verify your email address.</p>
                    <div style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <p style="margin: 0; color: #666;">Your verification code is:</p>
                        <p style="font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 10px 0;">${code}</p>
                    </div>
                    <p>This code will expire in 15 minutes.</p>
                </div>
            `
        });
        logger.info('Welcome email sent successfully', { email, messageId: info.messageId });
        return info;
    } catch (error) {
        logger.error('Failed to send welcome email', { email, error: error instanceof Error ? error.message : String(error) });
        throw error;
    }
}

export async function sendPasswordResetEmail(email: string, code: string) {
    logger.info('Attempting to send password reset email', { email });
    try {
        const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login`;
        const info = await transporter.sendMail({
            from: DEFAULT_FROM,
            to: email,
            subject: 'Reset your RunFlow password',
            text: `Reset your password using this code: ${code}\n\nGo to ${resetUrl}, click "Forgot password?" and enter your code.`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1>Reset Password</h1>
                    <p>We received a request to reset your password. Use the code below to proceed.</p>
                    <div style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <p style="margin: 0; color: #666;">Your reset code is:</p>
                        <p style="font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 10px 0;">${code}</p>
                    </div>
                    <div style="text-align: center; margin: 20px 0;">
                        <a href="${resetUrl}" style="display: inline-block; background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500;">
                            Reset Password
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">
                        Click the button above, then select "Forgot password?" on the login page to enter your code.
                    </p>
                    <p>If you didn't request this, you can safely ignore this email.</p>
                    <p>This code will expire in 15 minutes.</p>
                </div>
            `
        });
        logger.info('Password reset email sent successfully', { email, messageId: info.messageId });
        return info;
    } catch (error) {
        logger.error('Failed to send password reset email', { email, error: error instanceof Error ? error.message : String(error) });
        throw error;
    }
}
