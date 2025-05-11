import {
  ExchangeService,
  ExchangeCredentials,
  Uri,
  FolderId,
  WellKnownFolderName,
  CalendarView,
  DateTime,
  WebCredentials,
  PropertySet,
  AppointmentSchema,
  ExchangeVersion,
  FolderView,
  Attendee,
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
  participants?: {
    id: string
    name: string
    email: string
    status?: string
    role?: string
    isOrganizer?: boolean
  }[]
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

      // Настройка URL сервера
      const serverUrl = credentials.serverUrl || 'https://mail.rusklimat.ru/EWS/Exchange.asmx'
      this.service.Url = new Uri(serverUrl)

      // Настройка дополнительных параметров
      this.service.EnableScpLookup = false
      this.service.PreAuthenticate = true
      this.service.KeepAlive = true
      this.service.Timeout = 60000 // 60 секунд таймаут

      // Проверка подключения через простой запрос
      try {
        // Пробуем получить информацию о папке календаря
        const calendarFolder = new FolderId(WellKnownFolderName.Calendar)
        await this.service.FindFolders(calendarFolder, new FolderView(1))
      } catch (error) {
        console.error("Ошибка при проверке подключения:", error)
        if (error instanceof Error) {
          throw new Error(`Ошибка подключения: ${error.message}`)
        }
        throw new Error("Не удалось подключиться к серверу Exchange")
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
      calendarView.MaxItemsReturned = 1000

      // Получение событий
      const findResults = await this.service.FindAppointments(calendarFolder, calendarView)

      // Загружаем полную информацию о каждом событии
      const events: ExchangeEvent[] = []
      for (const appointment of findResults.Items) {
        try {
          // Загружаем полную информацию о событии
          const propertySet = new PropertySet(
            AppointmentSchema.Subject,
            AppointmentSchema.Start,
            AppointmentSchema.End,
            AppointmentSchema.Location,
            AppointmentSchema.Body,
            AppointmentSchema.IsAllDayEvent,
            AppointmentSchema.Organizer,
            AppointmentSchema.RequiredAttendees,
            AppointmentSchema.OptionalAttendees
          )

          // Устанавливаем тип тела сообщения как текст
          propertySet.RequestedBodyType = 1 // Text

          await appointment.Load(propertySet)

          const start = appointment.Start ? new Date(appointment.Start.toString()) : new Date()
          const end = appointment.End ? new Date(appointment.End.toString()) : new Date(start.getTime() + 3600000)

          // Обработка участников
          const participants = []

          // Добавляем организатора
          if (appointment.Organizer) {
            console.log('Организатор:', appointment.Organizer)
            participants.push({
              id: appointment.Organizer.Address,
              name: appointment.Organizer.Name || appointment.Organizer.Address,
              email: appointment.Organizer.Address,
              isOrganizer: true
            })
          }

          // Добавляем участников
          if (appointment.RequiredAttendees) {
            const requiredAttendees = appointment.RequiredAttendees as any
            console.log('Обязательные участники:', requiredAttendees)
            if (requiredAttendees && requiredAttendees.Items) {
              console.log('Items обязательных участников:', requiredAttendees.Items)
              for (const attendee of requiredAttendees.Items) {
                console.log('Обработка обязательного участника:', attendee)
                participants.push({
                  id: attendee.Address,
                  name: attendee.Name || attendee.Address,
                  email: attendee.Address,
                  status: attendee.ResponseType?.toString(),
                  role: 'REQ-PARTICIPANT',
                  isOrganizer: false
                })
              }
            }
          }

          if (appointment.OptionalAttendees) {
            const optionalAttendees = appointment.OptionalAttendees as any
            console.log('Необязательные участники:', optionalAttendees)
            if (optionalAttendees && optionalAttendees.Items) {
              console.log('Items необязательных участников:', optionalAttendees.Items)
              for (const attendee of optionalAttendees.Items) {
                console.log('Обработка необязательного участника:', attendee)
                participants.push({
                  id: attendee.Address,
                  name: attendee.Name || attendee.Address,
                  email: attendee.Address,
                  status: attendee.ResponseType?.toString(),
                  role: 'OPT-PARTICIPANT',
                  isOrganizer: false
                })
              }
            }
          }

          console.log('Итоговый список участников:', participants)

          events.push({
            id: appointment.Id.UniqueId,
            title: appointment.Subject || 'Без названия',
            start,
            end,
            location: appointment.Location || '',
            description: appointment.Body?.Text || '',
            isAllDay: appointment.IsAllDayEvent || false,
            participants
          })
        } catch (error) {
          console.warn("Ошибка при обработке события:", error)
          events.push({
            id: appointment.Id.UniqueId,
            title: 'Ошибка загрузки события',
            start: new Date(),
            end: new Date(),
            location: '',
            description: '',
            isAllDay: false,
            participants: []
          })
        }
      }

      return events
    } catch (error) {
      console.error("Ошибка при получении событий календаря:", error)
      throw new Error(
        `Не удалось получить события календаря: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`,
      )
    }
  }
}
