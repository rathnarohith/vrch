import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NotificationOptions {
  userId: string | null;
  enabled: boolean;
}

export function useOrderNotifications({ userId, enabled }: NotificationOptions) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast({
        title: 'Notifications not supported',
        description: 'Your browser does not support push notifications.',
        variant: 'destructive',
      });
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result === 'granted') {
      toast({
        title: 'Notifications enabled',
        description: 'You will receive alerts for order status changes.',
      });
    }
    
    return result === 'granted';
  }, [toast]);

  const sendNotification = useCallback((title: string, body: string, icon?: string) => {
    if (permission !== 'granted') return;

    const notification = new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'order-update',
      requireInteraction: true,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }, [permission]);

  const getStatusMessage = (status: string) => {
    const messages: Record<string, { title: string; body: string }> = {
      pending: { title: '📦 Order Placed', body: 'Your order has been placed and is waiting for a rider.' },
      accepted: { title: '🏍️ Rider Assigned', body: 'A rider has accepted your order and is on the way!' },
      picked_up: { title: '📬 Package Picked Up', body: 'Your package has been picked up and is being delivered.' },
      in_transit: { title: '🚀 In Transit', body: 'Your package is on its way to the destination.' },
      delivered: { title: '✅ Delivered', body: 'Your package has been successfully delivered!' },
      cancelled: { title: '❌ Order Cancelled', body: 'Your order has been cancelled.' },
    };
    return messages[status] || { title: 'Order Update', body: `Order status changed to: ${status}` };
  };

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!enabled || !userId || permission !== 'granted') return;

    const channel = supabase
      .channel('order-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${userId}`,
        },
        (payload) => {
          const newStatus = payload.new.order_status;
          const oldStatus = payload.old?.order_status;
          
          if (newStatus !== oldStatus) {
            const { title, body } = getStatusMessage(newStatus);
            sendNotification(title, body);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, enabled, permission, sendNotification]);

  return {
    permission,
    requestPermission,
    sendNotification,
    isSupported: 'Notification' in window,
  };
}
