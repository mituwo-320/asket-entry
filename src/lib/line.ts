/**
 * LINE Messaging API を利用して、管理者にプッシュ通知を送信します。
 * 外部SDKを使用せず、標準の fetch API を利用した軽量な実装です。
 */
export async function sendAdminLineNotification(message: string) {
    const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const adminUserId = process.env.LINE_ADMIN_USER_ID;

    // 設定が不足している場合は、通知を行わずに終了します（エラーにはしません）
    if (!accessToken || !adminUserId) {
        console.log('LINE Notification skipped: Missing LINE_CHANNEL_ACCESS_TOKEN or LINE_ADMIN_USER_ID in environment variables.');
        return;
    }

    try {
        console.log(`Attempting to send LINE Notification to: ${adminUserId.substring(0, 5)}...`);
        
        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                to: adminUserId,
                messages: [
                    {
                        type: 'text',
                        text: message,
                    },
                ],
            }),
        });

        if (response.ok) {
            console.log('LINE Notification sent successfully.');
        } else {
            const errorBody = await response.json().catch(() => ({}));
            console.error('LINE Notification failed with status:', response.status);
            console.error('LINE Error detail:', errorBody);
        }
    } catch (err) {
        console.error('Error occurred while sending LINE Notification:', err);
    }
}
