import { throws } from "assert"
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
            const manualEvents = await this.getManualEvents()
            const syncedEvents = await this.getSyncedEvents()

            // Объединяем события и удаляем дубликаты
            const allEvents = [...manualEvents, ...syncedEvents]
            const uniqueEvents = this.removeDuplicates(allEvents)

            return uniqueEvents
        } catch (error) {
            console.error('Ошибка при получении событий:', error)
            throw error
        }
    }

    // Сохранение событий
    public async saveEvents(events: CalendarEvent[]): Promise<void> {
        try {
            // Удаляем дубликаты перед сохранением
            const uniqueEvents = this.removeDuplicates(events)

            // Разделяем события на ручные и синхронизированные
            const manualEvents = uniqueEvents.filter(event => !event.source || event.source === 'default')
            const syncedEvents = uniqueEvents.filter(event => event.source === 'outlook' || event.source === 'caldav')

            await this.saveManualEvents(manualEvents)
            await this.saveSyncedEvents(syncedEvents)
        } catch (error) {
            console.error('Ошибка при сохранении событий:', error)
            throw error
        }
    }

    // Синхронизация событий
    public async syncEvents(syncedEvents: CalendarEvent[]): Promise<CalendarEvent[]> {
        try {
            const manualEvents = JSON.parse(localStorage.getItem(this.MANUAL_EVENTS_KEY) || '[]')
            const uniqueSyncedEvents = this.removeDuplicates(syncedEvents)

            localStorage.setItem(this.SYNCED_EVENTS_KEY, JSON.stringify(uniqueSyncedEvents))

            const result = this.removeDuplicates([...manualEvents, ...uniqueSyncedEvents])
            return result
        } catch (error) {
            console.error("Ошибка при синхронизации событий:", error)
            throw error
        }
    }

    // Вспомогательный метод для удаления дубликатов
    private removeDuplicates(events: CalendarEvent[]): CalendarEvent[] {
        const uniqueEvents = new Map<string, CalendarEvent>()

        events.forEach(event => {
            const eventId = String(event.id)
            if (!uniqueEvents.has(eventId)) {
                uniqueEvents.set(eventId, event)
            }
        })

        return Array.from(uniqueEvents.values())
    }

    private async getManualEvents(): Promise<CalendarEvent[]> {
        const events = localStorage.getItem(this.MANUAL_EVENTS_KEY)
        return events ? JSON.parse(events) : []
    }

    private async getSyncedEvents(): Promise<CalendarEvent[]> {
        const events = localStorage.getItem(this.SYNCED_EVENTS_KEY)
        return events ? JSON.parse(events) : []
    }

    private async saveManualEvents(events: CalendarEvent[]): Promise<void> {
        localStorage.setItem(this.MANUAL_EVENTS_KEY, JSON.stringify(events))
    }

    private async saveSyncedEvents(events: CalendarEvent[]): Promise<void> {
        localStorage.setItem(this.SYNCED_EVENTS_KEY, JSON.stringify(events))
    }
} 