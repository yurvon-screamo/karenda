import { useState, useEffect } from "react"
import { SLOT_HEIGHT } from "./constants"

interface CurrentTimeIndicatorProps {
    selectedDate: Date
}

export function CurrentTimeIndicator({ selectedDate }: CurrentTimeIndicatorProps) {
    const [currentTime, setCurrentTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 60000)
        return () => clearInterval(timer)
    }, [])

    const now = new Date()
    const isToday = now.getDate() === selectedDate.getDate() &&
        now.getMonth() === selectedDate.getMonth() &&
        now.getFullYear() === selectedDate.getFullYear()

    if (!isToday) return null

    const hours = currentTime.getHours()
    const minutes = currentTime.getMinutes()
    const top = (hours * 60 + minutes) * SLOT_HEIGHT

    return (
        <div
            className="absolute left-0 right-0 pointer-events-none z-20"
            style={{ top: `${top}px` }}
        >
            <div className="flex items-center">
                <div className="w-16 flex justify-end pr-2">
                    <div className="bg-red-500 text-white text-xs px-2 py-0.5 rounded">
                        {`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`}
                    </div>
                </div>
                <div className="flex-1 relative">
                    <div className="absolute left-0 right-0 h-0.5 bg-red-500" />
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500" />
                </div>
            </div>
        </div>
    )
} 