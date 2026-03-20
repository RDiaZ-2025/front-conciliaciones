import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HolidayService {
  async getHolidays(year: number): Promise<string[]> {
    try {
      const response = await fetch(`https://festivos.com.co/api/v1/festivos?year=${year}`, {
        headers: {
          'Authorization': `Bearer ${environment.festivosApiKey}`
        }
      });
      const data = await response.json();
      return data?.data?.map((h: any) => h.date) || [];
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  async getHolidaysForDateRange(date: Date): Promise<string[]> {
    const year = date.getFullYear();
    const currentYearHolidays = await this.getHolidays(year);
    let nextYearHolidays: string[] = [];

    if (date.getMonth() === 11) {
      nextYearHolidays = await this.getHolidays(year + 1);
    }

    return [...currentYearHolidays, ...nextYearHolidays];
  }

  isHoliday(date: Date, holidays: string[]): boolean {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return holidays.includes(dateStr);
  }
}
