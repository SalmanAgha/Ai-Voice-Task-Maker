import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(tasks);
  } catch (error: any) {
    console.error("Tasks API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
