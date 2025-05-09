import { createDAVClient } from "tsdav"
import type { DAVCalendar, DAVClient, DAVObject } from "tsdav"

// Интерфейс для учетных данных CalDAV
export interface CalDAVCredentialsProps {
  serverUrl: string
  username: string
  password: string
}

// Интерфейс для событий из CalDAV
export interface CalDAVEvent {
  id: string
  title: string
  start: Date
  end: Date
  location?: string
  description?: string
  isAllDay: boolean
}

// Класс для работы с CalDAV
export class CalDAVClient {
  private client: DAVClient | null = null
  private calendars: DAVCalendar[] = []
  private isConnected = false

  // Подключение к CalDAV серверу
  async connect(credentials: CalDAVCredentialsProps): Promise<boolean> {
    try {
      // Создаем клиент CalDAV
      this.client = await createDAVClient({
        serverUrl: credentials.serverUrl,
        credentials: {
          username: credentials.username,
          password: credentials.password,
        },
        authMethod: "Basic",
        defaultAccountType: "caldav",
      })

      // Получаем список календарей
      this.calendars = await this.client.fetchCalendars()

      if (this.calendars.length === 0) {
        throw new Error("Не найдено ни одного календаря")
      }

      this.isConnected = true
      return true
    } catch (error) {
      console.error("Ошибка подключения к CalDAV:", error)
      this.isConnected = false
      throw new Error(
        `Не удалось подключиться к CalDAV: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`,
      )
    }
  }

  // Получение списка календарей
  getCalendars(): DAVCalendar[] {
    if (!this.isConnected || !this.client) {
      throw new Error("Нет подключения к CalDAV. Сначала выполните connect()")
    }

    return this.calendars
  }

  // Получение событий календаря за указанный период
  async getCalendarEvents(
    calendarId: string | undefined = undefined,
    startDate: Date,
    endDate: Date,
  ): Promise<CalDAVEvent[]> {
    if (!this.isConnected || !this.client) {
      throw new Error("Нет подключения к CalDAV. Сначала выполните connect()")
    }

    try {
      // Если calendarId не указан, используем первый календарь из списка
      const calendar = calendarId ? this.calendars.find((cal) => cal.url === calendarId) : this.calendars[0]

      if (!calendar) {
        throw new Error("Календарь не найден")
      }

      // Форматируем даты для запроса
      const timeRangeFilter = {
        type: "VEVENT",
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      }

      // Получаем события
      const objects = await this.client.calendarQuery({
        url: calendar.url,
        timeRange: timeRangeFilter,
        depth: "1",
        expand: true,
      })

      // Преобразуем события в удобный формат
      const events: CalDAVEvent[] = objects
        .filter((obj) => obj.data.includes("BEGIN:VEVENT"))
        .map((obj) => this.parseICalEvent(obj))
        .filter((event): event is CalDAVEvent => event !== null)

      return events
    } catch (error) {
      console.error("Ошибка при получении событий календаря:", error)
      throw new Error(
        `Не удалось получить события календаря: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`,
      )
    }
  }

  // Парсинг iCal события
  private parseICalEvent(obj: DAVObject): CalDAVEvent | null {
    try {
      const lines = obj.data.split("\n")
      const event: Partial<CalDAVEvent> = {
        id: obj.url || crypto.randomUUID(),
      }

      let inEvent = false

      for (const line of lines) {
        if (line.startsWith("BEGIN:VEVENT")) {
          inEvent = true
          continue
        }

        if (line.startsWith("END:VEVENT")) {
          inEvent = false
          break
        }

        if (!inEvent) continue

        if (line.startsWith("SUMMARY:")) {
          event.title = line.substring(8).trim()
        } else if (line.startsWith("DTSTART")) {
          const value = this.extractDateValue(line)
          if (value) {
            event.start = value.date
            event.isAllDay = value.isAllDay
          }
        } else if (line.startsWith("DTEND")) {
          const value = this.extractDateValue(line)
          if (value) {
            event.end = value.date
          }
        } else if (line.startsWith("LOCATION:")) {
          event.location = line.substring(9).trim()
        } else if (line.startsWith("DESCRIPTION:")) {
          event.description = line.substring(12).trim()
        }
      }

      // Проверяем, что у нас есть все необходимые поля
      if (event.title && event.start && event.end) {
        return event as CalDAVEvent
      }

      return null
    } catch (error) {
      console.error("Ошибка при парсинге iCal события:", error)
      return null
    }
  }

  // Извлечение даты из строки iCal
  private extractDateValue(line: string): { date: Date; isAllDay: boolean } | null {
    try {
      // Ищем значение даты
      const valueMatch = line.match(/:([^;]+)/)
      if (!valueMatch) return null

      const value = valueMatch[1]
      const isAllDay = false

      // Проверяем формат даты
      if (value.includes("T")) {
        // Формат с временем: 20230101T120000Z
        const year = Number.parseInt(value.substring(0, 4))
        const month = Number.parseInt(value.substring(4, 6)) - 1 // Месяцы в JS начинаются с 0
        const day = Number.parseInt(value.substring(6, 8))
        const hour = Number.parseInt(value.substring(9, 11))
        const minute = Number.parseInt(value.substring(11, 13))
        const second = Number.parseInt(value.substring(13, 15))

        return {
          date: new Date(Date.UTC(year, month, day, hour, minute, second)),
          isAllDay: false,
        }
      } else {
        // Формат без времени (весь день): 20230101
        const year = Number.parseInt(value.substring(0, 4))
        const month = Number.parseInt(value.substring(4, 6)) - 1
        const day = Number.parseInt(value.substring(6, 8))

        return {
          date: new Date(Date.UTC(year, month, day)),
          isAllDay: true,
        }
      }
    } catch (error) {
      console.error("Ошибка при извлечении даты:", error)
      return null
    }
  }
}
