import { createNotification } from '../modules/notifications/notifications.service.js';
import { NotificationType } from '../generated/prisma/enums.js';
import { logger } from '../utils/logger.js';

export async function sendNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, any>,
) {
    try {
        await createNotification(userId, type, title, message, metadata ?? {});
    } catch (error) {
        logger.error({ userId, type, error }, '[sendNotification] Failed to create notification');
    }
}
