import { withAuthorization, STAFF } from "@/lib/auth/authorize";

import { NextResponse } from 'next/server';
import { getAllAdminData } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

async function handleGET() {
    try {
        const data = await getAllAdminData();
        return NextResponse.json(data);
    } catch (e) {
        console.error("Admin API Error:", e);
        return NextResponse.json({ error: 'Failed to fetch admin data' }, { status: 500 });
    }
}

export const GET = withAuthorization(handleGET, { roles: STAFF });
