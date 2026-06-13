import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useRoomStore from '../store/roomStore';
import useAuthStore from '../store/authStore';
import AppLayout from '../components/layout/AppLayout';
import { Card, Badge, EmptyState, PageLoader, Avatar } from '../components/common/UI';
import styles from './DashboardPage.module.css';

const RoomCard = ({ room, onClick }) => {
  const members = room.members || [];
  const completed = members.filter((m) => m.isCompleted).length;
  const total = members.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = total > 0 && completed === total;
  const myStatus = room.myStatus;

  return (
    <Card hoverable onClick={onClick} className={styles.roomCard}>
      {/* Header */}
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleRow}>
          <h3 className={styles.cardTitle}>{room.name}</h3>
          <Badge variant={allDone ? 'success' : 'default'}>
            {allDone ? '✓ Done' : `${completed}/${total}`}
          </Badge>
        </div>
        <code className={styles.roomCode}>{room.code}</code>
      </div>

      {/* Task name */}
      <div className={styles.cardBody}>
        <p className={styles.taskLabel}>Task</p>
        <p className={styles.taskName}>{room.taskName}</p>
      </div>

      {/* Progress bar */}
      <div className={styles.progressTrack}>
        <div
          className={[styles.progressFill, allDone ? styles.progressDone : ''].join(' ')}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Footer */}
      <div className={styles.cardFooter}>
        {/* Member avatars */}
        <div className={styles.avatarStack}>
          {members.slice(0, 5).map((m) => (
            <Avatar
              key={m.user._id}
              name={m.user.displayName || m.user.username}
              size="xs"
            />
          ))}
          {members.length > 5 && (
            <span className={styles.moreAvatars}>+{members.length - 5}</span>
          )}
        </div>

        {/* My status */}
        {myStatus && (
          <Badge variant={myStatus.isCompleted ? 'success' : 'warning'}>
            {myStatus.isCompleted ? '✓ You\u2019re done' : 'Pending'}
          </Badge>
        )}
      </div>
    </Card>
  );
};

const DashboardPage = () => {
  const { rooms, loading, fetchMyRooms } = useRoomStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  //tested error handling
  // throw new Error('test');
  useEffect(() => { fetchMyRooms(); }, []);

  if (loading && !rooms.length) return <PageLoader />;

  const completedRooms = rooms.filter((r) => r.myStatus?.isCompleted).length;

  return (
    <AppLayout>
      <div className={styles.page}>
        {/* Page header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>
              Hey, {user?.displayName || user?.username} 👋
            </h1>
            <p className={styles.pageSub}>
              {rooms.length === 0
                ? 'You haven\'t been added to any rooms yet.'
                : `You're in ${rooms.length} room${rooms.length !== 1 ? 's' : ''} · ${completedRooms} task${completedRooms !== 1 ? 's' : ''} complete`}
            </p>
          </div>
        </div>

        {/* Room grid */}
        {rooms.length === 0 ? (
          <EmptyState
            icon="🏠"
            title="No rooms yet"
            description="An admin will add you to rooms. Check back soon."
          />
        ) : (
          <div className={styles.grid}>
            {rooms.map((room) => (
              <RoomCard
                key={room._id}
                room={room}
                onClick={() => navigate(`/rooms/${room._id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default DashboardPage;
