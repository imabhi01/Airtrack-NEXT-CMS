// FILE: src/lib/dayjs-setup.ts
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(isoWeek);
dayjs.extend(duration);
dayjs.extend(relativeTime);

export default dayjs;