import { type NextRequest, NextResponse } from "next/server"
import { CalDAVClient } from "@/lib/caldav-client"

export async function POST(request: NextRequest) {
    try {
        const data = await request.json()
        const { serverUrl, username, password } = data

        if (!serverUrl || !username || !password) {
            return NextResponse.json({ error: "Отсутствуют обязательные параметры" }, { status: 400 })
        }

        // Создаем клиент CalDAV
        const client = new CalDAVClient(serverUrl, username, password)

        // Подключаемся к серверу CalDAV
        await client.connect()

        // Получаем список календарей
        const calendars = await client.getCalendars()

        return NextResponse.json({ calendars })
    } catch (error) {
        console.error("Ошибка проверки подключения к CalDAV:", error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Произошла ошибка при проверке подключения" },
            { status: 500 }
        )
    }
} 