// helio-app/frontend/src/components/RamBars.tsx
import React from 'react';
import { BarChart, Bar, Cell, ResponsiveContainer } from 'recharts';
import type { SystemSnapshot } from '../types.ts';

interface Props {
  history: SystemSnapshot[];
}

export function RamBars({ history }: Props) {
  const data = history.slice(-12).map((s) => ({ v: s.mem.percent }));

  return (
    <div style={{ marginTop: '10px', height: '38px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap="20%">
          <Bar dataKey="v" radius={[2, 2, 0, 0]} isAnimationActive={false}>
            {data.map((_, i) => (
              <Cell key={i} fill="var(--violet)" opacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
