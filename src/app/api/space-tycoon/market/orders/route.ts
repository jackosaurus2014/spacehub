import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  placeLimitOrder,
  cancelOrder,
  getOrderBook,
} from '@/lib/game/market-orderbook';

/** M6 (docs/SECURITY_AUDIT_2026-08.md): mirrors market/trade/route.ts's per-call cap. */
const MAX_ORDER_QUANTITY = 100_000;
/** M6: limit-price band around MarketResource.currentPrice. */
const PRICE_BAND_MIN_MULT = 0.1;
const PRICE_BAND_MAX_MULT = 10;

/**
 * GET /api/space-tycoon/market/orders
 * Returns the aggregated order book for a resource.
 * Query: ?resourceSlug=iron&levels=10
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resourceSlug = searchParams.get('resourceSlug');
    const levels = Math.min(50, Math.max(1, parseInt(searchParams.get('levels') || '10', 10)));

    if (!resourceSlug) {
      return NextResponse.json({ error: 'resourceSlug is required' }, { status: 400 });
    }

    // Get resource info
    const resource = await prisma.marketResource.findUnique({
      where: { slug: resourceSlug },
    });

    if (!resource) {
      return NextResponse.json({ error: `Resource "${resourceSlug}" not found` }, { status: 404 });
    }

    const book = await getOrderBook(resourceSlug, levels);

    // Calculate 24h change
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oldCandle = await prisma.marketPriceCandle.findFirst({
      where: {
        resourceSlug,
        timeframe: '1h',
        openTime: { lte: oneDayAgo },
      },
      orderBy: { openTime: 'desc' },
    });

    const change24h = oldCandle
      ? Math.round(((resource.currentPrice - oldCandle.close) / oldCandle.close) * 100)
      : Math.round(((resource.currentPrice / resource.basePrice) - 1) * 100);

    // 24h volume
    const volumeResult = await prisma.marketFill.aggregate({
      where: {
        createdAt: { gte: oneDayAgo },
        order: { resourceSlug },
      },
      _sum: { quantity: true },
    });

    return NextResponse.json({
      resourceSlug,
      currentPrice: resource.currentPrice,
      basePrice: resource.basePrice,
      change24h,
      lastTradePrice: book.lastTradePrice,
      lastTradeAt: book.lastTradeAt,
      spread: book.spread,
      volume24h: volumeResult._sum.quantity || 0,
      bids: book.bids,
      asks: book.asks,
      npcCorpAskQty: book.npcCorpAskQty,
      npcCorpBidQty: book.npcCorpBidQty,
    });
  } catch (error) {
    logger.error('Order book GET error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to fetch order book' }, { status: 500 });
  }
}

/**
 * POST /api/space-tycoon/market/orders
 * Place a new limit order.
 * Body: { resourceSlug, side, price, quantity, expiresIn? }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { resourceSlug, side, price, quantity, expiresIn } = body;

    // Validate inputs
    if (!resourceSlug || !side || !quantity) {
      return NextResponse.json({ error: 'Missing required fields: resourceSlug, side, quantity' }, { status: 400 });
    }

    if (side !== 'buy' && side !== 'sell') {
      return NextResponse.json({ error: 'side must be "buy" or "sell"' }, { status: 400 });
    }

    if (!Number.isInteger(price) || price < 1) {
      return NextResponse.json({ error: 'price must be a positive integer' }, { status: 400 });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json({ error: 'quantity must be a positive integer' }, { status: 400 });
    }

    // M6 (2026-09-01 hardening): same per-call volume cap as market/trade —
    // one authed request cannot dump an absurd quantity onto the shared book.
    if (quantity > MAX_ORDER_QUANTITY) {
      return NextResponse.json(
        { error: `Quantity exceeds per-order limit (${MAX_ORDER_QUANTITY.toLocaleString()})` },
        { status: 400 },
      );
    }

    // M6: the limit price must sit within [0.1x, 10x] of the live spot price.
    // placeLimitOrder already enforces the STATIC min/max band from the
    // resource definition; this is the dynamic band around the CURRENT price
    // so a stale or absurd limit cannot sit on the book as a trap.
    const marketResource = await prisma.marketResource.findUnique({
      where: { slug: resourceSlug },
      select: { currentPrice: true },
    });
    if (!marketResource) {
      return NextResponse.json({ error: `Resource "${resourceSlug}" not found` }, { status: 404 });
    }
    const priceFloor = Math.max(1, Math.floor(marketResource.currentPrice * PRICE_BAND_MIN_MULT));
    const priceCeil = Math.max(priceFloor, Math.ceil(marketResource.currentPrice * PRICE_BAND_MAX_MULT));
    if (price < priceFloor || price > priceCeil) {
      return NextResponse.json(
        {
          error:
            `Limit price $${price.toLocaleString()} is outside the allowed band for ${resourceSlug}: ` +
            `$${priceFloor.toLocaleString()} to $${priceCeil.toLocaleString()} ` +
            `(0.1x-10x the current price of $${Math.round(marketResource.currentPrice).toLocaleString()})`,
          priceFloor,
          priceCeil,
          currentPrice: marketResource.currentPrice,
        },
        { status: 400 },
      );
    }

    // Look up the player's GameProfile
    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'No game profile found. Start the game first.' }, { status: 404 });
    }

    // Parse expiration
    const expiresMap: Record<string, number> = {
      '1h': 1, '6h': 6, '24h': 24, '72h': 72, '1w': 168,
    };
    const expiresInHours = expiresMap[expiresIn || '24h'] || 24;

    const result = await placeLimitOrder(
      profile.id,
      resourceSlug,
      side,
      quantity,
      price,
      expiresInHours,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    logger.info('Limit order placed', {
      profileId: profile.id,
      resourceSlug,
      side,
      price,
      quantity,
      fills: result.fills?.length || 0,
    });

    return NextResponse.json({
      success: true,
      order: result.order,
      immediateFills: result.fills,
      escrowDeducted: result.escrowDeducted,
    });
  } catch (error) {
    logger.error('Order placement error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to place order' }, { status: 500 });
  }
}

/**
 * DELETE /api/space-tycoon/market/orders
 * Cancel an order.
 * Body: { orderId }
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    // Look up player profile
    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'No game profile found' }, { status: 404 });
    }

    const result = await cancelOrder(orderId, profile.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    logger.info('Order cancelled', {
      profileId: profile.id,
      orderId,
      refunded: result.refunded,
    });

    return NextResponse.json({
      success: true,
      refunded: result.refunded,
    });
  } catch (error) {
    logger.error('Order cancellation error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }
}
