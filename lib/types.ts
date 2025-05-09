export interface CalendarEvent {
    id: string | number
    title: string
    date: string
    time: string
    duration: number
    description: string
    recurrenceType?: 'daily' | 'weekly' | 'weekdays' | 'monthly'
    recurrenceEndDate?: string
    source?: 'outlook' | 'caldav' | 'external'
    location?: string
    isAllDay?: boolean
    isGenerated?: boolean
    fromTask?: boolean
    priority?: string
} 