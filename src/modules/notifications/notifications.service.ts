import { prisma } from '../../database/prisma.js';
import { NotificationType } from '../../generated/prisma/enums.js';

export async function createNotification(userId: string, type: NotificationType, title: string, message: string, metadata?: any) {
    return await prisma.notification.create({
        data: {
            userId,
            type,
            title,
            message,
            metadata,
        },
    });
}

export async function getMyNotifications(userId: string) {
    return await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });
}

export async function markAsRead(notificationId: string, userId: string) {
    return await prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { isRead: true },
    });
}
