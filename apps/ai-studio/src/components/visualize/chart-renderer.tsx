import type { ReactElement } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import styles from './renderers.module.css';

import type { RendererProps } from './renderers';

const PALETTE = ['#1096e7', '#45b7a8', '#e0a458', '#a78bfa', '#ef6f9b', '#6fae6f', '#0477c5'];
const AXIS = '#9aa1ab';
const GRID = '#edeff3';

type Row = Record<string, unknown>;

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // not raw JSON
  }
  const fence = /```(?:json)?\s*\n([\s\S]*?)```/.exec(text);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      // not JSON
    }
  }
  return undefined;
}

function toPayload(text: string, data: unknown): { type: string; rows: Row[] } | null {
  let value = data;
  if (value === undefined) {
    value = tryParseJson(text);
    if (value === undefined) {
      return null;
    }
  }
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    const envelope = value as { type?: unknown; data: unknown[] };
    return { type: String(envelope.type ?? 'bar').toLowerCase(), rows: envelope.data as Row[] };
  }
  if (Array.isArray(value)) {
    return { type: 'bar', rows: value as Row[] };
  }
  return null;
}

export function ChartRenderer({ text, data }: RendererProps) {
  const payload = toPayload(text, data);
  if (!payload || payload.rows.length === 0 || typeof payload.rows[0] !== 'object' || payload.rows[0] === null) {
    return <pre className={styles['text']}>{text}</pre>;
  }

  const { type, rows } = payload;
  const keys = Object.keys(rows[0]);
  const valueKeys = keys.filter((key) => rows.every((row) => typeof row[key] === 'number'));
  const categoryKey = keys.find((key) => !valueKeys.includes(key)) ?? keys[0];

  if (valueKeys.length === 0) {
    return <pre className={styles['text']}>{text}</pre>;
  }

  let chart: ReactElement;
  switch (type) {
    case 'pie':
    case 'donut': {
      chart = (
        <PieChart>
          <Tooltip />
          <Pie
            data={rows}
            dataKey={valueKeys[0]}
            nameKey={categoryKey}
            outerRadius="80%"
            innerRadius={type === 'donut' ? '55%' : 0}
          >
            {rows.map((row, index) => (
              <Cell key={index} fill={PALETTE[index % PALETTE.length]} />
            ))}
          </Pie>
        </PieChart>
      );
      break;
    }
    case 'line': {
      chart = (
        <LineChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey={categoryKey} stroke={AXIS} fontSize={11} />
          <YAxis stroke={AXIS} fontSize={11} />
          <Tooltip />
          {valueKeys.length > 1 && <Legend />}
          {valueKeys.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={PALETTE[index % PALETTE.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      );
      break;
    }
    case 'area': {
      chart = (
        <AreaChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey={categoryKey} stroke={AXIS} fontSize={11} />
          <YAxis stroke={AXIS} fontSize={11} />
          <Tooltip />
          {valueKeys.length > 1 && <Legend />}
          {valueKeys.map((key, index) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={PALETTE[index % PALETTE.length]}
              fill={PALETTE[index % PALETTE.length]}
              fillOpacity={0.25}
            />
          ))}
        </AreaChart>
      );
      break;
    }
    default: {
      chart = (
        <BarChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey={categoryKey} stroke={AXIS} fontSize={11} />
          <YAxis stroke={AXIS} fontSize={11} />
          <Tooltip />
          {valueKeys.length > 1 && <Legend />}
          {valueKeys.map((key, index) => (
            <Bar key={key} dataKey={key} fill={PALETTE[index % PALETTE.length]} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      );
    }
  }

  return (
    <div className={styles['chart']}>
      <ResponsiveContainer width="100%" height="100%">
        {chart}
      </ResponsiveContainer>
    </div>
  );
}
