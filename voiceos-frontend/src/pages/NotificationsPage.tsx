import React, { useEffect, useState } from 'react';
import { notificationsService, Notification } from '../services/notifications';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await notificationsService.list();
      setNotifications(data);
    } catch (error) {
      console.error("Failed to load notifications", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      await fetchNotifications();
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      await fetchNotifications();
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  if (loading) {
    return <div className="pt-xxxl text-center text-on-surface-variant">Loading Notifications...</div>;
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <>
<div className="pt-xxxl px-md md:px-margin max-w-4xl mx-auto pb-xxxl">
<div className="flex justify-between items-center mb-xl">
<div>
<h1 className="font-headline-lg text-headline-lg text-on-surface">Notifications</h1>
<p className="font-body-md text-on-surface-variant">You have {unreadCount} unread messages.</p>
</div>
{unreadCount > 0 && (
  <button className="text-primary font-label-md hover:underline" onClick={handleMarkAllAsRead}>
    Mark all as read
  </button>
)}
</div>

<div className="space-y-md">
{notifications.length === 0 ? (
  <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant text-center text-on-surface-variant">
    You're all caught up!
  </div>
) : (
  notifications.map(notification => (
    <div key={notification.id} className={`bg-surface-container-lowest p-lg rounded-xl border ${!notification.isRead ? 'border-primary shadow-sm' : 'border-outline-variant'} flex gap-md items-start transition-all`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${notification.type === 'system' ? 'bg-secondary-container text-on-secondary-container' : notification.type === 'alert' ? 'bg-error-container text-on-error-container' : 'bg-primary-container text-on-primary-container'}`}>
        <span className="material-symbols-outlined">
          {notification.type === 'system' ? 'settings' : notification.type === 'alert' ? 'warning' : 'notifications'}
        </span>
      </div>
      <div className="flex-grow">
        <div className="flex justify-between items-start mb-xs">
          <h3 className={`font-label-lg text-on-surface ${!notification.isRead ? 'font-bold' : ''}`}>{notification.title}</h3>
          <span className="font-label-sm text-outline whitespace-nowrap">{new Date(notification.createdAt).toLocaleString()}</span>
        </div>
        <p className="font-body-md text-on-surface-variant mb-md">{notification.message}</p>
        
        {!notification.isRead && (
          <button className="font-label-sm text-primary hover:underline" onClick={() => handleMarkAsRead(notification.id)}>
            Mark as read
          </button>
        )}
      </div>
    </div>
  ))
)}
</div>
</div>
    </>
  );
}


