import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { client, databases, COLLECTIONS, DATABASE_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { Notification } from '@/types/payload-types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user?.$id) return;
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.NOTIFICATIONS,
        [
          Query.equal('user_id', user.$id),
          Query.orderDesc('$createdAt'),
          Query.limit(50),
        ]
      );
      const docs = response.documents as unknown as Notification[];
      setNotifications(docs);
      setUnreadCount(docs.filter((n) => !n.read).length);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user?.$id]);

  // Real-time subscription
  useEffect(() => {
    if (!user?.$id) return;

    const channel = `databases.${DATABASE_ID}.collections.${COLLECTIONS.NOTIFICATIONS}.documents`;
    const unsubscribe = client.subscribe(channel, (response) => {
      const doc = response.payload as Notification;
      if (doc.user_id !== user.$id) return;

      if (response.events.some(ev => ev.includes('.create'))) {
        setNotifications((prev) => [doc, ...prev]);
        setUnreadCount((count) => count + 1);
        toast.info(`Notification: ${doc.title}`, {
          description: doc.content,
        });
      } else if (response.events.some(ev => ev.includes('.update'))) {
        setNotifications((prev) =>
          prev.map((n) => (n.$id === doc.$id ? doc : n))
        );
        setNotifications((prev) => {
          setUnreadCount(prev.filter((n) => !n.read).length);
          return prev;
        });
      } else if (response.events.some(ev => ev.includes('.delete'))) {
        setNotifications((prev) => prev.filter((n) => n.$id !== doc.$id));
        setNotifications((prev) => {
          setUnreadCount(prev.filter((n) => !n.read).length);
          return prev;
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user?.$id]);

  const markAsRead = async (id: string) => {
    try {
      const updated = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.NOTIFICATIONS,
        id,
        { read: true }
      );
      setNotifications((prev) =>
        prev.map((n) => (n.$id === id ? (updated as unknown as Notification) : n))
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;

    try {
      await Promise.all(
        unread.map((n) =>
          databases.updateDocument(DATABASE_ID, COLLECTIONS.NOTIFICATIONS, n.$id, {
            read: true,
          })
        )
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.read) {
      await markAsRead(n.$id);
    }
    setIsOpen(false);
    if (n.link) {
      if (n.link.startsWith('http://') || n.link.startsWith('https://')) {
        window.location.href = n.link;
      } else {
        window.location.href = `${window.location.origin}${n.link}`;
      }
    }
  };

  // Helper to format creation dates simply
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Helper to format markdown-style double asterisks bold text
  const formatContent = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-white hover:bg-white/10 rounded-full"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-primary">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="end" modal={true}>
        <div className="flex items-center justify-between border-b border-border p-3">
          <h2 className="font-semibold text-sm">Notifications</h2>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>
        <ScrollArea className="h-[450px] sm:h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div
                  key={n.$id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3 text-left transition-colors cursor-pointer hover:bg-muted/50 flex gap-2 items-start ${
                    n.read ? 'opacity-60 bg-transparent' : 'bg-blue-50/20 dark:bg-blue-950/10 font-semibold'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatContent(n.content)}</p>
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      {formatDate(n.$createdAt)}
                    </span>
                  </div>
                  {!n.read && (
                    <span className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
