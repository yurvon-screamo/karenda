import { type NextRequest, NextResponse } from "next/server"
import { EwsClient } from "@/lib/ews-client"

export async function POST(request: NextRequest) {
    try {
        const data = await request.json()
        const { email, password, serverUrl } = data

        if (!email || !password) {
            return NextResponse.json({ error: "Отсутствуют обязательные параметры" }, { status: 400 })
        }

        // Создаем клиент EWS
        const client = new EwsClient()

        // Подключаемся к серверу Exchange
        await client.connect({
            email,
            password,
            serverUrl: serverUrl || undefined,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Ошибка проверки подключения к Outlook:", error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Произошла ошибка при проверке подключения" },
            { status: 500 }
        )
    }
} 