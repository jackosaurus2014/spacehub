'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface DealRoomMember {
  id: string;
  dealRoomId: string;
  userId: string | null;
  email: string;
  role: string;
  ndaAcceptedAt: string | null;
  invitedAt: string;
  joinedAt: string | null;
  lastAccessAt: string | null;
}

interface DealRoomDocument {
  id: string;
  dealRoomId: string;
  name: string;
  category: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  description: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface DealRoomActivity {
  id: string;
  dealRoomId: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  details: string | null;
  createdAt: string;
}

interface DealRoom {
  id: string;
  name: string;
  description: string | null;
  companySlug: string | null;
  status: string;
  createdBy: string;
  accessCode: string | null;
  ndaRequired: boolean;
  ndaText: string | null;
  createdAt: string;
  updatedAt: string;
  members: DealRoomMember[];
  documents: DealRoomDocument[];
  activities: DealRoomActivity[];
  _count: { documents: number; members: number; activities: number };
  myRole: string;
  ndaAccepted: boolean;
}

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pitch_deck: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30' },
  financials: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  technical: { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/30' },
  legal: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30' },
  team: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' },
  general: { bg: 'bg-slate-500/20', text: 'text-slate-300', border: 'border-slate-500/30' },
};

const CATEGORY_LABELS: Record<string, string> = {
  pitch_deck: 'Pitch Deck',
  financials: 'Financials',
  technical: 'Technical',
  legal: 'Legal',
  team: 'Team',
  general: 'General',
};

const ROLE_BADGES: Record<string, { bg: string; text: string }> = {
  owner: { bg: 'bg-amber-500/20', text: 'text-amber-300' },
  admin: { bg: 'bg-cyan-500/20', text: 'text-cyan-300' },
  viewer: { bg: 'bg-slate-500/20', text: 'text-slate-300' },
};

const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: 'PDF',
  pptx: 'PPT',
  xlsx: 'XLS',
  docx: 'DOC',
  png: 'PNG',
  jpg: 'JPG',
  csv: 'CSV',
  txt: 'TXT',
};

const ACTION_LABELS: Record<string, string> = {
  created_room: 'Created the room',
  joined_room: 'Joined the room',
  accepted_nda: 'Accepted the NDA',
  invited_member: 'Invited a member',
  removed_member: 'Removed a member',
  uploaded_document: 'Uploaded a document',
  viewed_document: 'Viewed a document',
  downloaded_document: 'Downloaded a document',
  updated_room: 'Updated room settings',
  archived_room: 'Archived the room',
};

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

// ────────────────────────────────────────
// Component
// ────────────────────────────────────────

