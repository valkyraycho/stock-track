/**
 * Thin wrapper over the Notifications API.
 *
 * Browsers: Chrome, Firefox, Safari 16+, Edge. Older Safari: no-op fallback
 * (we never ask for permission, alerts still fire as in-app toasts via
 * the useAlertWatcher hook's fallback path).
 */

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationsPermission(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Request permission if not yet decided. Returns the current state after
 * the request resolves. Only call this in response to a user action —
 * the user activation requirement rejects off-gesture calls in some browsers.
 */
export async function requestNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return "denied";
  }
}

/** Fire a notification if permitted. Returns whether one was shown. */
export function fireNotification(title: string, body: string): boolean {
  if (!notificationsSupported()) return false;
  if (Notification.permission !== "granted") return false;
  try {
    const n = new Notification(title, {
      body,
      tag: "stock-track",
      // Using the app's favicon, if any — browsers pick their default otherwise.
      icon: "/favicon.ico",
    });
    // Auto-close after 8s to avoid OS notification pile-up.
    setTimeout(() => n.close(), 8000);
    return true;
  } catch {
    return false;
  }
}
