import { useMemo } from 'react';
import moment from 'moment';
import type { MedicalTimelineEventType } from '../types/MedicalChronologyDetailsType';
import {
  DAY_COL_WIDTH,
  MIN_TIMELINE_WIDTH,
  MONTH_COL_WIDTH,
} from './medicalTimelineMatrix.constants';
import {
  getDateFromEvent,
  getSourceFileName,
  mapCareSetting,
  mapToEventType,
} from './medicalTimelineMatrix.utilities';
import type {
  ChartData,
  ChartPoint,
  InjuryMarker,
  MonthYearSegment,
  SelectedRange,
  YearSegment,
} from './medicalTimelineMatrix.types';

function collectInjuryMarkers(
  datedEvents: Array<{ item: MedicalTimelineEventType; date: Date }>,
  xForDate: (date: Date) => number
): Array<InjuryMarker> {
  const byDay = new Map<string, { date: Date; ids: Array<string> }>();
  for (const { item, date } of datedEvents) {
    if (mapToEventType(item).id !== 'date_of_injury') continue;
    const dayKey = moment(date).format('YYYY-MM-DD');
    const existing = byDay.get(dayKey);
    if (existing) {
      existing.ids.push(item._id);
    } else {
      byDay.set(dayKey, { date, ids: [item._id] });
    }
  }
  return Array.from(byDay.entries())
    .map(([dayKey, { date, ids }]) => ({
      dayKey,
      x: xForDate(date),
      label: moment(date).format('MMM D, YYYY'),
      pointIds: ids,
    }))
    .sort((a, b) => a.x - b.x);
}

