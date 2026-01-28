import { Platform } from 'react-native';

interface ReminderEvent {
  title: string;
  description: string;
  startDate: Date;
  endDate?: Date;
}

let Calendar: any;
try {
  Calendar = require('expo-calendar');
} catch (e) {
  Calendar = null;
}

export const calendarService = {
  async requestCalendarPermissions(): Promise<boolean> {
    if (Platform.OS === 'web' || !Calendar) {
      return true;
    }

    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Calendar permission error:', error);
      return false;
    }
  },

  async createReminder(reminder: ReminderEvent, leadId: string, clientName: string): Promise<string | null> {
    if (Platform.OS === 'web' || !Calendar) {
      // For web, create a downloadable calendar file
      return this.createWebCalendar(reminder);
    }

    try {
      const hasPermission = await this.requestCalendarPermissions();
      if (!hasPermission) {
        console.warn('Calendar permission not granted');
        return null;
      }

      const calendars = await Calendar.getCalendarsAsync();
      let calendarId = calendars.find((cal: any) => cal.title === 'CRM Reminders')?.id;

      if (!calendarId) {
        calendarId = await Calendar.createCalendarAsync({
          title: 'CRM Reminders',
          color: '#0066cc',
          entityType: Calendar.EntityTypes.EVENT,
          sourceId: undefined,
          source: {
            name: 'CRM App',
            type: 'LOCAL',
          },
          name: 'crm_reminders',
          ownerAccount: 'local',
          accessLevel: Calendar.CalendarAccessLevel.OWNER,
        });
      }

      const eventId = await Calendar.createEventAsync(calendarId, {
        title: reminder.title,
        notes: reminder.description,
        startDate: reminder.startDate,
        endDate: reminder.endDate || reminder.startDate,
        timeZone: 'auto',
        alarms: [
          {
            trigger: 15, // 15 minutes before
          },
        ],
      });

      return eventId;
    } catch (error) {
      console.error('Calendar event creation error:', error);
      return null;
    }
  },

  createWebCalendar(reminder: ReminderEvent): string {
    // Create an iCalendar format string that can be downloaded
    const startTime = reminder.startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endTime = (reminder.endDate || reminder.startDate)
      .toISOString()
      .replace(/[-:]/g, '')
      .split('.')[0] + 'Z';

    const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CRM App//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${new Date().getTime()}@crm-app
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${startTime}
DTEND:${endTime}
SUMMARY:${reminder.title}
DESCRIPTION:${reminder.description}
ALARM:TRIGGER:-PT7D
END:VEVENT
END:VCALENDAR`;

    return icalContent;
  },

  async deleteReminder(eventId: string): Promise<boolean> {
    if (Platform.OS === 'web') {
      return true;
    }

    try {
      const hasPermission = await this.requestCalendarPermissions();
      if (!hasPermission) return false;

      await Calendar.deleteEventAsync(eventId);
      return true;
    } catch (error) {
      console.error('Calendar event deletion error:', error);
      return false;
    }
  },
};
