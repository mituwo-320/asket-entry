import { withAuthorization } from "@/lib/auth/authorize";
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

async function handleGET() {
    try {
        let setting = await db.setting.findUnique({
            where: { id: "default" }
        });

        // Initialize if not exists
        if (!setting) {
            setting = await db.setting.create({
                data: {
                    id: "default",
                    participationFee: 15000,
                    insuranceFee: 800
                }
            });
        }

        return NextResponse.json({ success: true, setting });

    } catch (e) {
        console.error('Settings fetch error:', e);
        return NextResponse.json({ error: '設定データの取得に失敗しました' }, { status: 500 });
    }
}

async function handlePOST(request: Request) {
    try {
        const body = await request.json();
        const { participationFee, insuranceFee } = body;

        const updateData: { participationFee?: number; insuranceFee?: number } = {};
        if (typeof participationFee === 'number') updateData.participationFee = participationFee;
        if (typeof insuranceFee === 'number') updateData.insuranceFee = insuranceFee;

        const setting = await db.setting.upsert({
            where: { id: "default" },
            update: updateData,
            create: {
                id: "default",
                participationFee: typeof participationFee === 'number' ? participationFee : 15000,
                insuranceFee: typeof insuranceFee === 'number' ? insuranceFee : 800,
            }
        });

        return NextResponse.json({ success: true, setting });

    } catch (e) {
        console.error('Settings update error:', e);
        return NextResponse.json({ error: '設定データの保存に失敗しました' }, { status: 500 });
    }
}

export const GET = withAuthorization(handleGET, { roles: ['admin'] });

export const POST = withAuthorization(handlePOST, { roles: ['admin'] });
