
import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const DEFAULT_FROM = process.env.SMTP_FROM || '"RunFlow" <noreply@runflow.app>';

export async function sendWelcomeEmail(email: string, code: string) {
    await transporter.sendMail({
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
}

export async function sendPasswordResetEmail(email: string, code: string) {
    await transporter.sendMail({
        from: DEFAULT_FROM,
        to: email,
        subject: 'Reset your RunFlow password',
        text: `Reset your password using this code: ${code}`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1>Reset Password</h1>
                <p>We received a request to reset your password. Use the code below to proceed.</p>
                <div style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <p style="margin: 0; color: #666;">Your reset code is:</p>
                    <p style="font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 10px 0;">${code}</p>
                </div>
                <p>If you didn't request this, you can safely ignore this email.</p>
                <p>This code will expire in 15 minutes.</p>
            </div>
        `
    });
}
