import { eventUtils } from "./utils"
import { SLOT_HEIGHT } from "./constants"

interface TimeSlotsProps {
    startHour?: number
    endHour?: number
}

export function TimeSlots({ startHour = 0, endHour = 24 }: TimeSlotsProps) {
    const hours = Array.from(
        { length: endHour - startHour },
        (_, i) => i + startHour
    )

    return (
        <div className="relative">
            {hours.map((hour) => (
                <div
                    key={hour}
                    className="flex items-start"
                    style={{ height: `${60 * SLOT_HEIGHT}px` }}
                >
                    <div className="w-16 flex justify-end pr-2">
                        <span className="text-xs text-white/40">
                            {eventUtils.formatHour(hour)}
                        </span>
                    </div>
                    <div className="flex-1 border-t border-primary/10" />
                </div>
            ))}
        </div>
    )
} 