import { type NextRequest, NextResponse } from "next/server"
import { CalDAVClient } from "@/lib/caldav-client"

export async function POST(request: NextRequest) {
  try {
    // Получаем данные из запроса
    const data = await request.json()
    const { serverUrl, username, password, calendarId, startDate, endDate } = data

    if (!serverUrl || !username || !password || !startDate || !endDate) {
      return NextResponse.json({ error: "Отсутствуют обязательные параметры" }, { status: 400 })
    }

    // Проверяем наличие calendarId
    if (!calendarId) {
      // Если calendarId не указан, получаем список календарей
      const client = new CalDAVClient(serverUrl, username, password)
      await client.connect()

      // Получаем список календарей
      const calendars = await client.getCalendars()

      return NextResponse.json({ calendars })
    }

    // Создаем клиент CalDAV
    const client = new CalDAVClient(serverUrl, username, password)

    // Подключаемся к серверу CalDAV
    await client.connect()

    // Получаем события календаря
    const events = await client.getCalendarEvents(calendarId, new Date(startDate), new Date(endDate))

    // Возвращаем события
    return NextResponse.json({ events })
  } catch (error) {
    console.error("Ошибка синхронизации с CalDAV:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Произошла ошибка при синхронизации" },
      { status: 500 },
    )
  }
}
