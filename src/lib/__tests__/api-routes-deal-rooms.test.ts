/**
 * @jest-environment node
 */

/**
 * API route handler tests for Deal Rooms endpoints:
 *   - GET  /api/deal-rooms                       (list rooms by email)
 *   - POST /api/deal-rooms                       (create a new room)
 *   - GET  /api/deal-rooms/[id]                  (room detail with membership check)
 *   - PUT  /api/deal-rooms/[id]                  (update room settings)
 *   - DELETE /api/deal-rooms/[id]                (archive room)
 *   - GET  /api/deal-rooms/[id]/documents        (list documents)
 *   - POST /api/deal-rooms/[id]/documents        (upload document metadata)
 *   - GET  /api/deal-rooms/[id]/activity         (activity log)
 *   - POST /api/deal-rooms/[id]/members          (invite member)
 *   - DELETE /api/deal-rooms/[id]/members        (remove member)
 *   - POST /api/deal-rooms/[id]/nda              (accept NDA)
 *   - POST /api/deal-rooms/join                  (join via access code)
 *
 * Validates authorization, input validation, membership checks, and error handling.
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    dealRoom: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    dealRoomMember: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    dealRoomDocument: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    dealRoomActivity: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import prisma from '@/lib/db';

import { GET as listGET, POST as createPOST } from '@/app/api/deal-rooms/route';
import { GET as detailGET, PUT as updatePUT, DELETE as archiveDELETE } from '@/app/api/deal-rooms/[id]/route';
import { GET as docsGET, POST as docsPOST } from '@/app/api/deal-rooms/[id]/documents/route';
import { GET as activityGET } from '@/app/api/deal-rooms/[id]/activity/route';
import { POST as membersPOST, DELETE as membersDELETE } from '@/app/api/deal-rooms/[id]/members/route';
import { POST as ndaPOST } from '@/app/api/deal-rooms/[id]/nda/route';
import { POST as joinPOST } from '@/app/api/deal-rooms/join/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeDealRoom(overrides: Record<string, unknown> = {}) {
  return {
    id: 'room-1',
    name: 'Series A Funding Room',
    description: 'Deal room for Series A discussions',
    companySlug: 'spacex',
    createdBy: 'owner@example.com',
    accessCode: 'abc123def456',
    ndaRequired: false,
    ndaText: null,
    status: 'active',
    createdAt: new Date('2026-01-10'),
    updatedAt: new Date('2026-01-10'),
    members: [],
    documents: [],
    activities: [],
    _count: { documents: 0, members: 1, activities: 0 },
    ...overrides,
  };
}

function makeMember(overrides: Record<string, unknown> = {}) {
  return {
    id: 'member-1',
    dealRoomId: 'room-1',
    email: 'owner@example.com',
    role: 'owner',
    invitedAt: new Date('2026-01-10'),
    joinedAt: new Date('2026-01-10'),
    ndaAcceptedAt: new Date('2026-01-10'),
    lastAccessAt: null,
    ...overrides,
  };
}

function makeDocument(overrides: Record<string, unknown> = {}) {
  return {
    id: 'doc-1',
    dealRoomId: 'room-1',
    name: 'Pitch Deck Q1 2026',
    category: 'pitch_deck',
    fileType: 'pdf',
    fileSize: 5242880,
    uploadedBy: 'owner@example.com',
    description: 'Latest pitch deck',
    version: 1,
    createdAt: new Date('2026-01-15'),
    ...overrides,
  };
}

function makeActivity(overrides: Record<string, unknown> = {}) {
  return {
    id: 'activity-1',
    dealRoomId: 'room-1',
    userEmail: 'owner@example.com',
    action: 'created_room',
    details: 'Created deal room: Series A Funding Room',
    createdAt: new Date('2026-01-10'),
    ...overrides,
  };
}

function jsonRequest(url: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function putRequest(url: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// GET /api/deal-rooms (List rooms)
// =============================================================================

describe('GET /api/deal-rooms', () => {
  it('returns rooms for a given email', async () => {
    const room = makeDealRoom();
    const membership = { ...makeMember(), dealRoom: room };
    (mockPrisma.dealRoomMember.findMany as jest.Mock).mockResolvedValue([membership]);

    const req = new NextRequest('http://localhost/api/deal-rooms?email=owner@example.com');
    const res = await listGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.rooms).toHaveLength(1);
    expect(body.rooms[0].name).toBe('Series A Funding Room');
    expect(body.rooms[0].myRole).toBe('owner');
    expect(body.rooms[0].ndaAccepted).toBe(true);
  });

  it('returns empty array for user with no rooms', async () => {
    (mockPrisma.dealRoomMember.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/deal-rooms?email=nobody@example.com');
    const res = await listGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.rooms).toEqual([]);
  });

  it('returns 400 when email param is missing', async () => {
    const req = new NextRequest('http://localhost/api/deal-rooms');
    const res = await listGET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Email parameter required');
  });

  it('returns 500 when prisma throws', async () => {
    (mockPrisma.dealRoomMember.findMany as jest.Mock).mockRejectedValue(new Error('DB connection lost'));

    const req = new NextRequest('http://localhost/api/deal-rooms?email=owner@example.com');
    const res = await listGET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to fetch rooms');
  });
});

// =============================================================================
// POST /api/deal-rooms (Create room)
// =============================================================================

describe('POST /api/deal-rooms', () => {
  it('creates a room with valid data', async () => {
    const createdRoom = makeDealRoom({ members: [makeMember()] });
    (mockPrisma.dealRoom.create as jest.Mock).mockResolvedValue(createdRoom);
    (mockPrisma.dealRoomActivity.create as jest.Mock).mockResolvedValue(makeActivity());

    const req = jsonRequest('http://localhost/api/deal-rooms', {
      name: 'Series A Funding Room',
      description: 'Deal room for Series A discussions',
      createdByEmail: 'owner@example.com',
    });
    const res = await createPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.room).toBeDefined();
    expect(body.room.name).toBe('Series A Funding Room');
    expect(body.accessCode).toBeDefined();
  });

  it('returns 400 when name is missing', async () => {
    const req = jsonRequest('http://localhost/api/deal-rooms', {
      createdByEmail: 'owner@example.com',
    });
    const res = await createPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('name and createdByEmail are required');
  });

  it('returns 400 when createdByEmail is missing', async () => {
    const req = jsonRequest('http://localhost/api/deal-rooms', {
      name: 'Test Room',
    });
    const res = await createPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('name and createdByEmail are required');
  });

  it('returns 400 when name exceeds 200 characters', async () => {
    const req = jsonRequest('http://localhost/api/deal-rooms', {
      name: 'A'.repeat(201),
      createdByEmail: 'owner@example.com',
    });
    const res = await createPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Name must be a string under 200 characters');
  });

  it('creates room with ndaRequired flag', async () => {
    const createdRoom = makeDealRoom({ ndaRequired: true, ndaText: 'NDA text here', members: [makeMember()] });
    (mockPrisma.dealRoom.create as jest.Mock).mockResolvedValue(createdRoom);
    (mockPrisma.dealRoomActivity.create as jest.Mock).mockResolvedValue(makeActivity());

    const req = jsonRequest('http://localhost/api/deal-rooms', {
      name: 'Confidential Room',
      createdByEmail: 'owner@example.com',
      ndaRequired: true,
      ndaText: 'NDA text here',
    });
    const res = await createPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(mockPrisma.dealRoom.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ndaRequired: true,
          ndaText: 'NDA text here',
        }),
      })
    );
  });

  it('returns 500 when prisma throws', async () => {
    (mockPrisma.dealRoom.create as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = jsonRequest('http://localhost/api/deal-rooms', {
      name: 'Test Room',
      createdByEmail: 'owner@example.com',
    });
    const res = await createPOST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to create room');
  });
});

// =============================================================================
// GET /api/deal-rooms/[id] (Room detail)
// =============================================================================

describe('GET /api/deal-rooms/[id]', () => {
  it('returns room detail for an authorized member', async () => {
    const room = makeDealRoom({
      members: [makeMember()],
      documents: [makeDocument()],
      activities: [makeActivity()],
    });
    (mockPrisma.dealRoom.findUnique as jest.Mock).mockResolvedValue(room);
    (mockPrisma.dealRoomMember.update as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost/api/deal-rooms/room-1?email=owner@example.com');
    const res = await detailGET(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.room).toBeDefined();
    expect(body.room.name).toBe('Series A Funding Room');
    expect(body.myRole).toBe('owner');
    expect(body.ndaAccepted).toBe(true);
  });

  it('returns 404 for nonexistent room', async () => {
    (mockPrisma.dealRoom.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/deal-rooms/nonexistent?email=owner@example.com');
    const res = await detailGET(req, { params: { id: 'nonexistent' } });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('Deal room not found');
  });

  it('returns 403 when user is not a member', async () => {
    const room = makeDealRoom({
      members: [makeMember()],
    });
    (mockPrisma.dealRoom.findUnique as jest.Mock).mockResolvedValue(room);

    const req = new NextRequest('http://localhost/api/deal-rooms/room-1?email=stranger@example.com');
    const res = await detailGET(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('Access denied. You are not a member of this room.');
  });

  it('returns room without membership check when no email provided', async () => {
    const room = makeDealRoom({ members: [makeMember()] });
    (mockPrisma.dealRoom.findUnique as jest.Mock).mockResolvedValue(room);

    const req = new NextRequest('http://localhost/api/deal-rooms/room-1');
    const res = await detailGET(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.myRole).toBeNull();
    expect(body.ndaAccepted).toBe(false);
  });

  it('updates last access time for member', async () => {
    const member = makeMember({ id: 'member-1' });
    const room = makeDealRoom({ members: [member] });
    (mockPrisma.dealRoom.findUnique as jest.Mock).mockResolvedValue(room);
    (mockPrisma.dealRoomMember.update as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost/api/deal-rooms/room-1?email=owner@example.com');
    await detailGET(req, { params: { id: 'room-1' } });

    expect(mockPrisma.dealRoomMember.update).toHaveBeenCalledWith({
      where: { id: 'member-1' },
      data: { lastAccessAt: expect.any(Date) },
    });
  });

  it('returns 500 when prisma throws', async () => {
    (mockPrisma.dealRoom.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost/api/deal-rooms/room-1?email=owner@example.com');
    const res = await detailGET(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to fetch room');
  });
});

// =============================================================================
// PUT /api/deal-rooms/[id] (Update room)
// =============================================================================

describe('PUT /api/deal-rooms/[id]', () => {
  it('updates room settings for owner', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(makeMember());
    const updatedRoom = makeDealRoom({ name: 'Updated Name' });
    (mockPrisma.dealRoom.update as jest.Mock).mockResolvedValue(updatedRoom);
    (mockPrisma.dealRoomActivity.create as jest.Mock).mockResolvedValue({});

    const req = putRequest('http://localhost/api/deal-rooms/room-1', {
      name: 'Updated Name',
      email: 'owner@example.com',
    });
    const res = await updatePUT(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.room).toBeDefined();
  });

  it('updates room settings for admin', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(
      makeMember({ role: 'admin', email: 'admin@example.com' })
    );
    const updatedRoom = makeDealRoom({ description: 'New description' });
    (mockPrisma.dealRoom.update as jest.Mock).mockResolvedValue(updatedRoom);
    (mockPrisma.dealRoomActivity.create as jest.Mock).mockResolvedValue({});

    const req = putRequest('http://localhost/api/deal-rooms/room-1', {
      description: 'New description',
      email: 'admin@example.com',
    });
    const res = await updatePUT(req, { params: { id: 'room-1' } });

    expect(res.status).toBe(200);
  });

  it('returns 400 when email is missing', async () => {
    const req = putRequest('http://localhost/api/deal-rooms/room-1', {
      name: 'Updated Name',
    });
    const res = await updatePUT(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Email required for authorization');
  });

  it('returns 403 for viewer trying to update', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(null);

    const req = putRequest('http://localhost/api/deal-rooms/room-1', {
      name: 'Updated Name',
      email: 'viewer@example.com',
    });
    const res = await updatePUT(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('Only owners and admins can update room settings');
  });

  it('validates status field accepts only valid values', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(makeMember());
    (mockPrisma.dealRoom.update as jest.Mock).mockResolvedValue(makeDealRoom({ status: 'archived' }));
    (mockPrisma.dealRoomActivity.create as jest.Mock).mockResolvedValue({});

    const req = putRequest('http://localhost/api/deal-rooms/room-1', {
      status: 'archived',
      email: 'owner@example.com',
    });
    await updatePUT(req, { params: { id: 'room-1' } });

    expect(mockPrisma.dealRoom.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'archived' }),
      })
    );
  });

  it('returns 500 when prisma throws', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(makeMember());
    (mockPrisma.dealRoom.update as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = putRequest('http://localhost/api/deal-rooms/room-1', {
      name: 'Updated',
      email: 'owner@example.com',
    });
    const res = await updatePUT(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to update room');
  });
});

// =============================================================================
// DELETE /api/deal-rooms/[id] (Archive room)
// =============================================================================

describe('DELETE /api/deal-rooms/[id]', () => {
  it('archives room when requested by owner', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(makeMember());
    (mockPrisma.dealRoom.update as jest.Mock).mockResolvedValue({});
    (mockPrisma.dealRoomActivity.create as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost/api/deal-rooms/room-1?email=owner@example.com', {
      method: 'DELETE',
    });
    const res = await archiveDELETE(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe('Room archived');
  });

  it('returns 400 when email is missing', async () => {
    const req = new NextRequest('http://localhost/api/deal-rooms/room-1', {
      method: 'DELETE',
    });
    const res = await archiveDELETE(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Email required for authorization');
  });

  it('returns 403 when non-owner tries to archive', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/deal-rooms/room-1?email=viewer@example.com', {
      method: 'DELETE',
    });
    const res = await archiveDELETE(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('Only owners can archive a room');
  });

  it('returns 500 when prisma throws', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(makeMember());
    (mockPrisma.dealRoom.update as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost/api/deal-rooms/room-1?email=owner@example.com', {
      method: 'DELETE',
    });
    const res = await archiveDELETE(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to archive room');
  });
});

// =============================================================================
// GET /api/deal-rooms/[id]/documents (List documents)
// =============================================================================

describe('GET /api/deal-rooms/[id]/documents', () => {
  it('returns documents for authorized member', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(makeMember());
    (mockPrisma.dealRoom.findUnique as jest.Mock).mockResolvedValue({ ndaRequired: false });
    const docs = [makeDocument(), makeDocument({ id: 'doc-2', name: 'Financials' })];
    (mockPrisma.dealRoomDocument.findMany as jest.Mock).mockResolvedValue(docs);

    const req = new NextRequest('http://localhost/api/deal-rooms/room-1/documents?email=owner@example.com');
    const res = await docsGET(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.documents).toHaveLength(2);
  });

  it('filters documents by category', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(makeMember());
    (mockPrisma.dealRoom.findUnique as jest.Mock).mockResolvedValue({ ndaRequired: false });
    (mockPrisma.dealRoomDocument.findMany as jest.Mock).mockResolvedValue([makeDocument()]);

    const req = new NextRequest('http://localhost/api/deal-rooms/room-1/documents?email=owner@example.com&category=pitch_deck');
    await docsGET(req, { params: { id: 'room-1' } });

    expect(mockPrisma.dealRoomDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { dealRoomId: 'room-1', category: 'pitch_deck' },
      })
    );
  });

  it('returns 403 when user is not a member', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/deal-rooms/room-1/documents?email=stranger@example.com');
    const res = await docsGET(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('Access denied');
  });

  it('returns 403 when NDA is required but not accepted', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(
      makeMember({ ndaAcceptedAt: null })
    );
    (mockPrisma.dealRoom.findUnique as jest.Mock).mockResolvedValue({ ndaRequired: true });

    const req = new NextRequest('http://localhost/api/deal-rooms/room-1/documents?email=member@example.com');
    const res = await docsGET(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('NDA acceptance required before accessing documents');
  });

  it('returns 500 when prisma throws', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost/api/deal-rooms/room-1/documents?email=owner@example.com');
    const res = await docsGET(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to fetch documents');
  });
});

// =============================================================================
// POST /api/deal-rooms/[id]/documents (Upload document)
// =============================================================================

describe('POST /api/deal-rooms/[id]/documents', () => {
  it('creates a document with valid data', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(makeMember());
    (mockPrisma.dealRoom.findUnique as jest.Mock).mockResolvedValue({ ndaRequired: false });
    (mockPrisma.dealRoomDocument.count as jest.Mock).mockResolvedValue(0);
    const doc = makeDocument();
    (mockPrisma.dealRoomDocument.create as jest.Mock).mockResolvedValue(doc);
    (mockPrisma.dealRoomActivity.create as jest.Mock).mockResolvedValue({});

    const req = jsonRequest('http://localhost/api/deal-rooms/room-1/documents', {
      name: 'Pitch Deck Q1 2026',
      category: 'pitch_deck',
      fileType: 'pdf',
      fileSize: 5242880,
      uploaderEmail: 'owner@example.com',
    });
    const res = await docsPOST(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.document).toBeDefined();
    expect(body.document.name).toBe('Pitch Deck Q1 2026');
  });

  it('returns 400 when required fields are missing', async () => {
    const req = jsonRequest('http://localhost/api/deal-rooms/room-1/documents', {
      name: 'Test',
      uploaderEmail: 'owner@example.com',
    });
    const res = await docsPOST(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('name, fileType, fileSize, and uploaderEmail are required');
  });

  it('returns 400 when name exceeds 500 characters', async () => {
    const req = jsonRequest('http://localhost/api/deal-rooms/room-1/documents', {
      name: 'A'.repeat(501),
      fileType: 'pdf',
      fileSize: 1024,
      uploaderEmail: 'owner@example.com',
    });
    const res = await docsPOST(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Name must be a string under 500 characters');
  });

  it('returns 400 for invalid file type', async () => {
    const req = jsonRequest('http://localhost/api/deal-rooms/room-1/documents', {
      name: 'Test',
      fileType: 'exe',
      fileSize: 1024,
      uploaderEmail: 'owner@example.com',
    });
    const res = await docsPOST(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('Invalid file type');
  });

  it('returns 400 for invalid file size', async () => {
    const req = jsonRequest('http://localhost/api/deal-rooms/room-1/documents', {
      name: 'Test',
      fileType: 'pdf',
      fileSize: -1,
      uploaderEmail: 'owner@example.com',
    });
    const res = await docsPOST(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Invalid file size');
  });

  it('returns 400 for file size exceeding 50MB', async () => {
    const req = jsonRequest('http://localhost/api/deal-rooms/room-1/documents', {
      name: 'Huge File',
      fileType: 'pdf',
      fileSize: 60 * 1024 * 1024,
      uploaderEmail: 'owner@example.com',
    });
    const res = await docsPOST(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Invalid file size');
  });

  it('returns 403 when user is not owner or admin', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(null);

    const req = jsonRequest('http://localhost/api/deal-rooms/room-1/documents', {
      name: 'Test',
      fileType: 'pdf',
      fileSize: 1024,
      uploaderEmail: 'viewer@example.com',
    });
    const res = await docsPOST(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('Only owners and admins can upload documents');
  });

  it('auto-versions documents with same name', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(makeMember());
    (mockPrisma.dealRoom.findUnique as jest.Mock).mockResolvedValue({ ndaRequired: false });
    (mockPrisma.dealRoomDocument.count as jest.Mock).mockResolvedValue(2); // 2 existing
    (mockPrisma.dealRoomDocument.create as jest.Mock).mockResolvedValue(makeDocument({ version: 3 }));
    (mockPrisma.dealRoomActivity.create as jest.Mock).mockResolvedValue({});

    const req = jsonRequest('http://localhost/api/deal-rooms/room-1/documents', {
      name: 'Pitch Deck Q1 2026',
      fileType: 'pdf',
      fileSize: 1024,
      uploaderEmail: 'owner@example.com',
    });
    await docsPOST(req, { params: { id: 'room-1' } });

    expect(mockPrisma.dealRoomDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ version: 3 }),
      })
    );
  });

  it('returns 500 when prisma throws', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(makeMember());
    (mockPrisma.dealRoom.findUnique as jest.Mock).mockResolvedValue({ ndaRequired: false });
    (mockPrisma.dealRoomDocument.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.dealRoomDocument.create as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = jsonRequest('http://localhost/api/deal-rooms/room-1/documents', {
      name: 'Test',
      fileType: 'pdf',
      fileSize: 1024,
      uploaderEmail: 'owner@example.com',
    });
    const res = await docsPOST(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to upload document');
  });
});

// =============================================================================
// GET /api/deal-rooms/[id]/activity (Activity log)
// =============================================================================

describe('GET /api/deal-rooms/[id]/activity', () => {
  it('returns activity log for a room', async () => {
    const activities = [
      makeActivity(),
      makeActivity({ id: 'activity-2', action: 'uploaded_document' }),
    ];
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(makeMember());
    (mockPrisma.dealRoomActivity.findMany as jest.Mock).mockResolvedValue(activities);
    (mockPrisma.dealRoomActivity.count as jest.Mock).mockResolvedValue(2);

    const req = new NextRequest('http://localhost/api/deal-rooms/room-1/activity?email=owner@example.com');
    const res = await activityGET(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.activities).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it('respects custom limit param', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(makeMember());
    (mockPrisma.dealRoomActivity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.dealRoomActivity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/deal-rooms/room-1/activity?email=owner@example.com&limit=10');
    await activityGET(req, { params: { id: 'room-1' } });

    expect(mockPrisma.dealRoomActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 })
    );
  });

  it('caps limit at 200', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(makeMember());
    (mockPrisma.dealRoomActivity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.dealRoomActivity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/deal-rooms/room-1/activity?email=owner@example.com&limit=500');
    await activityGET(req, { params: { id: 'room-1' } });

    expect(mockPrisma.dealRoomActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 })
    );
  });

  it('returns 403 when user is not a member', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/deal-rooms/room-1/activity?email=stranger@example.com');
    const res = await activityGET(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('Access denied');
  });

  it('returns 500 when prisma throws', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost/api/deal-rooms/room-1/activity?email=owner@example.com');
    const res = await activityGET(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to fetch activity');
  });
});

// =============================================================================
// POST /api/deal-rooms/[id]/members (Invite member)
// =============================================================================

describe('POST /api/deal-rooms/[id]/members', () => {
  it('invites a new member as viewer by default', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(makeMember());
    (mockPrisma.dealRoomMember.findUnique as jest.Mock).mockResolvedValue(null);
    const newMember = makeMember({
      id: 'member-2',
      email: 'invitee@example.com',
      role: 'viewer',
    });
    (mockPrisma.dealRoomMember.create as jest.Mock).mockResolvedValue(newMember);
    (mockPrisma.dealRoomActivity.create as jest.Mock).mockResolvedValue({});

    const req = jsonRequest('http://localhost/api/deal-rooms/room-1/members', {
      inviteeEmail: 'invitee@example.com',
      inviterEmail: 'owner@example.com',
    });
    const res = await membersPOST(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.member).toBeDefined();
    expect(body.member.email).toBe('invitee@example.com');
  });

  it('invites a member with admin role', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(makeMember());
    (mockPrisma.dealRoomMember.findUnique as jest.Mock).mockResolvedValue(null);
    const newMember = makeMember({
      id: 'member-2',
      email: 'admin-invitee@example.com',
      role: 'admin',
    });
    (mockPrisma.dealRoomMember.create as jest.Mock).mockResolvedValue(newMember);
    (mockPrisma.dealRoomActivity.create as jest.Mock).mockResolvedValue({});

    const req = jsonRequest('http://localhost/api/deal-rooms/room-1/members', {
      inviteeEmail: 'admin-invitee@example.com',
      inviterEmail: 'owner@example.com',
      role: 'admin',
    });
    const res = await membersPOST(req, { params: { id: 'room-1' } });

    expect(res.status).toBe(201);
    expect(mockPrisma.dealRoomMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'admin' }),
      })
    );
  });

  it('returns 400 when inviteeEmail is missing', async () => {
    const req = jsonRequest('http://localhost/api/deal-rooms/room-1/members', {
      inviterEmail: 'owner@example.com',
    });
    const res = await membersPOST(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('inviteeEmail and inviterEmail are required');
  });

  it('returns 400 when inviterEmail is missing', async () => {
    const req = jsonRequest('http://localhost/api/deal-rooms/room-1/members', {
      inviteeEmail: 'invitee@example.com',
    });
    const res = await membersPOST(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('inviteeEmail and inviterEmail are required');
  });

  it('returns 400 for invalid email address', async () => {
    const req = jsonRequest('http://localhost/api/deal-rooms/room-1/members', {
      inviteeEmail: 'not-an-email',
      inviterEmail: 'owner@example.com',
    });
    const res = await membersPOST(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Invalid email address');
  });

  it('returns 403 when inviter is not owner or admin', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(null);

    const req = jsonRequest('http://localhost/api/deal-rooms/room-1/members', {
      inviteeEmail: 'new@example.com',
      inviterEmail: 'viewer@example.com',
    });
    const res = await membersPOST(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('Only owners and admins can invite members');
  });

  it('returns 409 when invitee is already a member', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(makeMember());
    (mockPrisma.dealRoomMember.findUnique as jest.Mock).mockResolvedValue(
      makeMember({ email: 'existing@example.com' })
    );

    const req = jsonRequest('http://localhost/api/deal-rooms/room-1/members', {
      inviteeEmail: 'existing@example.com',
      inviterEmail: 'owner@example.com',
    });
    const res = await membersPOST(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe('This person is already a member of this room');
  });

  it('returns 500 when prisma throws', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(makeMember());
    (mockPrisma.dealRoomMember.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.dealRoomMember.create as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = jsonRequest('http://localhost/api/deal-rooms/room-1/members', {
      inviteeEmail: 'new@example.com',
      inviterEmail: 'owner@example.com',
    });
    const res = await membersPOST(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to invite member');
  });
});

// =============================================================================
// DELETE /api/deal-rooms/[id]/members (Remove member)
// =============================================================================

describe('DELETE /api/deal-rooms/[id]/members', () => {
  it('allows owner to remove a member', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock)
      .mockResolvedValueOnce(makeMember()) // requester is owner
      .mockResolvedValueOnce(makeMember({ id: 'member-2', email: 'viewer@example.com', role: 'viewer' })); // target member
    (mockPrisma.dealRoomMember.delete as jest.Mock).mockResolvedValue({});
    (mockPrisma.dealRoomActivity.create as jest.Mock).mockResolvedValue({});

    const req = new NextRequest(
      'http://localhost/api/deal-rooms/room-1/members?memberEmail=viewer@example.com&requesterEmail=owner@example.com',
      { method: 'DELETE' }
    );
    const res = await membersDELETE(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe('Member removed');
  });

  it('allows self-removal for any member', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock)
      .mockResolvedValueOnce(makeMember({ role: 'viewer', email: 'viewer@example.com' }))
      .mockResolvedValueOnce(makeMember({ id: 'member-2', role: 'viewer', email: 'viewer@example.com' }));
    (mockPrisma.dealRoomMember.delete as jest.Mock).mockResolvedValue({});
    (mockPrisma.dealRoomActivity.create as jest.Mock).mockResolvedValue({});

    const req = new NextRequest(
      'http://localhost/api/deal-rooms/room-1/members?memberEmail=viewer@example.com&requesterEmail=viewer@example.com',
      { method: 'DELETE' }
    );
    const res = await membersDELETE(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('returns 400 when memberEmail is missing', async () => {
    const req = new NextRequest(
      'http://localhost/api/deal-rooms/room-1/members?requesterEmail=owner@example.com',
      { method: 'DELETE' }
    );
    const res = await membersDELETE(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('memberEmail and requesterEmail are required');
  });

  it('returns 403 when requester is not a member', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValueOnce(null);

    const req = new NextRequest(
      'http://localhost/api/deal-rooms/room-1/members?memberEmail=someone@example.com&requesterEmail=stranger@example.com',
      { method: 'DELETE' }
    );
    const res = await membersDELETE(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('Access denied');
  });

  it('returns 403 when viewer tries to remove another member', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock)
      .mockResolvedValueOnce(makeMember({ role: 'viewer', email: 'viewer@example.com' })); // requester is viewer

    const req = new NextRequest(
      'http://localhost/api/deal-rooms/room-1/members?memberEmail=other@example.com&requesterEmail=viewer@example.com',
      { method: 'DELETE' }
    );
    const res = await membersDELETE(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('Only owners and admins can remove other members');
  });

  it('returns 404 when target member not found', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock)
      .mockResolvedValueOnce(makeMember()) // requester is owner
      .mockResolvedValueOnce(null); // target not found

    const req = new NextRequest(
      'http://localhost/api/deal-rooms/room-1/members?memberEmail=ghost@example.com&requesterEmail=owner@example.com',
      { method: 'DELETE' }
    );
    const res = await membersDELETE(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('Member not found');
  });

  it('returns 400 when trying to remove the owner', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock)
      .mockResolvedValueOnce(makeMember({ role: 'admin', email: 'admin@example.com' }))
      .mockResolvedValueOnce(makeMember({ role: 'owner', email: 'owner@example.com' }));

    const req = new NextRequest(
      'http://localhost/api/deal-rooms/room-1/members?memberEmail=owner@example.com&requesterEmail=admin@example.com',
      { method: 'DELETE' }
    );
    const res = await membersDELETE(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Cannot remove the room owner');
  });

  it('returns 500 when prisma throws', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = new NextRequest(
      'http://localhost/api/deal-rooms/room-1/members?memberEmail=viewer@example.com&requesterEmail=owner@example.com',
      { method: 'DELETE' }
    );
    const res = await membersDELETE(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to remove member');
  });
});

// =============================================================================
// POST /api/deal-rooms/[id]/nda (Accept NDA)
// =============================================================================

describe('POST /api/deal-rooms/[id]/nda', () => {
  it('accepts NDA for a member', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(
      makeMember({ ndaAcceptedAt: null })
    );
    (mockPrisma.dealRoomMember.update as jest.Mock).mockResolvedValue({});
    (mockPrisma.dealRoomActivity.create as jest.Mock).mockResolvedValue({});

    const req = jsonRequest('http://localhost/api/deal-rooms/room-1/nda', {
      email: 'member@example.com',
    });
    const res = await ndaPOST(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe('NDA accepted');
  });

  it('returns already-accepted message if NDA was previously accepted', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(
      makeMember({ ndaAcceptedAt: new Date('2026-01-10') })
    );

    const req = jsonRequest('http://localhost/api/deal-rooms/room-1/nda', {
      email: 'member@example.com',
    });
    const res = await ndaPOST(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe('NDA already accepted');
    // Should not call update or create activity
    expect(mockPrisma.dealRoomMember.update).not.toHaveBeenCalled();
    expect(mockPrisma.dealRoomActivity.create).not.toHaveBeenCalled();
  });

  it('returns 400 when email is missing', async () => {
    const req = jsonRequest('http://localhost/api/deal-rooms/room-1/nda', {});
    const res = await ndaPOST(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Email required');
  });

  it('returns 403 when user is not a member', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockResolvedValue(null);

    const req = jsonRequest('http://localhost/api/deal-rooms/room-1/nda', {
      email: 'stranger@example.com',
    });
    const res = await ndaPOST(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('You are not a member of this room');
  });

  it('returns 500 when prisma throws', async () => {
    (mockPrisma.dealRoomMember.findFirst as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = jsonRequest('http://localhost/api/deal-rooms/room-1/nda', {
      email: 'member@example.com',
    });
    const res = await ndaPOST(req, { params: { id: 'room-1' } });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to accept NDA');
  });
});

// =============================================================================
// POST /api/deal-rooms/join (Join via access code)
// =============================================================================

describe('POST /api/deal-rooms/join', () => {
  it('joins a room using a valid access code', async () => {
    const room = makeDealRoom({ members: [] });
    (mockPrisma.dealRoom.findUnique as jest.Mock).mockResolvedValue(room);
    (mockPrisma.dealRoomMember.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.dealRoomActivity.create as jest.Mock).mockResolvedValue({});

    const req = jsonRequest('http://localhost/api/deal-rooms/join', {
      accessCode: 'abc123def456',
      email: 'joiner@example.com',
    });
    const res = await joinPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.roomId).toBe('room-1');
    expect(body.name).toBe('Series A Funding Room');
  });

  it('returns already-a-member message for existing member', async () => {
    const room = makeDealRoom({
      members: [makeMember({ email: 'existing@example.com' })],
    });
    (mockPrisma.dealRoom.findUnique as jest.Mock).mockResolvedValue(room);

    const req = jsonRequest('http://localhost/api/deal-rooms/join', {
      accessCode: 'abc123def456',
      email: 'existing@example.com',
    });
    const res = await joinPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.roomId).toBe('room-1');
    expect(body.message).toBe('Already a member');
  });

  it('returns 400 when accessCode is missing', async () => {
    const req = jsonRequest('http://localhost/api/deal-rooms/join', {
      email: 'joiner@example.com',
    });
    const res = await joinPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('accessCode and email are required');
  });

  it('returns 400 when email is missing', async () => {
    const req = jsonRequest('http://localhost/api/deal-rooms/join', {
      accessCode: 'abc123def456',
    });
    const res = await joinPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('accessCode and email are required');
  });

  it('returns 404 for invalid access code', async () => {
    (mockPrisma.dealRoom.findUnique as jest.Mock).mockResolvedValue(null);

    const req = jsonRequest('http://localhost/api/deal-rooms/join', {
      accessCode: 'bad-code',
      email: 'joiner@example.com',
    });
    const res = await joinPOST(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('Invalid access code');
  });

  it('returns 400 when room is not active', async () => {
    const room = makeDealRoom({ status: 'archived', members: [] });
    (mockPrisma.dealRoom.findUnique as jest.Mock).mockResolvedValue(room);

    const req = jsonRequest('http://localhost/api/deal-rooms/join', {
      accessCode: 'abc123def456',
      email: 'joiner@example.com',
    });
    const res = await joinPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('This deal room is no longer active');
  });

  it('auto-accepts NDA when room does not require it', async () => {
    const room = makeDealRoom({ ndaRequired: false, members: [] });
    (mockPrisma.dealRoom.findUnique as jest.Mock).mockResolvedValue(room);
    (mockPrisma.dealRoomMember.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.dealRoomActivity.create as jest.Mock).mockResolvedValue({});

    const req = jsonRequest('http://localhost/api/deal-rooms/join', {
      accessCode: 'abc123def456',
      email: 'joiner@example.com',
    });
    await joinPOST(req);

    expect(mockPrisma.dealRoomMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ndaAcceptedAt: expect.any(Date),
        }),
      })
    );
  });

  it('leaves NDA null when room requires it', async () => {
    const room = makeDealRoom({ ndaRequired: true, members: [] });
    (mockPrisma.dealRoom.findUnique as jest.Mock).mockResolvedValue(room);
    (mockPrisma.dealRoomMember.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.dealRoomActivity.create as jest.Mock).mockResolvedValue({});

    const req = jsonRequest('http://localhost/api/deal-rooms/join', {
      accessCode: 'abc123def456',
      email: 'joiner@example.com',
    });
    await joinPOST(req);

    expect(mockPrisma.dealRoomMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ndaAcceptedAt: null,
        }),
      })
    );
  });

  it('returns 500 when prisma throws', async () => {
    (mockPrisma.dealRoom.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = jsonRequest('http://localhost/api/deal-rooms/join', {
      accessCode: 'abc123def456',
      email: 'joiner@example.com',
    });
    const res = await joinPOST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to join room');
  });
});
