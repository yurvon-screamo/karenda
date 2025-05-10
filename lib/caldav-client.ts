import { DAVClient } from 'tsdav';
import { parseStringPromise } from 'xml2js';
import { CalendarEvent, ParticipantStatus, ParticipantRole } from './types';

interface Event {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  participants?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    status?: ParticipantStatus;
    role?: ParticipantRole;
    isOrganizer: boolean;
  }[];
}

interface Calendar {
  url: string;
  displayName: string;
  id: string;
}

// Интерфейс для учетных данных CalDAV
interface CalDAVCredentialsProps {
  serverUrl: string
  username: string
  password: string
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
    if (!this.serverUrl.endsWith('/')) {
      this.serverUrl += '/';
    }
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
      const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:resourcetype/>
    <D:displayname/>
    <D:getctag/>
  </D:prop>
</D:propfind>`;

      const calendarUrl = `${this.serverUrl}calendars/${this.username}@yandex.ru/`;
      const response = await fetch(calendarUrl, {
        method: 'PROPFIND',
        headers: {
          'Depth': '1',
          'Content-Type': 'application/xml; charset=utf-8',
          'Authorization': 'Basic ' + btoa(`${this.username}:${this.password}`)
        },
        body: xmlRequest
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const responseText = await response.text();
      const calendars: Calendar[] = [];
      const result = await parseStringPromise(responseText);

      if (result['D:multistatus'] && result['D:multistatus']['D:response']) {
        const responses = Array.isArray(result['D:multistatus']['D:response'])
          ? result['D:multistatus']['D:response']
          : [result['D:multistatus']['D:response']];

        for (const response of responses) {
          const href = response['href']?.[0]?._;
          const displayName = response['D:propstat']?.[0]?.['D:prop']?.[0]?.['D:displayname']?.[0];
          const resourceType = response['D:propstat']?.[0]?.['D:prop']?.[0]?.['D:resourcetype']?.[0];

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
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const responseText = await response.text();
      const events: Event[] = [];
      const result = await parseStringPromise(responseText);

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
                let [key, ...valueParts] = line.split(':');
                let value = valueParts.join(':');

                if (key.startsWith('ATTENDEE') || key.startsWith('ORGANIZER')) {
                  const attendeeParams = key.split(';').slice(1);
                  const name = attendeeParams.find((p: string) => p.startsWith('CN='))?.split('=')[1] || '';
                  const statusParam = attendeeParams.find((p: string) => p.startsWith('PARTSTAT='))?.split('=')[1];
                  const roleParam = attendeeParams.find((p: string) => p.startsWith('ROLE='))?.split('=')[1];

                  const email = value.replace(/^mailto:/, '');
                  const cleanName = name.replace(/^["']|["']$/g, '');

                  if (!event.participants) {
                    event.participants = [];
                  }

                  event.participants.push({
                    id: email,
                    name: decodeURIComponent(cleanName),
                    email: email,
                    avatar: `https://www.gravatar.com/avatar/${email}?d=identicon&s=200`,
                    status: statusParam as ParticipantStatus,
                    role: roleParam as ParticipantRole,
                    isOrganizer: key.startsWith('ORGANIZER')
                  });
                } else if (key.startsWith('DTSTART;TZID=Europe/Moscow')) {
                  const [year, month, day, hour, minute, second] = value.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/)?.slice(1) || [];
                  if (year && month && day && hour && minute && second) {
                    const dateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}+03:00`;
                    event.start = new Date(dateStr);
                  }
                } else if (key.startsWith('DTEND;TZID=Europe/Moscow')) {
                  const [year, month, day, hour, minute, second] = value.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/)?.slice(1) || [];
                  if (year && month && day && hour && minute && second) {
                    const dateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}+03:00`;
                    event.end = new Date(dateStr);
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

      const calendarEvents = events.map(event => {
        const startDate = event.start;
        const endDate = event.end;
        const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));

        return {
          id: event.id,
          title: event.summary,
          date: startDate.toISOString().split('T')[0],
          time: `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`,
          duration: duration,
          description: event.description || '',
          location: event.location,
          source: 'caldav' as const,
          isAllDay: false,
          participants: event.participants?.map(p => ({
            id: p.id,
            name: p.name,
            email: p.email,
            avatar: p.avatar,
            status: p.status,
            role: p.role,
            isOrganizer: p.isOrganizer
          })) || []
        };
      });

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
