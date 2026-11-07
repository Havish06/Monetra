import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

const CHANNEL_ID = "payday-reminders";
const REMINDER_TAG = "monetra-payday-reminder";
const MONTHS_TO_SCHEDULE = 12;
// Explicitly show local reminders even when Monetra is currently open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function prepareNotificationChannel() {
  if (Platform.OS !== "android") return;

  // Android 13+ requires a notification channel before its permission prompt
  // can be displayed.
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Payday reminders",
    description: "Monthly reminders to review your salary and savings plan.",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 200, 250],
    lightColor: "#C5F277",
  });
}

export async function syncPaydayReminders(
  userId: string,
  paydayDay: number,
  requestPermission = false,
): Promise<boolean> {
  if (!userId || !Number.isInteger(paydayDay) || paydayDay < 1 || paydayDay > 31) {
    return false;
  }

  await prepareNotificationChannel();

  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && requestPermission) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!permission.granted) return false;

  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const previous = existing.filter(notification =>
    notification.content.data?.tag === REMINDER_TAG &&
    notification.content.data?.userId === userId
  );

  await Promise.all(
    previous.map(notification =>
      Notifications.cancelScheduledNotificationAsync(notification.identifier)
    )
  );

  const now = new Date();
  const schedules: Date[] = [];

  for (let offset = 0; offset < MONTHS_TO_SCHEDULE; offset += 1) {
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const year = firstOfMonth.getFullYear();
    const month = firstOfMonth.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const day = Math.min(paydayDay, lastDay);
    const reminderDate = new Date(year, month, day, 9, 0, 0, 0);

    if (reminderDate.getTime() > now.getTime()) {
      schedules.push(reminderDate);
    }
  }

  await Promise.all(
    schedules.map(date =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: "It's payday — plan before you spend 💚",
          body: "Set aside your savings first, review upcoming bills, and plan the month with Monetra.",
          data: { tag: REMINDER_TAG, userId, screen: "/planner" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
          ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
        },
      })
    )
  );

  return true;
}
