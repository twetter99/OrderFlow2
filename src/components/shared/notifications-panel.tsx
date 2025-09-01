
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, AlertCircle, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { getNotifications } from '@/lib/data';
import type { Notification } from '@/lib/types';

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // En una aplicación real, esto provendría de una API o un WebSocket.
    // Aquí lo simulamos cargándolo en el cliente.
    setNotifications(getNotifications());
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full flex items-center justify-center p-0"
            >
              {unreadCount}
            </Badge>
          )}
          <span className="sr-only">Alternar notificaciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length > 0 ? (
          notifications.map(notification => (
            <DropdownMenuItem key={notification.id} asChild>
              <Link href={notification.link} className="flex items-start gap-3 cursor-pointer">
                <div className="flex-shrink-0 pt-1">
                    {notification.type === 'alert' ? (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : (
                        <Archive className="h-4 w-4 text-yellow-500" />
                    )}
                </div>
                <div className="flex-grow">
                  <p className="font-semibold text-sm">{notification.title}</p>
                  <p className="text-xs text-muted-foreground">{notification.description}</p>
                </div>
              </Link>
            </DropdownMenuItem>
          ))
        ) : (
          <p className="p-4 text-center text-sm text-muted-foreground">No hay notificaciones nuevas.</p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
