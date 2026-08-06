import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const sources = await prisma.inboundSource.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { logs: true }
        }
      }
    });

    // Determine connectivity status per source:
    // CONNECTED: received lead within last 48 hrs
    // PENDING: active but totalReceived === 0
    // WARNING: active, totalReceived > 0, but no lead in last 7 days
    // NOT_CONNECTED: isActive is false or totalReceived === 0
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const enrichedSources = sources.map(source => {
      let connectionStatus: 'CONNECTED' | 'PENDING' | 'WARNING' | 'NOT_CONNECTED' = 'NOT_CONNECTED';

      if (!source.isActive) {
        connectionStatus = 'NOT_CONNECTED';
      } else if (source.totalReceived === 0) {
        connectionStatus = 'PENDING';
      } else if (source.lastReceivedAt && new Date(source.lastReceivedAt) >= fortyEightHoursAgo) {
        connectionStatus = 'CONNECTED';
      } else if (source.lastReceivedAt && new Date(source.lastReceivedAt) < sevenDaysAgo) {
        connectionStatus = 'WARNING';
      } else {
        connectionStatus = 'CONNECTED';
      }

      return {
        ...source,
        connectionStatus
      };
    });

    return NextResponse.json({ sources: enrichedSources });
  } catch (error: any) {
    console.error('Error fetching inbound sources:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, type, fieldMapping, autoAssignTo, defaultStatus, dedupeWindow } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and Type are required' }, { status: 400 });
    }

    const token = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${crypto.randomBytes(6).toString('hex')}`;

    const source = await prisma.inboundSource.create({
      data: {
        name,
        type,
        webhookToken: token,
        fieldMapping: fieldMapping || null,
        autoAssignTo: autoAssignTo || null,
        defaultStatus: defaultStatus || 'NEW',
        dedupeWindow: dedupeWindow ? parseInt(dedupeWindow) : 24,
        isActive: true
      }
    });

    return NextResponse.json({ source });
  } catch (error: any) {
    console.error('Error creating inbound source:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
