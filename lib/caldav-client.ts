import { DAVClient } from 'tsdav';
import { parseStringPromise } from 'xml2js';
import { CalendarEvent } from './types';

interface Event {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
}

interface Calendar {
  url: string;
  displayName: string;
  id: string;
}

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

// Интерфейс для ответа календаря
interface CalendarResponse {
  data: string;
  url: string;
}

// Класс для работы с CalDAV
export class CalDAVClient {
  private client: DAVClient | null = null;
  private calendarUrl: string | null = null;

  constructor(
    private serverUrl: string,
    private username: string,
    private password: string
  ) {
    // Убедимся, что URL заканчивается на /
    if (!this.serverUrl.endsWith('/')) {
      this.serverUrl += '/';
    }
    console.log('Initialized CalDAV client with:', {
      serverUrl: this.serverUrl,
      username: this.username
    });
  }

  async connect(): Promise<void> {
    try {
      if (!this.serverUrl) {
        throw new Error('Server URL is required');
      }

      this.client = new DAVClient({
        serverUrl: this.serverUrl,
        credentials: {
          username: this.username,
          password: this.password,
        },
        authMethod: 'Basic',
        defaultAccountType: 'caldav',
      });

      await this.client.login();
      console.log('CalDAV client connected successfully');
    } catch (error) {
      console.error('Failed to connect to CalDAV server:', error);
      throw error;
    }
  }

