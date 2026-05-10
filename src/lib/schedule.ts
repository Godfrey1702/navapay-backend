export function calculateNextRun(
  frequency: string,
  scheduledTime: string,
  scheduledDay?: number
): Date {
  const now = new Date();
  const [hours, minutes] = scheduledTime.split(":").map(Number);
  const next = new Date();
  next.setHours(hours, minutes, 0, 0);

  if (frequency === "daily") {
    if (next <= now) next.setDate(next.getDate() + 1);
  } else if (frequency === "weekly") {
    const day = scheduledDay ?? 1;
    const diff = (day - now.getDay() + 7) % 7 || 7;
    next.setDate(now.getDate() + diff);
    next.setHours(hours, minutes, 0, 0);
  } else if (frequency === "monthly") {
    const day = scheduledDay ?? 1;
    next.setDate(day);
    next.setHours(hours, minutes, 0, 0);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
      next.setDate(day);
    }
  }

  return next;
}
