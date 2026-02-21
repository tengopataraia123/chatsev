import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export const usePushNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    setIsSupported('Notification' in window);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: 'ნოტიფიკაციები არ არის მხარდაჭერილი',
        description: 'თქვენი ბრაუზერი არ უჭერს მხარს Push ნოტიფიკაციებს',
        variant: 'destructive'
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast({
          title: 'ნოტიფიკაციები ჩართულია!',
          description: 'თქვენ მიიღებთ შეტყობინებებს ახალი მესიჯებისა და ლაიქების შესახებ'
        });
        return true;
      } else {
        toast({
          title: 'ნოტიფიკაციები გამორთულია',
          description: 'შეგიძლიათ ჩართოთ ბრაუზერის პარამეტრებში',
          variant: 'destructive'
        });
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported, toast]);

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') return;

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }, [isSupported, permission]);

  // Notify about new message - clean GIF markers from notification text
  const notifyNewMessage = useCallback((senderName: string, message: string) => {
    // Remove GIF markers like [GIF:url] from notification text
    const cleanMessage = message.replace(/\[GIF:https?:\/\/[^\]]+\]/g, '🎬').trim();
    const displayMessage = cleanMessage || '🎬 GIF';
    
    sendNotification(`${senderName}`, {
      body: displayMessage.substring(0, 100),
      tag: 'new-message'
    });
  }, [sendNotification]);

  // Notify about new like
  const notifyNewLike = useCallback((username: string) => {
    sendNotification('ახალი ლაიქი ❤️', {
      body: `${username}-მ მოიწონა თქვენი პოსტი`,
      tag: 'new-like'
    });
  }, [sendNotification]);

  // Notify about new comment
  const notifyNewComment = useCallback((username: string, comment: string) => {
    sendNotification('ახალი კომენტარი 💬', {
      body: `${username}: ${comment.substring(0, 80)}`,
      tag: 'new-comment'
    });
  }, [sendNotification]);

  // Notify about friend request
  const notifyFriendRequest = useCallback((username: string) => {
    sendNotification('მეგობრობის მოთხოვნა 👥', {
      body: `${username} გთხოვთ მეგობრობას`,
      tag: 'friend-request'
    });
  }, [sendNotification]);

  return {
    permission,
    isSupported,
    requestPermission,
    sendNotification,
    notifyNewMessage,
    notifyNewLike,
    notifyNewComment,
    notifyFriendRequest
  };
};
