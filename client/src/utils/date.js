import { formatDistanceToNow, format } from 'date-fns';

export const timeAgo = (date) => {
  if (!date) return '—';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const formatDateTime = (date) => {
  if (!date) return '—';
  return format(new Date(date), 'MMM d, yyyy · h:mm a');
};

export const formatTime = (date) => {
  if (!date) return '—';
  return format(new Date(date), 'h:mm a');
};

export const activityLabel = (type, username) => {
  switch (type) {
    case 'task_completed': return `${username} completed the task`;
    case 'task_reopened':  return `${username} reopened the task`;
    case 'member_joined':  return `${username} joined the room`;
    case 'member_left':    return `${username} left the room`;
    case 'room_created':   return `Room was created`;
    default:               return `${username} performed an action`;
  }
};
