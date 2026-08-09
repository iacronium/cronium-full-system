import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    const senderTxHash = searchParams.get('senderTxHash');
    const wallet = searchParams.get('wallet');

    if (messageId) {
      const order = await db.ccipOrder.findUnique({
        where: { messageId },
        include: { franchise: true, user: true },
      });
      if (!order) {
        return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        order: {
          ...order,
          sourceChainId: order.sourceChainId.toString(),
          destChainId: order.destChainId.toString(),
          tokenAmount: order.tokenAmount.toString(),
          paymentAmountUsdc: order.paymentAmountUsdc.toString(),
        },
      });
    }

    if (senderTxHash) {
      const order = await db.ccipOrder.findUnique({
        where: { senderTxHash },
        include: { franchise: true, user: true },
      });
      if (!order) {
        return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        order: {
          ...order,
          sourceChainId: order.sourceChainId.toString(),
          destChainId: order.destChainId.toString(),
          tokenAmount: order.tokenAmount.toString(),
          paymentAmountUsdc: order.paymentAmountUsdc.toString(),
        },
      });
    }

    if (wallet) {
      const normalizedWallet = wallet.toLowerCase();
      const user = await db.user.findUnique({
        where: { walletAddress: normalizedWallet },
      });

      if (!user) {
        return NextResponse.json({ success: true, orders: [] });
      }

      const orders = await db.ccipOrder.findMany({
        where: { userId: user.id },
        include: { franchise: true },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = orders.map((o) => ({
        ...o,
        sourceChainId: o.sourceChainId.toString(),
        destChainId: o.destChainId.toString(),
        tokenAmount: o.tokenAmount.toString(),
        paymentAmountUsdc: o.paymentAmountUsdc.toString(),
      }));

      return NextResponse.json({ success: true, orders: formatted });
    }

    return NextResponse.json(
      { error: 'Se requiere messageId, senderTxHash o wallet' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error en GET /api/ccip/order:', error);
    return NextResponse.json(
      { error: 'Error al consultar orden CCIP', details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      senderTxHash,
      messageId,
      receiverTxHash,
      sourceChainId,
      destChainId,
      userWalletAddress,
      franchiseId,
      tokenAmount,
      paymentAmountUsdc,
      status,
    } = body;

    if (!senderTxHash || !userWalletAddress || !franchiseId || !tokenAmount || !paymentAmountUsdc) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos para la orden CCIP' },
        { status: 400 }
      );
    }

    const normalizedWallet = userWalletAddress.toLowerCase();

    let user = await db.user.findUnique({
      where: { walletAddress: normalizedWallet },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          walletAddress: normalizedWallet,
          kycStatus: 'NOT_SUBMITTED',
        },
      });
    }

    const order = await db.ccipOrder.upsert({
      where: { senderTxHash },
      update: {
        ...(messageId && { messageId }),
        ...(receiverTxHash && { receiverTxHash }),
        ...(status && { status }),
      },
      create: {
        senderTxHash,
        messageId: messageId || null,
        receiverTxHash: receiverTxHash || null,
        sourceChainId: BigInt(sourceChainId || 11155111),
        destChainId: BigInt(destChainId || 84532),
        userId: user.id,
        franchiseId: parseInt(franchiseId, 10),
        tokenAmount: BigInt(tokenAmount),
        paymentAmountUsdc: paymentAmountUsdc.toString(),
        status: status || 'INITIATED',
      },
    });

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        sourceChainId: order.sourceChainId.toString(),
        destChainId: order.destChainId.toString(),
        tokenAmount: order.tokenAmount.toString(),
        paymentAmountUsdc: order.paymentAmountUsdc.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error en POST /api/ccip/order:', error);
    return NextResponse.json(
      { error: 'Error al registrar/actualizar orden CCIP', details: error?.message },
      { status: 500 }
    );
  }
}
