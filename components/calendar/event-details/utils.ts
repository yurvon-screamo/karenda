import { CalendarEvent } from "@/lib/types"
import { SLOT_HEIGHT } from "./constants"

export const eventUtils = {
    formatHour: (hour: number): string => {
        return `${hour.toString().padStart(2, "0")}:00`
    },

    formatTimeWithAmPm: (time: string): string => {
        const [hours, minutes] = time.split(":").map(Number)

        if (hours === 0) {
            return `12:${minutes.toString().padStart(2, "0")} AM`
        } else if (hours < 12) {
            return `${hours}:${minutes.toString().padStart(2, "0")} AM`
        } else if (hours === 12) {
            return `12:${minutes.toString().padStart(2, "0")} PM`
        } else {
            return `${hours - 12}:${minutes.toString().padStart(2, "0")} PM`
        }
    },

    formatDuration: (durationMinutes: number): string => {
        const hours = Math.floor(durationMinutes / 60)
        const minutes = durationMinutes % 60

        if (hours === 0) {
            return `${minutes} минут`
        } else if (minutes === 0) {
            return hours === 1 ? `${hours} час` : hours < 5 ? `${hours} часа` : `${hours} часов`
        } else {
            const hoursText = hours === 1 ? `${hours} час` : hours < 5 ? `${hours} часа` : `${hours} часов`
            return `${hoursText} ${minutes} минут`
        }
    },

    formatRecurrenceType: (type: string): string => {
        switch (type) {
            case "daily":
                return "Ежедневно"
            case "weekly":
                return "Еженедельно"
            case "weekdays":
                return "По рабочим дням"
            case "monthly":
                return "Ежемесячно"
            default:
                return "Не повторяется"
        }
    },

    groupEventsByTime: (events: CalendarEvent[]): CalendarEvent[][] => {
        const sortedEvents = [...events].sort((a, b) => {
            const [aHour, aMinute] = a.time.split(":").map(Number)
            const [bHour, bMinute] = b.time.split(":").map(Number)
            return (aHour * 60 + aMinute) - (bHour * 60 + bMinute)
        })

        const groups: CalendarEvent[][] = []
        let currentGroup: CalendarEvent[] = []

        sortedEvents.forEach(event => {
            const [eventHour, eventMinute] = event.time.split(":").map(Number)
            const eventStartMinutes = eventHour * 60 + eventMinute
            const eventEndMinutes = eventStartMinutes + (event.duration || 60)

            const overlapsWithGroup = currentGroup.some(groupEvent => {
                const [groupHour, groupMinute] = groupEvent.time.split(":").map(Number)
                const groupStartMinutes = groupHour * 60 + groupMinute
                const groupEndMinutes = groupStartMinutes + (groupEvent.duration || 60)

                return (
                    (eventStartMinutes >= groupStartMinutes && eventStartMinutes < groupEndMinutes) ||
                    (eventEndMinutes > groupStartMinutes && eventEndMinutes <= groupEndMinutes) ||
                    (eventStartMinutes <= groupStartMinutes && eventEndMinutes >= groupEndMinutes)
                )
            })

            if (overlapsWithGroup) {
                currentGroup.push(event)
            } else {
                if (currentGroup.length > 0) {
                    groups.push(currentGroup)
                }
                currentGroup = [event]
            }
        })

        if (currentGroup.length > 0) {
            groups.push(currentGroup)
        }

        return groups
    },

    getEventPosition: (event: CalendarEvent, group: CalendarEvent[]) => {
        const [eventHour, eventMinute] = event.time.split(":").map(Number)
        const duration = event.duration || 60
        const top = eventHour * 60 * SLOT_HEIGHT + eventMinute * SLOT_HEIGHT
        const height = duration * SLOT_HEIGHT

        const index = group.findIndex(e => e.id === event.id)
        const totalEvents = group.length

        const width = `${100 / totalEvents}%`
        const left = `${(index * 100) / totalEvents}%`

        return { top, height, width, left }
    }
} 