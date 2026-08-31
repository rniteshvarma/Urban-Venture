import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  try {
    const { sourceId } = await params;
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;
    const where: any = { sourceId };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [logs, total] = await Promise.all([
      prisma.inboundLog.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip,
        take: limit,
        include: {
          source: {
            select: { id: true, name: true, type: true }
          }
        }
      }),
      prisma.inboundLog.count({ where })
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
