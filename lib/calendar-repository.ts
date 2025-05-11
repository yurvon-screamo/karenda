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
            console.log('Получены события для синхронизации:', syncedEvents)

            if (!Array.isArray(syncedEvents)) {
                console.error('syncEvents: получен не массив событий', syncedEvents)
                throw new Error('Неверный формат данных')
            }

            // Проверяем формат каждого события
            const validEvents = syncedEvents.filter(event => {
                if (!event || typeof event !== 'object') {
                    console.warn('syncEvents: пропущено неверное событие', event)
                    return false
                }

                if (!event.id || !event.title || !event.date || !event.time) {
                    console.warn('syncEvents: пропущено событие с отсутствующими полями', event)
                    return false
                }

                // Проверяем формат даты
                const date = new Date(event.date)
                if (isNaN(date.getTime())) {
                    console.warn('syncEvents: пропущено событие с неверной датой', event)
                    return false
                }

                // Проверяем формат времени
                const timeParts = event.time.split(':')
                if (timeParts.length !== 2) {
                    console.warn('syncEvents: пропущено событие с неверным форматом времени', event)
                    return false
                }

                const [hours, minutes] = timeParts.map(Number)
                if (isNaN(hours) || isNaN(minutes)) {
                    console.warn('syncEvents: пропущено событие с неверными значениями времени', event)
                    return false
                }

                return true
            })

            console.log('Валидные события для синхронизации:', validEvents)

            const manualEvents = await this.getManualEvents()
            const uniqueSyncedEvents = this.removeDuplicates(validEvents)

            await this.saveSyncedEvents(uniqueSyncedEvents)

            const result = this.removeDuplicates([...manualEvents, ...uniqueSyncedEvents])
            console.log('Итоговый список событий после синхронизации:', result)
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
        if (typeof window === 'undefined') return []
        const events = localStorage.getItem(this.MANUAL_EVENTS_KEY)
        return events ? JSON.parse(events) : []
    }

    private async getSyncedEvents(): Promise<CalendarEvent[]> {
        if (typeof window === 'undefined') return []
        const events = localStorage.getItem(this.SYNCED_EVENTS_KEY)
        return events ? JSON.parse(events) : []
    }

    private async saveManualEvents(events: CalendarEvent[]): Promise<void> {
        if (typeof window === 'undefined') return
        localStorage.setItem(this.MANUAL_EVENTS_KEY, JSON.stringify(events))
    }

    private async saveSyncedEvents(events: CalendarEvent[]): Promise<void> {
        if (typeof window === 'undefined') return
        localStorage.setItem(this.SYNCED_EVENTS_KEY, JSON.stringify(events))
    }
} 