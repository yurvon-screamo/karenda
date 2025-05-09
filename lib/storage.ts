import { CalendarEvent } from "./types"

export interface CalendarStorage {
    // Получение всех событий
    getEvents(): Promise<CalendarEvent[]>

    // Сохранение всех событий
    saveEvents(events: CalendarEvent[]): Promise<void>

    // Добавление нового события
    addEvent(event: CalendarEvent): Promise<void>

    // Обновление существующего события
    updateEvent(event: CalendarEvent): Promise<void>

    // Удаление события
    deleteEvent(eventId: string | number): Promise<void>

    // Очистка всех событий
    clearEvents(): Promise<void>
}

// Реализация хранилища на основе localStorage
export class LocalCalendarStorage implements CalendarStorage {
    private readonly STORAGE_KEY = 'calendar_events'

    async getEvents(): Promise<CalendarEvent[]> {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY)
            return data ? JSON.parse(data) : []
        } catch (error) {
            console.error('Ошибка при получении событий из localStorage:', error)
            return []
        }
    }

    async saveEvents(events: CalendarEvent[]): Promise<void> {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(events))
        } catch (error) {
            console.error('Ошибка при сохранении событий в localStorage:', error)
            throw new Error('Не удалось сохранить события')
        }
    }

    async addEvent(event: CalendarEvent): Promise<void> {
        const events = await this.getEvents()
        events.push(event)
        await this.saveEvents(events)
    }

    async updateEvent(event: CalendarEvent): Promise<void> {
        const events = await this.getEvents()
        const index = events.findIndex(e => e.id === event.id)
        if (index !== -1) {
            events[index] = event
            await this.saveEvents(events)
        }
    }

    async deleteEvent(eventId: string | number): Promise<void> {
        const events = await this.getEvents()
        const filteredEvents = events.filter(e => e.id !== eventId)
        await this.saveEvents(filteredEvents)
    }

    async clearEvents(): Promise<void> {
        localStorage.removeItem(this.STORAGE_KEY)
    }
} 