  async getCalendars(): Promise<Calendar[]> {
    if (!this.client) {
      throw new Error('CalDAV client is not connected');
    }

    try {
      // Формируем XML запрос для получения списка календарей
      const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:resourcetype/>
    <D:displayname/>
    <D:getctag/>
  </D:prop>
</D:propfind>`;

      const calendarUrl = `${this.serverUrl}calendars/${this.username}@yandex.ru/`;
      console.log('Requesting calendars from URL:', calendarUrl);
      console.log('Request headers:', {
        'Depth': '1',
        'Content-Type': 'application/xml; charset=utf-8',
        'Authorization': 'Basic ' + btoa(`${this.username}:${this.password}`).substring(0, 10) + '...'
      });
      console.log('Request body:', xmlRequest);

      const response = await fetch(calendarUrl, {
        method: 'PROPFIND',
        headers: {
          'Depth': '1',
          'Content-Type': 'application/xml; charset=utf-8',
          'Authorization': 'Basic ' + btoa(`${this.username}:${this.password}`)
        },
        body: xmlRequest
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const responseText = await response.text();
      console.log('CalDAV calendars response:', responseText);

      // Парсим ответ
      const calendars: Calendar[] = [];
      const result = await parseStringPromise(responseText);
      console.log('Parsed XML structure:', JSON.stringify(result, null, 2));

      if (result['D:multistatus'] && result['D:multistatus']['D:response']) {
        const responses = Array.isArray(result['D:multistatus']['D:response'])
          ? result['D:multistatus']['D:response']
          : [result['D:multistatus']['D:response']];

        for (const response of responses) {
          const href = response['href']?.[0]?._;
          const displayName = response['D:propstat']?.[0]?.['D:prop']?.[0]?.['D:displayname']?.[0];
          const resourceType = response['D:propstat']?.[0]?.['D:prop']?.[0]?.['D:resourcetype']?.[0];

          console.log('Processing response:', {
            href,
            displayName,
            resourceType
          });

          // Проверяем, что это календарь (содержит C:calendar)
          if (href && resourceType && resourceType['C:calendar']) {
            const urlParts = href.split('/');
            const calendarId = urlParts[urlParts.length - 2];

            calendars.push({
              url: href,
              displayName: displayName || 'Календарь без имени',
              id: calendarId
            });
          }
        }
      }

      console.log('Parsed calendars:', calendars);
      return calendars;
    } catch (error) {
      console.error('Failed to get calendars:', error);
      throw error;
    }
  }

  async getCalendarEvents(calendarId: string, startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    if (!this.client) {
      throw new Error('CalDAV client is not connected');
    }

    try {
      const calendarUrl = `${this.serverUrl}calendars/${this.username}@yandex.ru/${calendarId}/`;
      console.log('Calendar URL:', calendarUrl);

      // Формируем XML запрос
      const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag/>
    <c:calendar-data/>
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z" end="${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z"/>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;

      // Отправляем REPORT запрос
      const response = await fetch(calendarUrl, {
        method: 'REPORT',
        headers: {
          'Depth': '1',
          'Content-Type': 'application/xml; charset=utf-8',
          'Authorization': 'Basic ' + btoa(`${this.username}:${this.password}`)
        },
        body: xmlRequest
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const responseText = await response.text();
      console.log('CalDAV response:', responseText);

      // Парсим ответ
      const events: Event[] = [];
      const result = await parseStringPromise(responseText);
      console.log('Parsed XML structure:', JSON.stringify(result, null, 2));

      if (result['D:multistatus'] && result['D:multistatus']['D:response']) {
        const responses = Array.isArray(result['D:multistatus']['D:response'])
          ? result['D:multistatus']['D:response']
          : [result['D:multistatus']['D:response']];

        for (const response of responses) {
          const calendarData = response['D:propstat']?.[0]?.['D:prop']?.[0]?.['C:calendar-data']?.[0];

          if (calendarData && calendarData._) {
            const lines = calendarData._.split('\n');
            let event: Partial<Event> = {};
            let inEvent = false;

            for (const line of lines) {
              if (line.startsWith('BEGIN:VEVENT')) {
                inEvent = true;
                event = {};
              } else if (line.startsWith('END:VEVENT')) {
                inEvent = false;
                if (event.start && event.end && event.summary) {
                  events.push(event as Event);
                }
              } else if (inEvent) {
                let [key, value] = line.replace("http:", "http").replace("https:", "https").split(':');
                value = value.replace("http//", "http://").replace("https//", "https://")
                if (key.startsWith('DTSTART;TZID=Europe/Moscow')) {
                  console.log('Parsing start date:', { key, value });
                  const [year, month, day, hour, minute, second] = value.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/)?.slice(1) || [];
                  if (year && month && day && hour && minute && second) {
                    const dateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}+03:00`;
                    console.log('Formatted start date string:', dateStr);
                    event.start = new Date(dateStr);
                    console.log('Parsed start date:', event.start);
                  }
                } else if (key.startsWith('DTEND;TZID=Europe/Moscow')) {
                  console.log('Parsing end date:', { key, value });
                  const [year, month, day, hour, minute, second] = value.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/)?.slice(1) || [];
                  if (year && month && day && hour && minute && second) {
                    const dateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}+03:00`;
                    console.log('Formatted end date string:', dateStr);
                    event.end = new Date(dateStr);
                    console.log('Parsed end date:', event.end);
                  }
                } else if (key === 'SUMMARY') {
                  event.summary = value.replace(/\r$/, '');
                } else if (key === 'DESCRIPTION') {
                  event.description = value.replace(/\\n/g, '\n').replace(/\\,/g, ',');
                } else if (key === 'LOCATION') {
                  event.location = value;
                } else if (key === 'UID') {
                  event.id = value.replace(/\r$/, '');
                }
              }
            }
          }
        }
      }

      // Преобразуем события в формат CalendarEvent
      const calendarEvents = events.map(event => {
        const startDate = event.start;
        const endDate = event.end;
        const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60)); // в минутах

        return {
          id: event.id,
          title: event.summary,
          date: startDate.toISOString().split('T')[0],
          time: `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`,
          duration: duration,
          description: event.description || '',
          location: event.location,
          source: 'caldav' as const,
          isAllDay: false
        };
      });

      console.log('Converted calendar events:', calendarEvents);
      return calendarEvents;
    } catch (error) {
      console.error('Failed to get calendar events:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client = null;
    }
  }
}
