import { CalendarEvent } from "@/lib/types"
import { TimeSlots } from "./time-slots"
import { EventCard } from "./event-card"
import { CurrentTimeIndicator } from "./current-time-indicator"
import { eventUtils } from "./utils"
import { cn } from "@/lib/utils"

interface CalendarGridProps {
    selectedDate: Date
    events: CalendarEvent[]
    onEventClick: (event: CalendarEvent) => void
    onEventDragStart: (event: CalendarEvent) => void
    onEventDragEnd: () => void
    onEventDrop: (event: CalendarEvent, date: Date) => void
}

export function CalendarGrid({
    selectedDate,
    events,
    onEventClick,
    onEventDragStart,
    onEventDragEnd,
    onEventDrop,
}: CalendarGridProps) {
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const eventId = e.dataTransfer.getData("text/plain")
        const event = events.find((e) => e.id.toString() === eventId)
        if (event) {
            onEventDrop(event, selectedDate)
        }
    }

    const dayEvents = events.filter((event) => {
        const eventDate = new Date(event.date)
        return (
            eventDate.getDate() === selectedDate.getDate() &&
            eventDate.getMonth() === selectedDate.getMonth() &&
            eventDate.getFullYear() === selectedDate.getFullYear()
        )
    })

    const groupedEvents = eventUtils.groupEventsByTime(dayEvents)

    return (
        <div
            className="relative flex-1 overflow-y-auto"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <TimeSlots />
            <CurrentTimeIndicator selectedDate={selectedDate} />

            <div className="absolute inset-0 pointer-events-none">
                {groupedEvents.map((group, groupIndex) =>
                    group.map((event) => {
                        const { top, height, width, left } = eventUtils.getEventPosition(event, group)
                        const now = new Date()
                        const eventDateTime = new Date(event.date)
                        eventDateTime.setHours(
                            parseInt(event.time.split(":")[0]),
                            parseInt(event.time.split(":")[1]),
                            0,
                            0
                        )
                        const isPastEvent = eventDateTime < now

                        return (
                            <div
                                key={event.id}
                                data-event-id={event.id}
                                className={cn(
                                    "absolute text-left px-1.5 py-0.5 rounded transition-all mb-0.5 group shadow-lg",
                                    "bg-primary/10 hover:bg-primary/15",
                                    event.source === "outlook" && "border-l-4 border-blue-500",
                                    event.source === "caldav" && "border-l-4 border-green-500",
                                    event.source === "external" && "border-l-4 border-purple-500",
                                    event.fromTask && "border-l-4 border-green-500",
                                    event.recurrenceType && "border-r-4 border-r-primary/50",
                                    isPastEvent && "opacity-50 grayscale hover:opacity-70",
                                    "cursor-grab active:cursor-grabbing pointer-events-auto"
                                )}
                                style={{
                                    top: `${top}px`,
                                    height: `${height}px`,
                                    width: width,
                                    left: left,
                                    zIndex: 10,
                                }}
                                onClick={() => onEventClick(event)}
                                draggable={true}
                                onDragStart={() => onEventDragStart(event)}
                                onDragEnd={onEventDragEnd}
                            >
                                <EventCard event={event} onClick={() => onEventClick(event)} />
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
} 