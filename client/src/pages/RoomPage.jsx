import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useRoomStore from '../store/roomStore';
import useAuthStore from '../store/authStore';
import useSocketStore from '../store/socketStore';
import { useRoomSocket } from '../hooks/useSocket';
import { roomService } from '../services/roomService';
import { taskService } from '../services/taskService';
import AppLayout from '../components/layout/AppLayout';
import Button from '../components/common/Button';
import { Badge, Avatar, PageLoader, Alert, EmptyState } from '../components/common/UI';
import { timeAgo, formatDateTime, activityLabel } from '../utils/date';
import styles from './RoomPage.module.css';

// ── Member row ────────────────────────────────────────────────────────────────
const MemberRow = ({ member, isCurrentUser, onlineUsers, isPulsing }) => {
  const name = member.user?.displayName || member.user?.username || '?';
  const isOnline = onlineUsers.some((u) => u.userId === member.user?._id?.toString());

  return (
    <div className={[
      styles.memberRow,
      member.isCompleted ? styles.memberDone : '',
      isPulsing ? styles.memberPulse : '',
    ].join(' ')}>
      <div className={styles.memberLeft}>
        <Avatar name={name} size="sm" online={isOnline} />
        <div>
          <span className={styles.memberName}>
            {name}
            {isCurrentUser && <span className={styles.youTag}> (you)</span>}
          </span>
          {member.isCompleted && member.completedAt && (
            <span className={styles.completedTime}>
              Completed {timeAgo(member.completedAt)}
            </span>
          )}
        </div>
      </div>
      <div className={styles.memberRight}>
        {isOnline && !member.isCompleted && (
          <span className={styles.onlineLabel}>Online</span>
        )}
        <Badge variant={member.isCompleted ? 'success' : 'default'}>
          {member.isCompleted ? '✓ Done' : 'Pending'}
        </Badge>
      </div>
    </div>
  );
};

