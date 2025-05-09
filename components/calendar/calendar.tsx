"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui"
import { useToast } from "@/hooks/use-toast"
import { CalendarEvent } from "@/lib/types"

interface CalendarProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  onSelectEvent: (event: CalendarEvent) => void
  onEventDropped: (event: CalendarEvent, date: Date) => void
  draggedEvent: CalendarEvent | null
  events: CalendarEvent[]
}

// Константы
const WEEKDAYS = ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"]
const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
]

// Утилиты для работы с датами
const dateUtils = {
  getWeekStart: (date: Date): Date => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  },

  getWeekDays: (startDate: Date): Date[] => {
    const days = []
    const currentDate = new Date(startDate)
    for (let i = 0; i < 7; i++) {
      days.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    return days
  },

  isSameDate: (date1: Date, date2: Date): boolean => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    )
  },

  formatMonthYear: (date: Date): string => {
    const endDate = new Date(date)
    endDate.setDate(endDate.getDate() + 6)

    if (date.getMonth() === endDate.getMonth()) {
      return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`
    }
    return `${MONTH_NAMES[date.getMonth()]} - ${MONTH_NAMES[endDate.getMonth()]} ${date.getFullYear()}`
  }
}

export function Calendar({
  selectedDate,
  onSelectDate,
  onSelectEvent,
  onEventDropped,
  draggedEvent,
  events,
}: CalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(dateUtils.getWeekStart(new Date()))
  const [dragOverDay, setDragOverDay] = useState<Date | null>(null)
  const { toast } = useToast()

  // Получаем события на указанную дату
  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date)
      return dateUtils.isSameDate(eventDate, date)
    })
  }

  // Проверяем наличие событий на дату
  const hasEventsOnDate = (date: Date) => {
    return getEventsForDate(date).length > 0
  }

  // Обработчики навигации
  const handlePrevWeek = () => {
    const newStart = new Date(currentWeekStart)
    newStart.setDate(newStart.getDate() - 7)
    setCurrentWeekStart(newStart)
  }

  const handleNextWeek = () => {
    const newStart = new Date(currentWeekStart)
    newStart.setDate(newStart.getDate() + 7)
    setCurrentWeekStart(newStart)
  }

  // Обработчики drag & drop
  const handleDragOver = (day: Date, e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverDay(day)
  }

  const handleDrop = (day: Date, e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedEvent) return
    onEventDropped(draggedEvent, day)
    setDragOverDay(null)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverDay(null)
  }

  // Получаем дни текущей недели
  const weekDays = dateUtils.getWeekDays(currentWeekStart)

  // Синхронизация с выбранной датой
  useEffect(() => {
    const weekStart = dateUtils.getWeekStart(selectedDate)
    if (!dateUtils.isSameDate(weekStart, currentWeekStart)) {
      setCurrentWeekStart(weekStart)
    }
  }, [selectedDate])

  return (
    <div className="w-full md:w-1/3 border-r border-primary/30 flex flex-col">
      <div className="flex items-center justify-between h-24 px-6 border-b border-primary/30">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevWeek}
          className="rounded-full hover:bg-primary/10 transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
          <span className="sr-only">Предыдущая неделя</span>
        </Button>

        <span className="text-xl font-medium text-center">
          {dateUtils.formatMonthYear(currentWeekStart)}
        </span>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextWeek}
          className="rounded-full hover:bg-primary/10 transition-colors"
        >
          <ChevronRight className="h-6 w-6" />
          <span className="sr-only">Следующая неделя</span>
        </Button>
      </div>

      <div className="flex-1 flex flex-col h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar">
        {weekDays.map((day, index) => {
          const isDragTarget = dragOverDay && dateUtils.isSameDate(dragOverDay, day)
          const isSelected = dateUtils.isSameDate(day, selectedDate)
          const isToday = dateUtils.isSameDate(day, new Date())

          return (
            <div
              key={index}
              className={cn(
                "w-full flex flex-col items-center py-3 border-b border-primary/10 relative",
                isSelected && "bg-primary/10",
                isToday && !isSelected && "bg-primary/5",
                isDragTarget && "bg-primary/20 border-primary",
                draggedEvent && "cursor-copy",
              )}
              onClick={() => onSelectDate(day)}
              onDragOver={(e) => handleDragOver(day, e)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(day, e)}
            >
              <div className="flex flex-col items-center mb-2">
                <span className="text-sm font-medium">{WEEKDAYS[day.getDay()]}</span>
                <span className={cn("text-2xl font-light mt-1", isToday && "text-primary")}>
                  {day.getDate()}
                </span>
              </div>

              {hasEventsOnDate(day) && (
                <div className="w-full px-3 mt-1">
                  {getEventsForDate(day)
                    .slice(0, 2)
                    .map((event, eventIndex) => (
                      <div
                        key={eventIndex}
                        className="text-xs bg-primary/10 rounded px-2 py-1 mb-0.5 truncate text-left"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectEvent(event)
                        }}
                      >
                        {event.time} {event.title}
                      </div>
                    ))}
                  {getEventsForDate(day).length > 2 && (
                    <div className="text-xs text-foreground/70 text-center">
                      +{getEventsForDate(day).length - 2} ещё
                    </div>
                  )}
                </div>
              )}

              {isDragTarget && (
                <div className="absolute inset-0 border-2 border-primary rounded-md pointer-events-none" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
