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
        if (!Array.isArray(events)) {
            console.warn("checkEventNotifications: events is not an array")
            return
        }

        const now = new Date()

        events.forEach(event => {
            if (!event || typeof event !== 'object') {
                console.warn("checkEventNotifications: skipping invalid event object", event)
                return
            }

            if (!event.date || !event.time || !event.title) {
                console.warn("checkEventNotifications: missing required fields", event)
                return
            }

            try {
                const eventDate = new Date(event.date)
                if (isNaN(eventDate.getTime())) {
                    console.warn("checkEventNotifications: invalid date format", event.date)
                    return
                }

                if (typeof event.time !== 'string') {
                    console.warn("checkEventNotifications: time is not a string", event.time)
                    return
                }

                const timeParts = event.time.split(":")
                if (timeParts.length !== 2) {
                    console.warn("checkEventNotifications: invalid time format", event.time)
                    return
                }

                const [hours, minutes] = timeParts.map(Number)

                if (isNaN(hours) || isNaN(minutes)) {
                    console.warn("checkEventNotifications: invalid time values", event.time)
                    return
                }

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
            } catch (error) {
                console.error("checkEventNotifications: error processing event", error, event)
            }
        })
    }
} 