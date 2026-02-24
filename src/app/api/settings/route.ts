import { NextResponse } from 'next/server';
import { getSetting, updateSetting } from '@/lib/sheets';

export async function GET() {
    try {
        const setting = await getSetting();
        return NextResponse.json(setting || {});
    } catch (e) {
        return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const success = await updateSetting(body);
        if (success) {
            return NextResponse.json({ success: true });
        }
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    } catch (e) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
