import { CalendarEvent } from "@/lib/types"
import { eventUtils } from "./utils"
import { cn } from "@/lib/utils"

interface EventCardProps {
    event: CalendarEvent
    onClick: () => void
    className?: string
}

export function EventCard({ event, onClick, className }: EventCardProps) {
    const { title, time, duration, description, recurrenceType } = event

    return (
        <div
            onClick={onClick}
            className={cn(
                "p-2 rounded-lg cursor-pointer transition-colors hover:bg-primary/20",
                "border border-primary/20 bg-primary/10",
                "text-sm text-white/90",
                className
            )}
        >
            <div className="font-medium truncate">{title}</div>
            <div className="text-xs text-white/60 space-y-0.5">
                <div>{eventUtils.formatTimeWithAmPm(time)}</div>
                <div>{eventUtils.formatDuration(duration)}</div>
                {recurrenceType && (
                    <div className="flex items-center gap-1">
                        <span className="text-[10px]">🔄</span>
                        <span>{eventUtils.formatRecurrenceType(recurrenceType)}</span>
                    </div>
                )}
            </div>
            {description && (
                <div className="mt-1 text-xs text-white/50 line-clamp-2">{description}</div>
            )}
        </div>
    )
} 