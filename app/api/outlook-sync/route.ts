import { type NextRequest, NextResponse } from "next/server"
import { EwsClient, type ExchangeCredentialsProps } from "@/lib/ews-client"

export async function POST(request: NextRequest) {
  try {
    // Получаем данные из запроса
    const data = await request.json()
    const { email, password, serverUrl, startDate, endDate } = data

    if (!email || !password || !startDate || !endDate) {
      return NextResponse.json({ error: "Отсутствуют обязательные параметры" }, { status: 400 })
    }

    // Создаем клиент EWS
    const client = new EwsClient()

    // Подключаемся к серверу Exchange
    const credentials: ExchangeCredentialsProps = {
      email,
      password,
      serverUrl: serverUrl || undefined,
    }

    await client.connect(credentials)

    // Получаем события календаря
    const events = await client.getCalendarEvents(new Date(startDate), new Date(endDate))

    // Возвращаем события
    return NextResponse.json({ events })
  } catch (error) {
    console.error("Ошибка синхронизации с Outlook:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Произошла ошибка при синхронизации" },
      { status: 500 },
    )
  }
}
