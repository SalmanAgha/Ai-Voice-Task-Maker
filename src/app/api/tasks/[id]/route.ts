import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.task.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Manual Delete Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const task = await prisma.task.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(task);
  } catch (error: any) {
    console.error("Manual Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
