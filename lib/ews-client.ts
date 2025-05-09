import {
  ExchangeService,
  ExchangeCredentials,
  Uri,
  FolderId,
  WellKnownFolderName,
  CalendarView,
  DateTime,
  WebCredentials,
} from "ews-javascript-api"

// Интерфейс для учетных данных Exchange
export interface ExchangeCredentialsProps {
  email: string
  password: string
  serverUrl?: string
}

// Интерфейс для событий из Exchange
export interface ExchangeEvent {
  id: string
  title: string
  start: Date
  end: Date
  location?: string
  description?: string
  isAllDay: boolean
}

// Класс для работы с EWS API
export class EwsClient {
  private service: ExchangeService
  private isConnected = false

  constructor() {
    this.service = new ExchangeService()
  }

  // Подключение к Exchange серверу
  async connect(credentials: ExchangeCredentialsProps): Promise<boolean> {
    try {
      // Настройка учетных данных
      this.service.Credentials = new WebCredentials(credentials.email, credentials.password)

      // Автообнаружение URL сервера, если не указан явно
      if (credentials.serverUrl) {
        this.service.Url = new Uri(credentials.serverUrl)
      } else {
        await this.service.AutodiscoverUrl(credentials.email)
      }

      this.isConnected = true
      return true
    } catch (error) {
      console.error("Ошибка подключения к Exchange:", error)
      this.isConnected = false
      throw new Error(
        `Не удалось подключиться к Exchange: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`,
      )
    }
  }

  // Получение событий календаря за указанный период
  async getCalendarEvents(startDate: Date, endDate: Date): Promise<ExchangeEvent[]> {
    if (!this.isConnected) {
      throw new Error("Нет подключения к Exchange. Сначала выполните connect()")
    }

    try {
      // Получение папки календаря
      const calendarFolder = new FolderId(WellKnownFolderName.Calendar)

      // Создание представления календаря для указанного периода
      const calendarView = new CalendarView(
        DateTime.Parse(startDate.toISOString()),
        DateTime.Parse(endDate.toISOString()),
      )

      // Установка максимального количества результатов
      calendarView.MaxItemsReturned = 100

      // Получение событий
      const findResults = await this.service.FindAppointments(calendarFolder, calendarView)

      // Преобразование результатов в удобный формат
      const events: ExchangeEvent[] = findResults.Items.map((appointment) => ({
        id: appointment.Id.UniqueId,
        title: appointment.Subject,
        start: new Date(appointment.Start.toString()),
        end: new Date(appointment.End.toString()),
        location: appointment.Location,
        description: appointment.Body?.Text,
        isAllDay: appointment.IsAllDayEvent,
      }))

      return events
    } catch (error) {
      console.error("Ошибка при получении событий календаря:", error)
      throw new Error(
        `Не удалось получить события календаря: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`,
      )
    }
  }
}
