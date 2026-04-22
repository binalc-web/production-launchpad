import type { FC } from 'react';
import type { IconProps } from '@phosphor-icons/react';

export type SelectedRange = '5Y' | '2Y' | '1Y' | '6M' | '1M';
export type CareSetting = 'emergency' | 'inpatient' | 'outpatient';

export type ChartPoint = {
  id: string;
  x: number;
  typeId: string;
  dateLabel: string;
  title: string;
  careSetting: CareSetting;
  provider: string;
  facility: string;
  sourceFile: string;
  sourceFileId: string;
};

export type InjuryMarker = {
  dayKey: string;
  x: number;
  label: string;
  pointIds: Array<string>;
};

export type EventTypeConfig = {
  id: string;
  label: string;
  keywords: Array<string>;
  Icon: FC<IconProps>;
};

export type CareSettingConfig = {
  icon: FC<IconProps>;
  color: string;
};

export type YearSegment = {
  year: number;
  startIndex: number;
  endIndex: number;
};

export type MonthYearSegment = {
  label: string;
  startIndex: number;
  endIndex: number;
};

export type ChartData = {
  monthLabels: Array<string>;
  yearSegments: Array<YearSegment>;
  janMonthIndex: number;
  janYear: number;
  monthYearSegments: Array<MonthYearSegment>;
  timelineWidth: number;
  points: Array<ChartPoint>;
  injuryMarkers: Array<InjuryMarker>;
  _debugMinDate: Date;
};
