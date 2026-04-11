import { sendAdminNotificationEmail } from '../src/lib/mail';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runTest() {
    console.log('--- Starting Mail Sending Test ---');
    const result = await sendAdminNotificationEmail({
        teamName: 'テストチーム',
        representative: 'テスト代表者',
        email: 'test@example.com',
        projectId: 'test-project-123',
        projectName: 'テスト大会',
        teamCountString: '現在 1チーム目 / 上限 16チーム'
    });

    if (result) {
        console.log('Test PASSED: Email sent successfully.');
    } else {
        console.log('Test FAILED: Email sending failed. Check the logs above.');
    }
}

runTest().catch(console.error);
