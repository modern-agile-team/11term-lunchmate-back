import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const KOREA_TIMEZONE = 'Asia/Seoul';
const DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export function formatKoreaDate(date: string | Date): string {
  return dayjs(date).tz(KOREA_TIMEZONE).format(DATE_FORMAT);
}
