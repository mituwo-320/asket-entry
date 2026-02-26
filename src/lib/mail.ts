import nodemailer from 'nodemailer';

// Create a transporter using SMTP
// For production, it's recommended to use a service like SendGrid, Mailgun, Amazon SES or a generic SMTP.
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Sends a notification email to the administrator when a new team registers.
 */
export async function sendAdminNotificationEmail(teamData: {
    teamName: string;
    representative: string;
    email: string;
    projectId?: string;
}) {
    const adminEmail = process.env.ADMIN_EMAIL;

    // If SMTP is not configured, just log to console
    if (!process.env.SMTP_USER || !adminEmail) {
        console.log('--- Email Setup Missing ---');
        console.log('Would have sent Admin Notification Email:');
        console.log(`To: ${adminEmail || 'admin-placeholder@example.com'}`);
        console.log(`Team: ${teamData.teamName} (${teamData.representative})`);
        return true; // Simulate success
    }

    try {
        await transporter.sendMail({
            from: `"vankycup System" <${process.env.SMTP_USER}>`,
            to: adminEmail,
            subject: `【新規エントリー通知】チーム「${teamData.teamName}」が登録されました`,
            text: `管理者様\n\n新しいチームのエントリーがありました。\n\n【チーム詳細】\nチーム名: ${teamData.teamName}\n代表者名: ${teamData.representative}\n連絡先メール: ${teamData.email}\n大会ID: ${teamData.projectId || '不明'}\n\nvankycup管理画面から詳細をご確認ください。\n${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                    <h2 style="color: #4f46e5;">新規エントリー通知</h2>
                    <p>管理者様</p>
                    <p>新しいチームのエントリーがありました。</p>
                    <table style="width: 100%; max-width: 600px; border-collapse: collapse; margin-bottom: 20px;">
                        <tr><th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd; width: 30%;">チーム名</th><td style="padding: 8px; border-bottom: 1px solid #ddd;">${teamData.teamName}</td></tr>
                        <tr><th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">代表者名</th><td style="padding: 8px; border-bottom: 1px solid #ddd;">${teamData.representative}</td></tr>
                        <tr><th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">メールアドレス</th><td style="padding: 8px; border-bottom: 1px solid #ddd;">${teamData.email}</td></tr>
                        <tr><th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">大会ID</th><td style="padding: 8px; border-bottom: 1px solid #ddd;">${teamData.projectId || '不明'}</td></tr>
                    </table>
                    <p>詳細は<a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin" style="color: #4f46e5; text-decoration: none; font-weight: bold;">vankycup管理画面</a>からご確認ください。</p>
                </div>
            `,
        });
        return true;
    } catch (error) {
        console.error('Failed to send admin notification email:', error);
        return false;
    }
}

/**
 * Sends a password reset email to a user with a temporary token/link.
 */
export async function sendPasswordResetEmail(toEmail: string, resetToken: string) {
    // If SMTP is not configured, just log to console
    if (!process.env.SMTP_USER) {
        console.log('--- Email Setup Missing ---');
        console.log('Would have sent Password Reset Email:');
        console.log(`To: ${toEmail}`);
        console.log(`Reset Token: ${resetToken}`);
        return true; // Simulate success
    }

    try {
        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${encodeURIComponent(toEmail)}`;

        await transporter.sendMail({
            from: `"vankycup Support" <${process.env.SMTP_USER}>`,
            to: toEmail,
            subject: `【vankycup】パスワードの再設定`,
            text: `以下のリンクから新しいパスワードを再設定してください。\n\n${resetUrl}\n\nこのリンクの有効期限は現在から24時間です。\nお心当たりがない場合は、このメールを破棄してください。`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">パスワードの再設定</h2>
                    <p>以下のボタンをクリックして、新しいパスワードを再設定してください。</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">パスワードを再設定する</a>
                    </div>
                    <p style="font-size: 0.9em; color: #666;">※このリンクの有効期限は発行から24時間です。</p>
                    <p style="font-size: 0.9em; color: #666;">※お心当たりがない場合は、このメールを破棄してください。</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin-top: 30px;" />
                    <p style="font-size: 0.8em; color: #999; text-align: center;">vankycup</p>
                </div>
            `,
        });
        return true;
    } catch (error) {
        console.error('Failed to send password reset email:', error);
        return false;
    }
}
