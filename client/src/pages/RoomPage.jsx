import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useRoomStore from '../store/roomStore';
import useAuthStore from '../store/authStore';
import useSocketStore from '../store/socketStore';
import { useRoomSocket } from '../hooks/useSocket';
import AppLayout from '../components/layout/AppLayout';
import Button from '../components/common/Button';
import { Badge, Avatar, PageLoader, Alert, EmptyState } from '../components/common/UI';
import { timeAgo, formatDateTime, activityLabel } from '../utils/date';
import styles from './RoomPage.module.css';

// ── Member row ────────────────────────────────────────────────────────────────
const MemberRow = ({ member, isCurrentUser, onlineUsers }) => {
  const name = member.user?.displayName || member.user?.username || '?';
  const isOnline = onlineUsers.some((u) => u.userId === member.user?._id?.toString());

  return (
    <div className={[styles.memberRow, member.isCompleted ? styles.memberDone : ''].join(' ')}>
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
  const { currentRoom, activities, loading, actionLoading, error, fetchRoom, completeTask, reopenTask, clearError, clearCurrentRoom } = useRoomStore();
  const { user, isAdmin } = useAuthStore();
  const onlineUsers = useSocketStore((s) => s.getOnlineUsers(id));

  // Join the socket room for real-time updates
  useRoomSocket(id);

  useEffect(() => {
    fetchRoom(id);
    return () => clearCurrentRoom();
  }, [id]);

  if (loading && !currentRoom) return <PageLoader />;
  if (!currentRoom && !loading) {
    return (
      <AppLayout>
        <EmptyState icon="🚪" title="Room not found"
          description="This room doesn't exist or you're not a member."
          action={<Button onClick={() => navigate('/dashboard')}>Back to dashboard</Button>} />
      </AppLayout>
    );
  }

  const room = currentRoom;
  const members = room?.members || [];
  const completedCount = members.filter((m) => m.isCompleted).length;
  const totalMembers = members.length;
  const pct = totalMembers > 0 ? Math.round((completedCount / totalMembers) * 100) : 0;
  const allDone = totalMembers > 0 && completedCount === totalMembers;

  const myMember = members.find(
    (m) => m.user?._id?.toString() === user?._id?.toString()
  );
  const myCompleted = myMember?.isCompleted || false;

  const handleTaskToggle = async () => {
    if (myCompleted) {
      await reopenTask(id);
    } else {
      await completeTask(id);
    }
  };

  return (
    <AppLayout>
      <div className={styles.page}>
        {/* Back nav */}
        <button className={styles.backBtn} onClick={() => navigate('/dashboard')}>
          ← Back to dashboard
        </button>

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
                </div>
                {room.description && (
                  <p className={styles.roomDesc}>{room.description}</p>
                )}
              </div>

              {/* Overall progress */}
              <div className={styles.progressSection}>
                <div className={styles.progressHeader}>
                  <span className={styles.progressLabel}>Team progress</span>
                  <span className={styles.progressCount}>
                    {completedCount} / {totalMembers}
                    <span className={styles.progressPct}>{pct}%</span>
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
              <p className={styles.noActivity}>No activity yet. Complete your task to get started.</p>
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
