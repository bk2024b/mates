import { NextRequest, NextResponse } from 'next/server';
import { roomIdSchema } from '@/lib/contracts';
import { failure, rateLimit } from '@/lib/server/http';
import { findRoom, publicRoom } from '@/lib/server/rooms';
export const runtime = 'nodejs';
export async function GET(_req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const id = roomIdSchema.parse((await params).roomId);
    rateLimit('lookup:global', 600);
    return NextResponse.json(publicRoom(await findRoom(id)), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return failure(e);
  }
}