export default function DealRoomsPage() {
  // Auth state (simplified - uses email)
  const [userEmail, setUserEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Room state
  const [rooms, setRooms] = useState<DealRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<DealRoom | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Room detail state
  const [activeTab, setActiveTab] = useState<'documents' | 'members' | 'activity' | 'settings'>('documents');
  const [roomDetail, setRoomDetail] = useState<{
    room: DealRoom;
    myRole: string;
    ndaAccepted: boolean;
  } | null>(null);

  // Create room state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    companySlug: '',
    ndaRequired: false,
    ndaText: '',
  });

  // Join room state
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  // Invite member state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'viewer' });

  // Upload document state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    category: 'general',
    fileType: 'pdf',
    fileSize: 0,
    description: '',
  });

  // NDA state
  const [showNdaModal, setShowNdaModal] = useState(false);

  // Edit room state
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    ndaRequired: false,
    ndaText: '',
  });

  // ── Fetch rooms ──
  const fetchRooms = useCallback(async () => {
    if (!userEmail) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/deal-rooms?email=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      if (res.ok) {
        setRooms(data.rooms || []);
      } else {
        setError(data.error || 'Failed to fetch rooms');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  // ── Fetch room detail ──
  const fetchRoomDetail = useCallback(async (roomId: string) => {
    if (!userEmail) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/deal-rooms/${roomId}?email=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      if (res.ok) {
        setRoomDetail(data);
        setSelectedRoom(data.room);
        // Initialize edit form
        setEditForm({
          name: data.room.name,
          description: data.room.description || '',
          ndaRequired: data.room.ndaRequired,
          ndaText: data.room.ndaText || '',
        });
        // Show NDA modal if required and not accepted
        if (data.room.ndaRequired && !data.ndaAccepted) {
          setShowNdaModal(true);
        }
      } else {
        setError(data.error || 'Failed to fetch room');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRooms();
    }
  }, [isAuthenticated, fetchRooms]);

  // ── Create room ──
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/deal-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          createdByEmail: userEmail,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowCreateForm(false);
        setCreateForm({ name: '', description: '', companySlug: '', ndaRequired: false, ndaText: '' });
        fetchRooms();
        // Open the newly created room
        fetchRoomDetail(data.room.id);
      } else {
        setError(data.error || 'Failed to create room');
      }
    } catch {
      setError('Network error');
    }
  };

  // ── Join room ──
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/deal-rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: joinCode.trim(), email: userEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowJoinForm(false);
        setJoinCode('');
        fetchRooms();
        if (data.roomId) {
          fetchRoomDetail(data.roomId);
        }
      } else {
        setError(data.error || 'Failed to join room');
      }
    } catch {
      setError('Network error');
    }
  };

  // ── Invite member ──
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    setError('');
    try {
      const res = await fetch(`/api/deal-rooms/${selectedRoom.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteeEmail: inviteForm.email,
          role: inviteForm.role,
          inviterEmail: userEmail,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowInviteForm(false);
        setInviteForm({ email: '', role: 'viewer' });
        fetchRoomDetail(selectedRoom.id);
      } else {
        setError(data.error || 'Failed to invite member');
      }
    } catch {
      setError('Network error');
    }
  };

  // ── Remove member ──
  const handleRemoveMember = async (memberEmail: string) => {
    if (!selectedRoom) return;
    if (!confirm(`Remove ${memberEmail} from this room?`)) return;
    try {
      const res = await fetch(
        `/api/deal-rooms/${selectedRoom.id}/members?memberEmail=${encodeURIComponent(memberEmail)}&requesterEmail=${encodeURIComponent(userEmail)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (res.ok) {
        fetchRoomDetail(selectedRoom.id);
      } else {
        setError(data.error || 'Failed to remove member');
      }
    } catch {
      setError('Network error');
    }
  };

  // ── Upload document (metadata only) ──
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    setError('');
    try {
      const res = await fetch(`/api/deal-rooms/${selectedRoom.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...uploadForm,
          fileSize: uploadForm.fileSize || 1024, // Default 1KB for metadata-only
          uploaderEmail: userEmail,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowUploadForm(false);
        setUploadForm({ name: '', category: 'general', fileType: 'pdf', fileSize: 0, description: '' });
        fetchRoomDetail(selectedRoom.id);
      } else {
        setError(data.error || 'Failed to upload document');
      }
    } catch {
      setError('Network error');
    }
  };

  // ── Accept NDA ──
  const handleAcceptNda = async () => {
    if (!selectedRoom) return;
    try {
      const res = await fetch(`/api/deal-rooms/${selectedRoom.id}/nda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });
      if (res.ok) {
        setShowNdaModal(false);
        fetchRoomDetail(selectedRoom.id);
      }
    } catch {
      setError('Network error');
    }
  };

  // ── Update room settings ──
  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    setError('');
    try {
      const res = await fetch(`/api/deal-rooms/${selectedRoom.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, email: userEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchRoomDetail(selectedRoom.id);
        fetchRooms();
      } else {
        setError(data.error || 'Failed to update room');
      }
    } catch {
      setError('Network error');
    }
  };

  // ── Archive room ──
  const handleArchiveRoom = async () => {
    if (!selectedRoom) return;
    if (!confirm('Are you sure you want to archive this room? Members will no longer be able to access it.')) return;
    try {
      const res = await fetch(
        `/api/deal-rooms/${selectedRoom.id}?email=${encodeURIComponent(userEmail)}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setSelectedRoom(null);
        setRoomDetail(null);
        fetchRooms();
      }
    } catch {
      setError('Network error');
    }
  };

  // ── Copy access code ──
  const copyAccessCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  // ────────────────────────────────────────
  // Auth gate (simplified email auth)
  // ────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">
              <svg className="w-16 h-16 mx-auto text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-100 mb-2">Space Industry Deal Room</h1>
            <p className="text-slate-400">Secure document sharing for investors and startups</p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">Enter your email to get started</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (userEmail.trim() && userEmail.includes('@')) {
                  setIsAuthenticated(true);
                }
              }}
            >
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 mb-4"
                required
              />
              <button
                type="submit"
                className="w-full px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors"
              >
                Continue
              </button>
            </form>
            <p className="text-xs text-slate-500 mt-3 text-center">
              Full authentication coming soon. Email is used for room access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────
  // NDA Modal
  // ────────────────────────────────────────
  const NdaModal = () => {
    if (!showNdaModal || !selectedRoom?.ndaRequired) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
          <h3 className="text-xl font-bold text-slate-100 mb-2">Non-Disclosure Agreement Required</h3>
          <p className="text-sm text-slate-400 mb-4">You must accept the NDA before accessing documents in this room.</p>
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 mb-4 max-h-60 overflow-y-auto">
            <p className="text-sm text-slate-300 whitespace-pre-wrap">
              {selectedRoom.ndaText || 'By accepting this agreement, you acknowledge that all materials shared within this Deal Room are confidential. You agree not to share, distribute, or disclose any documents, data, or information accessed through this room without explicit written consent from the room owner. Violation of this agreement may result in legal action.'}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAcceptNda}
              className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors"
            >
              I Accept the NDA
            </button>
            <button
              onClick={() => {
                setShowNdaModal(false);
                setSelectedRoom(null);
                setRoomDetail(null);
              }}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ────────────────────────────────────────
  // Room Detail View
  // ────────────────────────────────────────
  if (selectedRoom && roomDetail) {
    const room = roomDetail.room;
    const isOwnerOrAdmin = roomDetail.myRole === 'owner' || roomDetail.myRole === 'admin';
    const ndaBlocked = room.ndaRequired && !roomDetail.ndaAccepted;

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <NdaModal />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back button */}
          <button
            onClick={() => {
              setSelectedRoom(null);
              setRoomDetail(null);
              setActiveTab('documents');
              fetchRooms();
            }}
            className="flex items-center gap-2 text-slate-400 hover:text-cyan-300 mb-6 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to My Rooms
          </button>

          {/* Room Header */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-slate-100">{room.name}</h1>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    room.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' :
                    room.status === 'archived' ? 'bg-slate-500/20 text-slate-400' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ROLE_BADGES[roomDetail.myRole]?.bg || ''} ${ROLE_BADGES[roomDetail.myRole]?.text || ''}`}>
                    {roomDetail.myRole.charAt(0).toUpperCase() + roomDetail.myRole.slice(1)}
                  </span>
                  {room.ndaRequired && (
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      NDA Required
                    </span>
                  )}
                </div>
                {room.description && (
                  <p className="text-slate-400 mb-2">{room.description}</p>
                )}
                {room.companySlug && (
                  <Link href={`/company-profiles/${room.companySlug}`} className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                    View Company Profile
                  </Link>
                )}
              </div>

              {/* Access Code */}
              {room.accessCode && isOwnerOrAdmin && (
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 min-w-[200px]">
                  <p className="text-xs text-slate-500 mb-1">Invite Code</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-cyan-300 bg-slate-800 px-2 py-1 rounded flex-1">
                      {room.accessCode}
                    </code>
                    <button
                      onClick={() => copyAccessCode(room.accessCode!)}
                      className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                      title="Copy access code"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Share this code to invite others</p>
                </div>
              )}
            </div>

            {/* Stats bar */}
            <div className="flex gap-6 mt-4 pt-4 border-t border-slate-700/50">
              <div className="text-center">
                <p className="text-lg font-bold text-slate-200">{room._count.members}</p>
                <p className="text-xs text-slate-500">Members</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-200">{room._count.documents}</p>
                <p className="text-xs text-slate-500">Documents</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-200">{room._count.activities}</p>
                <p className="text-xs text-slate-500">Activities</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-200">{formatDate(room.createdAt)}</p>
                <p className="text-xs text-slate-500">Created</p>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg mb-4">
              {error}
              <button onClick={() => setError('')} className="ml-4 text-red-400 hover:text-red-300">dismiss</button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-slate-800/40 rounded-lg p-1 border border-slate-700/50">
            {(['documents', 'members', 'activity', 'settings'] as const).map((tab) => {
              if (tab === 'settings' && roomDetail.myRole !== 'owner') return null;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 border border-transparent'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'documents' && <span className="ml-1.5 text-xs opacity-60">({room._count.documents})</span>}
                  {tab === 'members' && <span className="ml-1.5 text-xs opacity-60">({room._count.members})</span>}
                </button>
              );
            })}
          </div>

          {/* ── Documents Tab ── */}
          {activeTab === 'documents' && (
            <div>
              {ndaBlocked ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-amber-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-slate-200 mb-2">NDA Acceptance Required</h3>
                  <p className="text-slate-400 mb-4">You must accept the Non-Disclosure Agreement before viewing documents.</p>
                  <button
                    onClick={() => setShowNdaModal(true)}
                    className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-colors"
                  >
                    Review & Accept NDA
                  </button>
                </div>
              ) : (
                <>
                  {isOwnerOrAdmin && (
                    <div className="flex justify-end mb-4">
                      <button
                        onClick={() => setShowUploadForm(!showUploadForm)}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Document
                      </button>
                    </div>
                  )}

                  {/* Upload form */}
                  {showUploadForm && (
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 mb-6">
                      <h3 className="text-lg font-semibold text-slate-200 mb-1">Add Document Metadata</h3>
                      <p className="text-xs text-slate-500 mb-4">File upload coming soon. For now, track document metadata for your deal room.</p>
                      <form onSubmit={handleUploadDocument} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-slate-400 mb-1">Document Name *</label>
                          <input
                            type="text"
                            value={uploadForm.name}
                            onChange={(e) => setUploadForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="Q4 2025 Pitch Deck"
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400 mb-1">Category</label>
                          <select
                            value={uploadForm.category}
                            onChange={(e) => setUploadForm(f => ({ ...f, category: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500/50"
                          >
                            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400 mb-1">File Type</label>
                          <select
                            value={uploadForm.fileType}
                            onChange={(e) => setUploadForm(f => ({ ...f, fileType: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500/50"
                          >
                            {Object.entries(FILE_TYPE_ICONS).map(([key, label]) => (
                              <option key={key} value={key}>.{key} ({label})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400 mb-1">File Size (bytes)</label>
                          <input
                            type="number"
                            value={uploadForm.fileSize || ''}
                            onChange={(e) => setUploadForm(f => ({ ...f, fileSize: parseInt(e.target.value) || 0 }))}
                            placeholder="1048576"
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm text-slate-400 mb-1">Description</label>
                          <input
                            type="text"
                            value={uploadForm.description}
                            onChange={(e) => setUploadForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Latest investor presentation with Q4 financials"
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                          />
                        </div>
                        <div className="md:col-span-2 flex gap-3">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
                          >
                            Add Document
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowUploadForm(false)}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Documents grid */}
                  {room.documents.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p>No documents yet</p>
                      {isOwnerOrAdmin && <p className="text-xs mt-1">Click &quot;Add Document&quot; to get started</p>}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {room.documents.map((doc) => {
                        const catStyle = CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.general;
                        return (
                          <div key={doc.id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/50 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 rounded text-xs font-bold bg-slate-700 text-slate-300 font-mono">
                                  {FILE_TYPE_ICONS[doc.fileType] || doc.fileType.toUpperCase()}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}>
                                  {CATEGORY_LABELS[doc.category] || doc.category}
                                </span>
                              </div>
                              {doc.version > 1 && (
                                <span className="text-xs text-slate-500">v{doc.version}</span>
                              )}
                            </div>
                            <h4 className="text-sm font-semibold text-slate-200 mb-1 line-clamp-2">{doc.name}</h4>
                            {doc.description && (
                              <p className="text-xs text-slate-400 mb-2 line-clamp-2">{doc.description}</p>
                            )}
                            <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2 border-t border-slate-700/50">
                              <span>{formatFileSize(doc.fileSize)}</span>
                              <span>{formatDate(doc.createdAt)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Members Tab ── */}
          {activeTab === 'members' && (
            <div>
              {isOwnerOrAdmin && (
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => setShowInviteForm(!showInviteForm)}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Invite Member
                  </button>
                </div>
              )}

              {/* Invite form */}
              {showInviteForm && (
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 mb-6">
                  <h3 className="text-lg font-semibold text-slate-200 mb-4">Invite Member</h3>
                  <form onSubmit={handleInviteMember} className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="investor@example.com"
                      className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                      required
                    />
                    <select
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm(f => ({ ...f, role: e.target.value }))}
                      className="px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
                    >
                      Send Invite
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowInviteForm(false)}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </form>
                </div>
              )}

              {/* Members list */}
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">NDA</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Last Access</th>
                      {isOwnerOrAdmin && (
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {room.members.map((member) => (
                      <tr key={member.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-200">{member.email}</p>
                          {!member.joinedAt && (
                            <span className="text-xs text-slate-500 italic">Invited, not yet joined</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ROLE_BADGES[member.role]?.bg || ''} ${ROLE_BADGES[member.role]?.text || ''}`}>
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          {room.ndaRequired ? (
                            member.ndaAcceptedAt ? (
                              <span className="text-xs text-emerald-400">Accepted</span>
                            ) : (
                              <span className="text-xs text-amber-400">Pending</span>
                            )
                          ) : (
                            <span className="text-xs text-slate-500">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs text-slate-500">
                            {member.lastAccessAt ? timeAgo(member.lastAccessAt) : 'Never'}
                          </span>
                        </td>
                        {isOwnerOrAdmin && (
                          <td className="px-4 py-3 text-right">
                            {member.role !== 'owner' && (
                              <button
                                onClick={() => handleRemoveMember(member.email)}
                                className="text-xs text-red-400 hover:text-red-300 transition-colors"
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Activity Tab ── */}
          {activeTab === 'activity' && (
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">Activity Timeline</h3>
              {room.activities.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No activity recorded yet</p>
              ) : (
                <div className="space-y-0">
                  {room.activities.map((activity, idx) => (
                    <div key={activity.id} className="flex gap-4 relative">
                      {/* Timeline line */}
                      {idx < room.activities.length - 1 && (
                        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-slate-700/50" />
                      )}
                      {/* Dot */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center mt-0.5 z-10">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.action.includes('created') ? 'bg-emerald-400' :
                          activity.action.includes('uploaded') ? 'bg-cyan-400' :
                          activity.action.includes('joined') || activity.action.includes('accepted') ? 'bg-blue-400' :
                          activity.action.includes('removed') || activity.action.includes('archived') ? 'bg-red-400' :
                          'bg-slate-400'
                        }`} />
                      </div>
                      {/* Content */}
                      <div className="pb-6 flex-1">
                        <p className="text-sm text-slate-200">
                          <span className="font-medium text-cyan-300">{activity.userEmail || 'System'}</span>
                          {' '}
                          <span className="text-slate-400">{ACTION_LABELS[activity.action] || activity.action}</span>
                        </p>
                        {activity.details && (
                          <p className="text-xs text-slate-500 mt-0.5">{activity.details}</p>
                        )}
                        <p className="text-xs text-slate-600 mt-1">{timeAgo(activity.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Settings Tab (Owner only) ── */}
          {activeTab === 'settings' && roomDetail.myRole === 'owner' && (
            <div className="space-y-6">
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-slate-200 mb-4">Room Settings</h3>
                <form onSubmit={handleUpdateRoom} className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Room Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500/50 resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.ndaRequired}
                        onChange={(e) => setEditForm(f => ({ ...f, ndaRequired: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                    </label>
                    <span className="text-sm text-slate-300">Require NDA before document access</span>
                  </div>
                  {editForm.ndaRequired && (
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">NDA Text</label>
                      <textarea
                        value={editForm.ndaText}
                        onChange={(e) => setEditForm(f => ({ ...f, ndaText: e.target.value }))}
                        rows={6}
                        placeholder="Enter your Non-Disclosure Agreement text here..."
                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                      />
                    </div>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
                  >
                    Save Changes
                  </button>
                </form>
              </div>

              {/* Danger zone */}
              <div className="bg-slate-800/60 border border-red-500/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-red-300 mb-2">Danger Zone</h3>
                <p className="text-sm text-slate-400 mb-4">Archiving a room will prevent members from accessing it. This action can be undone by contacting support.</p>
                <button
                  onClick={handleArchiveRoom}
                  className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 font-medium rounded-lg transition-colors"
                >
                  Archive Room
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────
  // Rooms List View (Main page)
  // ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <NdaModal />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-100">Space Industry Deal Room</h1>
              <div className="h-1 w-16 mt-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
            </div>
          </div>
          <p className="mt-3 text-lg text-slate-300 max-w-3xl">
            Secure document sharing for investors and startups. Create a private room, invite stakeholders,
            and share confidential materials with NDA protection.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg mb-4">
            {error}
            <button onClick={() => setError('')} className="ml-4 text-red-400 hover:text-red-300">dismiss</button>
          </div>
        )}

        {/* User email badge */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Signed in as <span className="text-cyan-300 font-medium">{userEmail}</span>
            <button
              onClick={() => { setIsAuthenticated(false); setRooms([]); setSelectedRoom(null); setRoomDetail(null); }}
              className="text-slate-500 hover:text-slate-300 ml-2 text-xs"
            >
              (switch)
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => { setShowCreateForm(!showCreateForm); setShowJoinForm(false); }}
            className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Room
          </button>
          <button
            onClick={() => { setShowJoinForm(!showJoinForm); setShowCreateForm(false); }}
            className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Join with Code
          </button>
        </div>

        {/* Create Room Form */}
        {showCreateForm && (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-slate-200 mb-4">Create New Deal Room</h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Room Name *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Series A Due Diligence - Acme Space Corp"
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Confidential materials for Series A investors reviewing Acme Space Corp"
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Company Profile Slug (optional)</label>
                <input
                  type="text"
                  value={createForm.companySlug}
                  onChange={(e) => setCreateForm(f => ({ ...f, companySlug: e.target.value }))}
                  placeholder="acme-space-corp"
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
                <p className="text-xs text-slate-500 mt-1">Link this room to a company profile on SpaceNexus</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.ndaRequired}
                    onChange={(e) => setCreateForm(f => ({ ...f, ndaRequired: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                </label>
                <span className="text-sm text-slate-300">Require NDA before viewing documents</span>
              </div>
              {createForm.ndaRequired && (
                <div>
                  <label className="block text-sm text-slate-400 mb-1">NDA Text</label>
                  <textarea
                    value={createForm.ndaText}
                    onChange={(e) => setCreateForm(f => ({ ...f, ndaText: e.target.value }))}
                    rows={6}
                    placeholder="Enter your Non-Disclosure Agreement text here..."
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                  />
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors"
                >
                  Create Room
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Join Room Form */}
        {showJoinForm && (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-slate-200 mb-4">Join a Deal Room</h2>
            <form onSubmit={handleJoinRoom} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter 12-character access code"
                className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono"
                required
              />
              <button
                type="submit"
                className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors"
              >
                Join Room
              </button>
              <button
                type="button"
                onClick={() => setShowJoinForm(false)}
                className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Rooms Grid */}
        {!loading && rooms.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-20 h-20 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-xl font-semibold text-slate-300 mb-2">No Deal Rooms Yet</h3>
            <p className="text-slate-500 max-w-md mx-auto mb-6">
              Create your first deal room to start sharing confidential documents with investors and partners,
              or join an existing room with an access code.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors"
              >
                Create Your First Room
              </button>
              <button
                onClick={() => setShowJoinForm(true)}
                className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
              >
                Join with Access Code
              </button>
            </div>
          </div>
        )}

        {!loading && rooms.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => {
              const roleStyle = ROLE_BADGES[room.myRole] || ROLE_BADGES.viewer;
              return (
                <button
                  key={room.id}
                  onClick={() => fetchRoomDetail(room.id)}
                  className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 text-left hover:border-cyan-500/30 hover:bg-slate-800/80 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors line-clamp-1">
                      {room.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0 ml-2 ${
                      room.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' :
                      room.status === 'archived' ? 'bg-slate-500/20 text-slate-400' :
                      'bg-red-500/20 text-red-300'
                    }`}>
                      {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                    </span>
                  </div>

                  {room.description && (
                    <p className="text-sm text-slate-400 mb-3 line-clamp-2">{room.description}</p>
                  )}

                  {room.companySlug && (
                    <p className="text-xs text-cyan-400/60 mb-3">
                      Company: {room.companySlug}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${roleStyle.bg} ${roleStyle.text}`}>
                      {room.myRole.charAt(0).toUpperCase() + room.myRole.slice(1)}
                    </span>
                    {room.ndaRequired && (
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        room.ndaAccepted
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {room.ndaAccepted ? 'NDA Signed' : 'NDA Required'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-3 border-t border-slate-700/50">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {room._count.members} members
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {room._count.documents} docs
                    </span>
                    <span className="ml-auto">{formatDate(room.createdAt)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Feature info cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-5">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h4 className="font-semibold text-slate-200 mb-1">NDA Protection</h4>
            <p className="text-sm text-slate-400">Require members to accept an NDA before accessing any confidential documents in the room.</p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-5">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h4 className="font-semibold text-slate-200 mb-1">Activity Tracking</h4>
            <p className="text-sm text-slate-400">Full audit trail of who viewed, uploaded, or downloaded documents. Complete transparency for all parties.</p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-5">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h4 className="font-semibold text-slate-200 mb-1">Invite by Code</h4>
            <p className="text-sm text-slate-400">Share a unique access code with investors or partners. They can join the room with a single click.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
