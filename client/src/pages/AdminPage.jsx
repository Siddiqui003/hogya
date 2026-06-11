import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomService } from '../services/roomService';
import AppLayout from '../components/layout/AppLayout';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { Badge, Card, Alert, EmptyState, Avatar, Spinner } from '../components/common/UI';
import { timeAgo } from '../utils/date';
import styles from './AdminPage.module.css';

// ── Create room modal ─────────────────────────────────────────────────────────
const CreateRoomModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({ name: '', taskName: '', description: '', code: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setError('');
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.taskName.trim()) {
      setError('Room name and task name are required.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await roomService.adminCreateRoom(form);
      onCreated(data.room);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create room.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Create room</h2>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        {error && <Alert variant="danger">{error}</Alert>}
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <Input label="Room name" name="name" value={form.name} onChange={handleChange}
            placeholder="Sprint Team Alpha" required />
          <Input label="Task name" name="taskName" value={form.taskName} onChange={handleChange}
            placeholder="Submit weekly status report" required />
          <Input label="Description" name="description" value={form.description} onChange={handleChange}
            placeholder="Optional description" />
          <Input label="Custom code" name="code" value={form.code} onChange={handleChange}
            placeholder="Leave blank to auto-generate" hint="4–10 uppercase alphanumeric chars" />
          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
            <Button type="submit" loading={loading}>Create room</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Add member modal ──────────────────────────────────────────────────────────
const AddMemberModal = ({ room, onClose, onAdded }) => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const { data } = await roomService.adminListUsers(search);
        setUsers(data.users);
      } catch {
        setError('Failed to load users.');
      } finally { setLoading(false); }
    };
    const t = setTimeout(fetchUsers, 200);
    return () => clearTimeout(t);
  }, [search]);

  const existingIds = new Set(room.members.map((m) => m.user?._id || m.user));

  const handleAdd = async (userId) => {
    setAdding(userId);
    setError('');
    try {
      const { data } = await roomService.adminAddMember(room._id, userId);
      onAdded(data.room);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member.');
    } finally { setAdding(null); }
  };

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Add member to "{room.name}"</h2>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        {error && <Alert variant="danger">{error}</Alert>}
        <Input placeholder="Search users…" value={search}
          onChange={(e) => setSearch(e.target.value)} className={styles.searchInput} />
        <div className={styles.userList}>
          {loading && <div className={styles.centered}><Spinner /></div>}
          {!loading && users.length === 0 && (
            <p className={styles.noUsers}>No users found.</p>
          )}
          {users.map((u) => {
            const isMember = existingIds.has(u._id);
            return (
              <div key={u._id} className={styles.userRow}>
                <div className={styles.userLeft}>
                  <Avatar name={u.displayName || u.username} size="sm" />
                  <div>
                    <span className={styles.userName}>{u.displayName || u.username}</span>
                    <span className={styles.userHandle}>@{u.username}</span>
                  </div>
                </div>
                {isMember ? (
                  <Badge variant="default">Already in room</Badge>
                ) : (
                  <Button size="sm" loading={adding === u._id}
                    onClick={() => handleAdd(u._id)}>Add</Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Room detail panel ─────────────────────────────────────────────────────────
const RoomPanel = ({ room, onUpdate }) => {
  const [removing, setRemoving] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRemoveMember = async (userId, username) => {
    if (!confirm(`Remove ${username} from this room?`)) return;
    setRemoving(userId);
    try {
      await roomService.adminRemoveMember(room._id, userId);
      onUpdate({ ...room, members: room.members.filter((m) => (m.user?._id || m.user) !== userId) });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove member.');
    } finally { setRemoving(null); }
  };

  const completed = room.members.filter((m) => m.isCompleted).length;
  const total = room.members.length;

  return (
    <div className={styles.panel}>
      {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}

      <div className={styles.panelHeader}>
        <div>
          <div className={styles.panelTitleRow}>
            <h2 className={styles.panelTitle}>{room.name}</h2>
            <code className={styles.code}>{room.code}</code>
          </div>
          <p className={styles.panelTask}>{room.taskName}</p>
        </div>
        <div className={styles.panelHeaderActions}>
          <Badge variant={completed === total && total > 0 ? 'success' : 'default'}>
            {completed}/{total} done
          </Badge>
          <Button size="sm" variant="secondary"
            onClick={() => navigate(`/rooms/${room._id}`)}>View room</Button>
        </div>
      </div>

      <div className={styles.panelSection}>
        <div className={styles.panelSectionHeader}>
          <h3 className={styles.panelSectionTitle}>Members ({total})</h3>
          <Button size="sm" onClick={() => setShowAddMember(true)}>+ Add member</Button>
        </div>

        {total === 0 ? (
          <p className={styles.emptyText}>No members yet. Add some above.</p>
        ) : (
          <div className={styles.memberTable}>
            {room.members.map((m) => {
              const u = m.user;
              const name = u?.displayName || u?.username || 'Unknown';
              const uid = u?._id || u;
              return (
                <div key={uid} className={styles.memberTableRow}>
                  <div className={styles.memberTableLeft}>
                    <Avatar name={name} size="sm" />
                    <div>
                      <span className={styles.memberTableName}>{name}</span>
                      {u?.username && <span className={styles.memberTableHandle}>@{u.username}</span>}
                    </div>
                  </div>
                  <div className={styles.memberTableRight}>
                    <Badge variant={m.isCompleted ? 'success' : 'default'}>
                      {m.isCompleted ? `✓ ${timeAgo(m.completedAt)}` : 'Pending'}
                    </Badge>
                    <button
                      className={styles.removeBtn}
                      onClick={() => handleRemoveMember(uid, name)}
                      disabled={removing === uid}
                      title="Remove from room"
                    >
                      {removing === uid ? <Spinner size="sm" /> : '✕'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddMember && (
        <AddMemberModal
          room={room}
          onClose={() => setShowAddMember(false)}
          onAdded={(updatedRoom) => { onUpdate(updatedRoom); setShowAddMember(false); }}
        />
      )}
    </div>
  );
};

// ── Admin page ────────────────────────────────────────────────────────────────
const AdminPage = () => {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      try {
        const { data } = await roomService.adminListRooms({ search });
        setRooms(data.rooms);
      } catch {
        setError('Failed to load rooms.');
      } finally { setLoading(false); }
    };
    const t = setTimeout(fetchRooms, 200);
    return () => clearTimeout(t);
  }, [search]);

  const handleRoomCreated = (room) => {
    setRooms((p) => [room, ...p]);
    setSelectedRoom(room);
  };

  const handleRoomUpdate = (updatedRoom) => {
    setRooms((p) => p.map((r) => r._id === updatedRoom._id ? updatedRoom : r));
    setSelectedRoom(updatedRoom);
  };

  return (
    <AppLayout>
      <div className={styles.page}>
        {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}

        <div className={styles.adminLayout}>
          {/* Room list sidebar */}
          <div className={styles.roomListCol}>
            <div className={styles.roomListHeader}>
              <h1 className={styles.pageTitle}>Admin</h1>
              <Button size="sm" onClick={() => setShowCreate(true)}>+ New room</Button>
            </div>

            <Input
              placeholder="Search rooms…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />

            {loading ? (
              <div className={styles.centered}><Spinner /></div>
            ) : rooms.length === 0 ? (
              <EmptyState icon="🏠" title="No rooms" description="Create your first room." />
            ) : (
              <div className={styles.roomList}>
                {rooms.map((room) => {
                  const done = room.members?.filter((m) => m.isCompleted).length || 0;
                  const total = room.members?.length || 0;
                  const isSelected = selectedRoom?._id === room._id;
                  return (
                    <button
                      key={room._id}
                      className={[styles.roomListItem, isSelected ? styles.roomListItemActive : ''].join(' ')}
                      onClick={() => setSelectedRoom(room)}
                    >
                      <div className={styles.roomListItemHeader}>
                        <span className={styles.roomListItemName}>{room.name}</span>
                        <code className={styles.roomListItemCode}>{room.code}</code>
                      </div>
                      <div className={styles.roomListItemMeta}>
                        <span>{total} member{total !== 1 ? 's' : ''}</span>
                        <Badge variant={done === total && total > 0 ? 'success' : 'default'} size="sm">
                          {done}/{total}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div className={styles.detailCol}>
            {selectedRoom ? (
              <RoomPanel
                key={selectedRoom._id}
                room={selectedRoom}
                onUpdate={handleRoomUpdate}
              />
            ) : (
              <div className={styles.noneSelected}>
                <EmptyState icon="👈" title="Select a room"
                  description="Choose a room from the list to manage it." />
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreated={handleRoomCreated}
        />
      )}
    </AppLayout>
  );
};

export default AdminPage;