export const useMedicalTimelineChartData = (
  data: Array<MedicalTimelineEventType>,
  selectedRange: SelectedRange
): ChartData => {
  return useMemo(() => {
    const datedEvents = data
      .map((item) => ({ item, date: getDateFromEvent(item) }))
      .filter(
        (event): event is { item: MedicalTimelineEventType; date: Date } =>
          event.date !== null
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (datedEvents.length === 0) {
      const now = new Date();
      return {
        monthLabels: [],
        yearSegments: [],
        janMonthIndex: -1,
        janYear: now.getFullYear(),
        timelineWidth: MIN_TIMELINE_WIDTH,
        points: [],
        injuryMarkers: [],
        monthYearSegments: [],
        _debugMinDate: now,
      };
    }

    const minDate = datedEvents[0].date;
    const maxDate = datedEvents[datedEvents.length - 1].date;

    const clampPercent = (n: number): number => Math.min(100, Math.max(0, n));

    const getDaysInMonth = (d: Date): number =>
      new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

    const xForYearOnly = (
      date: Date,
      startYear: number,
      yearCount: number
    ): number => {
      const yearIndex = date.getFullYear() - startYear;
      const monthIndex = date.getMonth();
      const daysInMonth = getDaysInMonth(date);
      const dayFrac = daysInMonth > 0 ? (date.getDate() - 1) / daysInMonth : 0;
      const withinYear = (monthIndex + dayFrac) / 12;
      return clampPercent(((yearIndex + withinYear) / yearCount) * 100);
    };

    const buildMonthStarts = (start: Date, end: Date): Array<Date> => {
      const starts: Array<Date> = [];
      const cursor = new Date(start);
      while (true) {
        starts.push(new Date(cursor));
        if (
          cursor.getFullYear() === end.getFullYear() &&
          cursor.getMonth() === end.getMonth()
        ) {
          break;
        }
        cursor.setMonth(cursor.getMonth() + 1);
      }
      return starts;
    };

    const xForMonthColumns = (
      date: Date,
      startMonthStart: Date,
      monthCount: number
    ): number => {
      const startYM =
        startMonthStart.getFullYear() * 12 + startMonthStart.getMonth();
      const ym = date.getFullYear() * 12 + date.getMonth();
      const monthIndex = ym - startYM;
      const daysInMonth = getDaysInMonth(date);
      const dayFrac = daysInMonth > 0 ? (date.getDate() - 1) / daysInMonth : 0;
      const within = monthIndex + dayFrac;
      return clampPercent((within / monthCount) * 100);
    };

    const points: Array<ChartPoint> = [];
    let monthLabels: Array<string> = [];
    let yearSegments: Array<YearSegment> = [];
    let janMonthIndex = -1;
    let janYear = maxDate.getFullYear();
    let monthYearSegments: Array<MonthYearSegment> = [];
    let timelineWidth = MIN_TIMELINE_WIDTH;
    let injuryMarkers: Array<InjuryMarker> = [];

    if (selectedRange === '5Y' || selectedRange === '2Y') {
      const startYear = minDate.getFullYear();
      const endYear = maxDate.getFullYear();
      const yearCount = endYear - startYear + 1;

      monthLabels = new Array(yearCount).fill('');
      yearSegments = Array.from({ length: yearCount }, (_, index) => ({
        year: startYear + index,
        startIndex: index,
        endIndex: index,
      }));

      timelineWidth = Math.max(MIN_TIMELINE_WIDTH, yearCount * MONTH_COL_WIDTH);

      for (const { item, date } of datedEvents) {
        const mappedType = mapToEventType(item);
        points.push({
          id: item._id,
          x: xForYearOnly(date, startYear, yearCount),
          typeId: mappedType.id,
          dateLabel: moment(date).format('MMM D, YYYY'),
          title: item.title,
          careSetting: mapCareSetting(item),
          provider: item.physician || 'Not Provided',
          facility: item.location || 'Not Provided',
          sourceFile: getSourceFileName(item),
          sourceFileId: item.file._id,
        });
      }

      injuryMarkers = collectInjuryMarkers(datedEvents, (d) =>
        xForYearOnly(d, startYear, yearCount)
      );
    } else if (selectedRange === '1Y' || selectedRange === '6M') {
      const monthsCount = selectedRange === '1Y' ? 12 : 6;
      const endMonthStart = new Date(
        maxDate.getFullYear(),
        maxDate.getMonth(),
        1
      );
      const startMonthStart = new Date(
        endMonthStart.getFullYear(),
        endMonthStart.getMonth() - (monthsCount - 1),
        1
      );

      const monthStarts = buildMonthStarts(startMonthStart, endMonthStart);
      monthLabels = monthStarts.map((d) => moment(d).format('MMM'));

      yearSegments = [];
      for (let index = 0; index < monthStarts.length; index += 1) {
        const year = monthStarts[index].getFullYear();
        if (index === 0 || monthStarts[index - 1].getFullYear() !== year) {
          yearSegments.push({
            year,
            startIndex: index,
            endIndex: index,
          });
        } else {
          yearSegments[yearSegments.length - 1].endIndex = index;
        }
      }

      janMonthIndex = monthLabels.findIndex((m) => m === 'Jan');
      janYear =
        janMonthIndex >= 0
          ? monthStarts[janMonthIndex].getFullYear()
          : (monthStarts[0]?.getFullYear() ?? maxDate.getFullYear());

      timelineWidth = Math.max(
        MIN_TIMELINE_WIDTH,
        monthsCount * MONTH_COL_WIDTH
      );

      for (const { item, date } of datedEvents) {
        const mappedType = mapToEventType(item);
        points.push({
          id: item._id,
          x: xForMonthColumns(date, startMonthStart, monthsCount),
          typeId: mappedType.id,
          dateLabel: moment(date).format('MMM D, YYYY'),
          title: item.title,
          careSetting: mapCareSetting(item),
          provider: item.physician || 'Not Provided',
          facility: item.location || 'Not Provided',
          sourceFile: getSourceFileName(item),
          sourceFileId: item.file._id,
        });
      }

      injuryMarkers = collectInjuryMarkers(datedEvents, (d) =>
        xForMonthColumns(d, startMonthStart, monthsCount)
      );
    } else {
      const axisEndMoment = moment(maxDate).startOf('day');
      const axisStartMoment = moment(maxDate)
        .subtract(1, 'month')
        .startOf('day');
      const axisStart = axisStartMoment.toDate();

      const dayCount =
        Math.max(axisEndMoment.diff(axisStartMoment, 'days') + 1, 1) || 1;

      const xForDayRange = (date: Date): number => {
        const dateMoment = moment(date);
        const dayIndex = dateMoment
          .startOf('day')
          .diff(axisStartMoment, 'days');
        const dayStart = dateMoment.clone().startOf('day');
        const dayEnd = dateMoment.clone().endOf('day');
        const dayDurationMs = Math.max(
          dayEnd.valueOf() - dayStart.valueOf(),
          1
        );
        const dayProgress =
          (dateMoment.valueOf() - dayStart.valueOf()) / dayDurationMs;
        return clampPercent(((dayIndex + dayProgress) / dayCount) * 100);
      };

      monthLabels = Array.from({ length: dayCount }, (_, dayOffset) =>
        moment(axisStart).add(dayOffset, 'day').format('D')
      );

      monthYearSegments = [];
      for (let offset = 0; offset < dayCount; offset += 1) {
        const d = moment(axisStart).add(offset, 'day').toDate();
        const label = moment(d).format('MMM YYYY');
        const last = monthYearSegments[monthYearSegments.length - 1];
        if (!last || last.label !== label) {
          monthYearSegments.push({
            label,
            startIndex: offset,
            endIndex: offset,
          });
        } else {
          last.endIndex = offset;
        }
      }

      yearSegments = [];
      janMonthIndex = -1;
      janYear = axisStart.getFullYear();
      timelineWidth = Math.max(MIN_TIMELINE_WIDTH, dayCount * DAY_COL_WIDTH);

      for (const { item, date } of datedEvents) {
        const mappedType = mapToEventType(item);
        points.push({
          id: item._id,
          x: xForDayRange(date),
          typeId: mappedType.id,
          dateLabel: moment(date).format('MMM D, YYYY'),
          title: item.title,
          careSetting: mapCareSetting(item),
          provider: item.physician || 'Not Provided',
          facility: item.location || 'Not Provided',
          sourceFile: getSourceFileName(item),
          sourceFileId: item.file._id,
        });
      }

      injuryMarkers = collectInjuryMarkers(datedEvents, xForDayRange);
    }

    return {
      monthLabels,
      yearSegments,
      janMonthIndex,
      janYear,
      monthYearSegments,
      timelineWidth,
      points,
      injuryMarkers,
      _debugMinDate: minDate,
    };
  }, [data, selectedRange]);
};
