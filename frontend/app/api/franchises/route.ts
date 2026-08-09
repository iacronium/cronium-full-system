import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const parseImages = (img: any) => {
  if (Array.isArray(img)) return img;
  if (typeof img === 'string') {
    try {
      return JSON.parse(img);
    } catch {
      return [img];
    }
  }
  return [];
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const franchise = await db.franchise.findUnique({
        where: { id: parseInt(id, 10) },
        include: {
          dividendCycles: true,
        },
      });

      if (!franchise) {
        return NextResponse.json(
          { error: 'Franquicia no encontrada' },
          { status: 404 }
        );
      }

      const formatted = {
        ...franchise,
        images: parseImages(franchise.images),
        maxSupply: franchise.maxSupply.toString(),
        currentSupply: franchise.currentSupply.toString(),
        totalValuationUsdc: franchise.totalValuationUsdc.toString(),
        pricePerTokenUsdc: franchise.pricePerTokenUsdc.toString(),
        roiPercentage: franchise.roiPercentage.toString(),
      };

      return NextResponse.json({ success: true, franchise: formatted });
    }

    const franchises = await db.franchise.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });

    const formattedList = franchises.map((f) => ({
      ...f,
      images: parseImages(f.images),
      maxSupply: f.maxSupply.toString(),
      currentSupply: f.currentSupply.toString(),
      totalValuationUsdc: f.totalValuationUsdc.toString(),
      pricePerTokenUsdc: f.pricePerTokenUsdc.toString(),
      roiPercentage: f.roiPercentage.toString(),
    }));

    return NextResponse.json({ success: true, franchises: formattedList });
  } catch (error: any) {
    console.error('Error en GET /api/franchises:', error);
    return NextResponse.json(
      { error: 'Error al consultar franquicias', details: error?.message },
      { status: 500 }
    );
  }
}
