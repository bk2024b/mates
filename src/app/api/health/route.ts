import { NextResponse } from 'next/server';
import { configuration } from '@/lib/server/config';
export const dynamic = 'force-dynamic';
export async function GET() {
  return NextResponse.json(configuration(), { headers: { 'Cache-Control': 'no-store' } });
}