// ── Activity feed item ────────────────────────────────────────────────────────
const ActivityItem = ({ activity }) => {
  const name = activity.user?.displayName || activity.user?.username || 'Someone';
  const isCompletion = activity.type === 'task_completed';
  return (
    <div className={[styles.activityItem, isCompletion ? styles.activityDone : ''].join(' ')}>
      <span className={styles.activityDot} />
      <div className={styles.activityContent}>
        <span className={styles.activityText}>{activityLabel(activity.type, name)}</span>
        <span className={styles.activityTime}>{timeAgo(activity.createdAt)}</span>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const RoomPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // ── ALL hooks must come before any conditional return ──────────────────────
  const { currentRoom, activities, loading, actionLoading, error,
          recentlyUpdated, fetchRoom, completeTask, reopenTask,
          clearError, clearCurrentRoom } = useRoomStore();
  const { user, isAdmin } = useAuthStore();
  const onlineUsers = useSocketStore((s) => s.getOnlineUsers(id));
  const [leaving, setLeaving]   = useState(false);
  const [resetting, setResetting] = useState(false);

  useRoomSocket(id);

  useEffect(() => {
    fetchRoom(id);
    return () => clearCurrentRoom();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived values (safe — room may be null, handled below) ───────────────
  const members       = currentRoom?.members || [];
  const completedCount = members.filter((m) => m.isCompleted).length;
  const totalMembers  = members.length;
  const pct           = totalMembers > 0 ? Math.round((completedCount / totalMembers) * 100) : 0;
  const allDone       = totalMembers > 0 && completedCount === totalMembers;
  const myMember      = members.find((m) => m.user?._id?.toString() === user?._id?.toString());
  const myCompleted   = myMember?.isCompleted || false;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleTaskToggle = async () => {
    if (myCompleted) await reopenTask(id, user._id);
    else             await completeTask(id, user._id);
  };

  const handleLeave = async () => {
    if (!confirm(`Leave "${currentRoom?.name}"? You can rejoin with the room code.`)) return;
    setLeaving(true);
    try {
      await roomService.leaveRoom(id);
      navigate('/join');
    } catch {
      setLeaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset ALL member statuses in this room to pending? This cannot be undone.')) return;
    setResetting(true);
    try {
      console.log("in handle reset try");
      await taskService.resetAll(id);
    } catch {
      // socket event task:reset will update UI; error shown via toast from useSocket
    } finally {
      setResetting(false);
    }
  };

  // ── Conditional renders AFTER all hooks ────────────────────────────────────
  if (loading && !currentRoom) return <PageLoader />;

  if (!currentRoom && !loading) {
    return (
      <AppLayout>
        <EmptyState
          icon="🚪"
          title="Room not found"
          description="This room doesn't exist or you are not a member."
          action={<Button onClick={() => navigate('/join')}>Back to rooms</Button>}
        />
      </AppLayout>
    );
  }

  const room = currentRoom;

  return (
    <AppLayout>
      <div className={styles.page}>
        {/* Top nav */}
        <div className={styles.topNav}>
          <button className={styles.backBtn} onClick={() => navigate('/join')}>
            ← Back to rooms
          </button>
          <div className={styles.topNavActions}>
            {isAdmin() && (
              <Button variant="secondary" size="sm" onClick={handleReset} loading={resetting}>
                ↺ Reset statuses
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleLeave} loading={leaving}
              className={styles.leaveBtn}>
              Leave room
            </Button>
          </div>
        </div>

        {error && <Alert variant="danger" onClose={clearError}>{error}</Alert>}

        <div className={styles.layout}>
          {/* ── Left column ── */}
          <div className={styles.mainCol}>
            {/* Room header */}
            <div className={styles.roomHeader}>
              <div className={styles.roomMeta}>
                <div className={styles.roomTitleRow}>
                  <h1 className={styles.roomTitle}>{room.name}</h1>
                  <code className={styles.roomCode}>{room.code}</code>
                  {!room.joinable && (
                    <Badge variant="warning">Closed</Badge>
                  )}
                </div>
                {room.description && (
                  <p className={styles.roomDesc}>{room.description}</p>
                )}
              </div>

              {/* Progress */}
              <div className={styles.progressSection}>
                <div className={styles.progressHeader}>
                  <span className={styles.progressLabel}>Team progress</span>
                  <span className={styles.progressCount}>
                    {completedCount} / {totalMembers}
                    <span className={styles.progressPct}> {pct}%</span>
                  </span>
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={[styles.progressFill, allDone ? styles.progressDone : ''].join(' ')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {allDone && (
                  <p className={styles.allDoneMsg}>🎉 Everyone has completed the task!</p>
                )}
              </div>
            </div>

            {/* Task card */}
            <div className={styles.taskCard}>
              <div className={styles.taskCardInner}>
                <div>
                  <p className={styles.taskLabel}>Your task</p>
                  <h2 className={styles.taskName}>{room.taskName}</h2>
                  {myMember?.completedAt && myCompleted && (
                    <p className={styles.completedAt}>
                      Completed {formatDateTime(myMember.completedAt)}
                    </p>
                  )}
                </div>
                <Button
                  variant={myCompleted ? 'secondary' : 'success'}
                  size="lg"
                  loading={actionLoading}
                  onClick={handleTaskToggle}
                  className={styles.taskBtn}
                >
                  {myCompleted ? '↩ Mark as pending' : '✓ Mark complete'}
                </Button>
              </div>
            </div>

            {/* Members list */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Members</h2>
                <Badge variant="default">{totalMembers}</Badge>
              </div>
              <div className={styles.memberList}>
                {members.map((m) => (
                  <MemberRow
                    key={m.user?._id}
                    member={m}
                    isCurrentUser={m.user?._id?.toString() === user?._id?.toString()}
                    onlineUsers={onlineUsers}
                    isPulsing={!!recentlyUpdated[m.user?._id?.toString()]}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── Right column — activity feed ── */}
          <aside className={styles.sidebar}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Activity</h2>
              <span className={styles.liveTag}>
                <span className={styles.liveDot} /> Live
              </span>
            </div>

            {activities.length === 0 ? (
              <p className={styles.noActivity}>
                No activity yet. Complete your task to get started.
              </p>
            ) : (
              <div className={styles.activityFeed}>
                {activities.map((a) => (
                  <ActivityItem key={a._id} activity={a} />
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </AppLayout>
  );
};

export default RoomPage;
