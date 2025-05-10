import { CalendarEvent } from "./types"

export const notificationUtils = {
    requestPermission: async () => {
        if (!("Notification" in window)) {
            console.log("This browser does not support desktop notifications")
            return false
        }

        const permission = await Notification.requestPermission()
        return permission === "granted"
    },

    sendNotification: (title: string, options?: NotificationOptions) => {
        if (Notification.permission === "granted") {
            new Notification(title, options)
        }
    },

    checkEventNotifications: (events: CalendarEvent[]) => {
        const now = new Date()

        events.forEach(event => {
            const eventDate = new Date(event.date)
            const [hours, minutes] = event.time.split(":").map(Number)
            eventDate.setHours(hours, minutes, 0, 0)

            // Проверяем, наступило ли событие
            if (Math.abs(eventDate.getTime() - now.getTime()) < 60000) { // В пределах минуты
                notificationUtils.sendNotification(
                    "Событие началось",
                    {
                        body: `${event.title} началось прямо сейчас`,
                        icon: "/icon.png"
                    }
                )
            }

            // Проверяем, будет ли событие через 15 минут
            const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60000)
            if (Math.abs(eventDate.getTime() - fifteenMinutesFromNow.getTime()) < 60000) {
                notificationUtils.sendNotification(
                    "Событие через 15 минут",
                    {
                        body: `${event.title} начнется через 15 минут`,
                        icon: "/icon.png"
                    }
                )
            }
        })
    }
} 