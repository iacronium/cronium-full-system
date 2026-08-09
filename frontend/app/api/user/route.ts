import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json(
        { error: 'Se requiere el parámetro wallet' },
        { status: 400 }
      );
    }

    const normalizedWallet = wallet.toLowerCase();

    let user = await db.user.findUnique({
      where: { walletAddress: normalizedWallet },
      include: {
        ccipOrders: true,
        transactions: true,
      },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          walletAddress: normalizedWallet,
          kycStatus: 'NOT_SUBMITTED',
        },
        include: {
          ccipOrders: true,
          transactions: true,
        },
      });
    }

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error('Error en GET /api/user:', error);
    return NextResponse.json(
      { error: 'Error interno al consultar usuario', details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, email, fullName, kycStatus, kycReferenceId } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'walletAddress es requerido' },
        { status: 400 }
      );
    }

    const normalizedWallet = walletAddress.toLowerCase();

    const user = await db.user.upsert({
      where: { walletAddress: normalizedWallet },
      update: {
        ...(email && { email }),
        ...(fullName && { fullName }),
        ...(kycStatus && { kycStatus }),
        ...(kycReferenceId && { kycReferenceId }),
      },
      create: {
        walletAddress: normalizedWallet,
        email: email || null,
        fullName: fullName || null,
        kycStatus: kycStatus || 'NOT_SUBMITTED',
        kycReferenceId: kycReferenceId || null,
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error('Error en POST /api/user:', error);
    return NextResponse.json(
      { error: 'Error interno al actualizar usuario', details: error?.message },
      { status: 500 }
    );
  }
}
