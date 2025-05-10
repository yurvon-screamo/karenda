import { CalendarEvent } from "./types"

export class CalendarRepository {
    private static instance: CalendarRepository
    private readonly MANUAL_EVENTS_KEY = "manualCalendarEvents"
    private readonly SYNCED_EVENTS_KEY = "syncedCalendarEvents"

    private constructor() { }

    public static getInstance(): CalendarRepository {
        if (!CalendarRepository.instance) {
            CalendarRepository.instance = new CalendarRepository()
        }
        return CalendarRepository.instance
    }

    // Получение всех событий
    public async getEvents(): Promise<CalendarEvent[]> {
        try {
            const manualEvents = JSON.parse(localStorage.getItem(this.MANUAL_EVENTS_KEY) || '[]')
            const syncedEvents = JSON.parse(localStorage.getItem(this.SYNCED_EVENTS_KEY) || '[]')
            return [...manualEvents, ...syncedEvents]
        } catch (error) {
            console.error("Ошибка при получении событий:", error)
            throw error
        }
    }

    // Сохранение событий
    public async saveEvents(events: CalendarEvent[]): Promise<void> {
        try {
            const manualEvents = events.filter(event => !event.source)
            const syncedEvents = events.filter(event => event.source === 'outlook' || event.source === 'caldav')

            localStorage.setItem(this.MANUAL_EVENTS_KEY, JSON.stringify(manualEvents))
            localStorage.setItem(this.SYNCED_EVENTS_KEY, JSON.stringify(syncedEvents))
        } catch (error) {
            console.error("Ошибка при сохранении событий:", error)
            throw error
        }
    }

    // Синхронизация событий
    public async syncEvents(syncedEvents: CalendarEvent[]): Promise<CalendarEvent[]> {
        try {
            const manualEvents = JSON.parse(localStorage.getItem(this.MANUAL_EVENTS_KEY) || '[]')
            localStorage.setItem(this.SYNCED_EVENTS_KEY, JSON.stringify(syncedEvents))
            return [...manualEvents, ...syncedEvents]
        } catch (error) {
            console.error("Ошибка при синхронизации событий:", error)
            throw error
        }
    }
} 