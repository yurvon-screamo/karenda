import { type NextRequest, NextResponse } from "next/server"
import { CalDAVClient, type CalDAVCredentialsProps } from "@/lib/caldav-client"

export async function POST(request: NextRequest) {
  try {
    // Получаем данные из запроса
    const data = await request.json()
    const { serverUrl, username, password, calendarId, startDate, endDate } = data

    if (!serverUrl || !username || !password || !startDate || !endDate) {
      return NextResponse.json({ error: "Отсутствуют обязательные параметры" }, { status: 400 })
    }

    // Создаем клиент CalDAV
    const client = new CalDAVClient()

    // Подключаемся к серверу CalDAV
    const credentials: CalDAVCredentialsProps = {
      serverUrl,
      username,
      password,
    }

    await client.connect(credentials)

    // Получаем список календарей
    const calendars = client.getCalendars()

    // Получаем события календаря
    const events = await client.getCalendarEvents(calendarId, new Date(startDate), new Date(endDate))

    // Возвращаем события и список календарей
    return NextResponse.json({ events, calendars })
  } catch (error) {
    console.error("Ошибка синхронизации с CalDAV:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Произошла ошибка при синхронизации" },
      { status: 500 },
    )
  }
}
