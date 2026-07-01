import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomService } from '../services/roomService';
import useRoomStore from '../store/roomStore';
import useAuthStore from '../store/authStore';
import AppLayout from '../components/layout/AppLayout';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { Badge, EmptyState, Spinner, Alert } from '../components/common/UI';
import styles from './JoinPage.module.css';

// ── Room preview card shown before confirming join ────────────────────────────
const JoinPreview = ({ preview, onConfirm, onCancel, joining }) => (
  <div className={styles.preview}>
    <div className={styles.previewHeader}>
      <div className={styles.previewIcon}>🚪</div>
      <div>
        <h3 className={styles.previewName}>{preview.name}</h3>
        <code className={styles.previewCode}>{preview.code}</code>
      </div>
    </div>
    <div className={styles.previewBody}>
      <p className={styles.previewTask}>
        <span className={styles.previewLabel}>Task: </span>
        {preview.taskName}
      </p>
      {preview.description && (
        <p className={styles.previewDesc}>{preview.description}</p>
      )}
      <p className={styles.previewMeta}>
        {preview.totalMembers} member{preview.totalMembers !== 1 ? 's' : ''} already in this room
      </p>
    </div>
    <div className={styles.previewActions}>
      <Button variant="secondary" onClick={onCancel} disabled={joining}>Cancel</Button>
      <Button variant="primary" onClick={onConfirm} loading={joining}>Join room</Button>
    </div>
  </div>
);

// ── Existing room row ─────────────────────────────────────────────────────────
const RoomRow = ({ room, onClick }) => {
  const members   = room.members || [];
  const completed = members.filter((m) => m.isCompleted).length;
  const total     = members.length;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone   = total > 0 && completed === total;
  const myDone    = room.myStatus?.isCompleted;

  return (
    <div className={styles.roomRow} onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <div className={styles.roomRowLeft}>
        <div className={styles.roomRowTitleRow}>
          <span className={styles.roomRowName}>{room.name}</span>
          <code className={styles.roomRowCode}>{room.code}</code>
        </div>
        <span className={styles.roomRowTask}>{room.taskName}</span>
        <div className={styles.roomRowProgress}>
          <div className={styles.progressTrack}>
            <div
              className={[styles.progressFill, allDone ? styles.progressDone : ''].join(' ')}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={styles.progressText}>{completed}/{total}</span>
        </div>
      </div>
      <div className={styles.roomRowRight}>
        <Badge variant={myDone ? 'success' : 'default'}>
          {myDone ? '✓ Done' : 'Pending'}
        </Badge>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const JoinPage = () => {
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const { rooms, fetchMyRooms } = useRoomStore();

  const [code, setCode]       = useState('');
  const [looking, setLooking] = useState(false);
  const [preview, setPreview] = useState(null);
  const [joining, setJoining] = useState(false);
  const [error, setError]     = useState('');
  const [roomsLoading, setRoomsLoading] = useState(true);

  useEffect(() => {
    fetchMyRooms().finally(() => setRoomsLoading(false));
  }, []);

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError('');
    setPreview(null);
    setLooking(true);
    try {
      const { data } = await roomService.getRoomByCode(code.trim());
      const room = data.room;
      if (room.isMember) {
        navigate(`/rooms/${room._id}`);
        return;
      }
      if (!room.joinable) {
        setError('This room is closed. Ask an admin to add you.');
        return;
      }
      setPreview(room);
    } catch (err) {
      setError(err.response?.data?.message || 'Room not found. Check the code and try again.');
    } finally {
      setLooking(false);
    }
  };

  const handleConfirmJoin = async () => {
    setJoining(true);
    setError('');
    try {
      const { data } = await roomService.joinRoom(code.trim());
      await fetchMyRooms();
      navigate(`/rooms/${data.room._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join room.');
      setPreview(null);
    } finally {
      setJoining(false);
    }
  };

  return (
    <AppLayout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>
            Hey, {user?.displayName || user?.username} 👋
          </h1>
          <p className={styles.pageSub}>
            Enter a room code to join, or open one of your existing rooms below.
          </p>
        </div>

        <div className={styles.joinCard}>
          <h2 className={styles.joinCardTitle}>Join a room</h2>
          {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}

          {preview ? (
            <JoinPreview
              preview={preview}
              onConfirm={handleConfirmJoin}
              onCancel={() => { setPreview(null); setCode(''); }}
              joining={joining}
            />
          ) : (
            <form onSubmit={handleLookup} className={styles.codeForm}>
              <Input
                label="Room code"
                value={code}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
                placeholder="e.g. XK7P2Q"
                hint="Ask your admin for the room code"
                maxLength={10}
              />
              <Button type="submit" loading={looking} size="lg" fullWidth>
                Look up room
              </Button>
            </form>
          )}
        </div>

        <div className={styles.roomsSection}>
          <h2 className={styles.sectionTitle}>Your rooms</h2>
          {roomsLoading ? (
            <div className={styles.centered}><Spinner /></div>
          ) : rooms.length === 0 ? (
            <EmptyState
              icon="🏠"
              title="No rooms yet"
              description="Enter a room code above to join your first room."
            />
          ) : (
            <div className={styles.roomList}>
              {rooms.map((room) => (
                <RoomRow key={room._id} room={room} onClick={() => navigate(`/rooms/${room._id}`)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default JoinPage;
