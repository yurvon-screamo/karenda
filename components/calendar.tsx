"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
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

export function Calendar({
  selectedDate,
  onSelectDate,
  onSelectEvent,
  onEventDropped,
  draggedEvent,
  events,
}: CalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()))
  const [dragOverDay, setDragOverDay] = useState<Date | null>(null)
  const { toast } = useToast()

  // Получаем начало недели (понедельник)
  function getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Корректировка для недели, начинающейся с понедельника
    return new Date(d.setDate(diff))
  }

  // Получаем массив дней текущей недели
  function getWeekDays(startDate: Date): Date[] {
    const days = []
    const currentDate = new Date(startDate)

    for (let i = 0; i < 7; i++) {
      days.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return days
  }

  // Проверяем, есть ли события на указанную дату
  const hasEventsOnDate = (date: Date) => {
    return events.some((event) => {
      const eventDate = new Date(event.date)
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      )
    })
  }

  // Получаем события на указанную дату
  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.date)
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      )
    })
  }

  // Переход к предыдущей неделе
  const prevWeek = () => {
    const newStart = new Date(currentWeekStart)
    newStart.setDate(newStart.getDate() - 7)
    setCurrentWeekStart(newStart)
  }

  // Переход к следующей неделе
  const nextWeek = () => {
    const newStart = new Date(currentWeekStart)
    newStart.setDate(newStart.getDate() + 7)
    setCurrentWeekStart(newStart)
  }

  // Проверяем, является ли дата выбранной
  const isSelectedDate = (date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    )
  }

  // Проверяем, является ли дата сегодняшней
  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  // Форматирование месяца и года для заголовка
  const formatMonthYear = (date: Date) => {
    const monthNames = [
      "Январь",
      "Февраль",
      "Март",
      "Апрель",
      "Май",
      "Июнь",
      "Июль",
      "Август",
      "Сентябрь",
      "Октябрь",
      "Ноябрь",
      "Декабрь",
    ]

    const endDate = new Date(date)
    endDate.setDate(endDate.getDate() + 6)

    // Если неделя в пределах одного месяца
    if (date.getMonth() === endDate.getMonth()) {
      return `${monthNames[date.getMonth()]} ${date.getFullYear()}`
    }

    // Если неделя на стыке месяцев
    return `${monthNames[date.getMonth()]} - ${monthNames[endDate.getMonth()]} ${date.getFullYear()}`
  }

  // Форматирование дня недели
  const formatWeekday = (date: Date) => {
    const weekdays = ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"]
    return weekdays[date.getDay()]
  }

  // Обработчик перетаскивания над днем
  const handleDragOver = (day: Date, e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverDay(day)
  }

  // Обработчик сброса события на день
  const handleDrop = (day: Date, e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Если нет перетаскиваемого события, отменяем
    if (!draggedEvent) return

    // Вызываем функцию обработки перетаскивания события
    onEventDropped(draggedEvent, day)

    // Сбрасываем состояние перетаскивания
    setDragOverDay(null)
  }

  // Обработчик выхода перетаскивания за пределы дня
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverDay(null)
  }

  // Получаем дни текущей недели
  const weekDays = getWeekDays(currentWeekStart)

  // Устанавливаем выбранную дату при первой загрузке
  useEffect(() => {
    // Если выбранная дата не в текущей неделе, обновляем неделю
    const weekStart = getWeekStart(selectedDate)
    if (
      weekStart.getDate() !== currentWeekStart.getDate() ||
      weekStart.getMonth() !== currentWeekStart.getMonth() ||
      weekStart.getFullYear() !== currentWeekStart.getFullYear()
    ) {
      setCurrentWeekStart(weekStart)
    }
  }, [selectedDate])

  return (
    <div className="w-full md:w-1/3 border-r border-primary/30 flex flex-col">
      <div className="flex items-center justify-between h-24 px-6 border-b border-primary/30">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevWeek}
          className="rounded-full hover:bg-primary/10 transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
          <span className="sr-only">Предыдущая неделя</span>
        </Button>

        <span className="text-xl font-medium text-center">{formatMonthYear(currentWeekStart)}</span>

        <Button
          variant="ghost"
          size="icon"
          onClick={nextWeek}
          className="rounded-full hover:bg-primary/10 transition-colors"
        >
          <ChevronRight className="h-6 w-6" />
          <span className="sr-only">Следующая неделя</span>
        </Button>
      </div>

      <div className="flex-1 flex flex-col h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar">
        {weekDays.map((day, index) => {
          const isDragTarget =
            dragOverDay &&
            dragOverDay.getDate() === day.getDate() &&
            dragOverDay.getMonth() === day.getMonth() &&
            dragOverDay.getFullYear() === day.getFullYear()

          return (
            <div
              key={index}
              className={cn(
                "w-full flex flex-col items-center py-3 border-b border-primary/10 relative",
                isSelectedDate(day) && "bg-primary/10",
                isToday(day) && !isSelectedDate(day) && "bg-primary/5",
                isDragTarget && "bg-primary/20 border-primary",
                draggedEvent && "cursor-copy",
              )}
              onClick={() => onSelectDate(day)}
              onDragOver={(e) => handleDragOver(day, e)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(day, e)}
            >
              <div className="flex flex-col items-center mb-2">
                <span className="text-sm font-medium">{formatWeekday(day)}</span>
                <span className={cn("text-2xl font-light mt-1", isToday(day) && "text-primary")}>{day.getDate()}</span>
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
                <div className="absolute inset-0 border-2 border-primary rounded-md pointer-events-none"></div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
