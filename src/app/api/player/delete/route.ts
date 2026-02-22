import { NextResponse } from 'next/server';
// import { deletePlayer } from '@/lib/sheets'; 

export async function DELETE(request: Request) {
    // Mock Delete for now to pass build. Logic to be implemented in sheets.ts if needed.
    return NextResponse.json({ success: true });
}
