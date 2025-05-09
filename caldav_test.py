import requests
import base64
import xml.etree.ElementTree as ET

# URL и учетные данные
url = 'https://caldav.yandex.ru/calendars/yurvon@yandex.ru/events-5125143/'
username = 'yurvon'
password = 'dyeqznagobleuvln'

# Создаем заголовки
headers = {
    'Depth': '1',
    'Content-Type': 'application/xml; charset=utf-8'
}

# Создаем XML запрос
xml_request = '''<?xml version="1.0" encoding="utf-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag/>
    <c:calendar-data/>
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="20240101T000000Z" end="20241231T235959Z"/>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>'''

# Отправляем запрос
response = requests.request('REPORT', url, headers=headers, data=xml_request, auth=(username, password))

# Выводим результат
print(f'Status Code: {response.status_code}')
print('Response Headers:')
for header, value in response.headers.items():
    print(f'{header}: {value}')
print('\nResponse Body:')
print(response.text) 