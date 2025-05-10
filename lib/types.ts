export enum ParticipantStatus {
    NEEDS_ACTION = 'NEEDS-ACTION',
    ACCEPTED = 'ACCEPTED',
    DECLINED = 'DECLINED',
    TENTATIVE = 'TENTATIVE'
}

export enum ParticipantRole {
    REQ_PARTICIPANT = 'REQ-PARTICIPANT',
    OPT_PARTICIPANT = 'OPT-PARTICIPANT',
    CHAIR = 'CHAIR'
}

export interface CalendarEvent {
    id: string | number
    title: string
    date: string
    time: string
    duration: number
    description: string
    recurrenceType?: 'daily' | 'weekly' | 'weekdays' | 'monthly'
    recurrenceEndDate?: string
    source: 'outlook' | 'caldav' | 'external' | 'task'
    location?: string
    isAllDay?: boolean
    isGenerated?: boolean
    priority?: string
    participants: {
        id: string
        name: string
        email: string
        avatar?: string
        status?: ParticipantStatus
        role?: ParticipantRole
        isOrganizer?: boolean
    }[]
}

export interface Task {
    id: string | number
    title: string
    description?: string
    priority: "high" | "medium" | "low"
    completed: boolean
    date: string
}

export interface CalendarIntegrationSettings {
    protocol: 'ews' | 'caldav'
    autoSync: boolean
    syncInterval: number
    ews?: {
        email: string
        password: string
        serverUrl?: string
    }
    caldav?: {
        serverUrl: string
        username: string
        password: string
        calendarId: string
    }
} 