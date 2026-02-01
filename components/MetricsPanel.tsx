import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { LungMetrics, TimePoint, ViewMode } from '../types';
import { ArrowDown, ArrowUp, Activity, Wind, AlertCircle } from 'lucide-react';

interface MetricsPanelProps {
  currentPoint: TimePoint;
  timeline: TimePoint[];
  viewMode: ViewMode;
}

const MetricsPanel: React.FC<MetricsPanelProps> = ({ currentPoint, timeline, viewMode }) => {
  
  // Transform timeline for charts
  const volumeData = timeline.map(tp => ({
    name: tp.label,
    volume: tp.metrics.totalVolume,
    stiffness: tp.metrics.stiffnessIndex,
    expansion: tp.metrics.expansionRatio * 100
  }));

  const lobeData = [
    { name: 'R-Upper', value: currentPoint.metrics.lobeVolumes.rul },
    { name: 'R-Middle', value: currentPoint.metrics.lobeVolumes.rml },
    { name: 'R-Lower', value: currentPoint.metrics.lobeVolumes.rll },
    { name: 'L-Upper', value: currentPoint.metrics.lobeVolumes.lul },
    { name: 'L-Lower', value: currentPoint.metrics.lobeVolumes.lll },
  ];

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Wind size={16} />
            <span>Total Volume</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {(currentPoint.metrics.totalVolume / 1000).toFixed(2)} L
          </div>
          <div className="text-xs text-rose-400 flex items-center mt-1">
            <ArrowDown size={12} className="mr-1" />
            12% from baseline
          </div>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Activity size={16} />
            <span>Stiffness Index</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {currentPoint.metrics.stiffnessIndex.toFixed(1)}
          </div>
           <div className="text-xs text-rose-400 flex items-center mt-1">
            <ArrowUp size={12} className="mr-1" />
            Critical Increase
          </div>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <AlertCircle size={16} />
            <span>Air Trapping</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {currentPoint.metrics.airTrapping}%
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Moderate Severity
          </div>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <span>Expansion Ratio</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {currentPoint.metrics.expansionRatio.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Reduced compliance
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Longitudinal Trend */}
        <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700">
          <h3 className="text-slate-300 font-medium mb-4">
            {viewMode === ViewMode.DOCTOR ? 'Longitudinal Volume & Stiffness' : 'Lung Capacity Over Time'}
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData}>
                <defs>
                  <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorStiff" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b'}} />
                <YAxis stroke="#64748b" tick={{fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9'}}
                  itemStyle={{color: '#fff'}}
                />
                <Area 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="#06b6d4" 
                  fillOpacity={1} 
                  fill="url(#colorVol)" 
                  name="Volume (mL)"
                />
                {viewMode === ViewMode.DOCTOR && (
                   <Area 
                   type="monotone" 
                   dataKey="stiffness" 
                   stroke="#f43f5e" 
                   fillOpacity={1} 
                   fill="url(#colorStiff)" 
                   name="Stiffness Idx"
                   yAxisId={0}
                 />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lobar Breakdown */}
        {viewMode === ViewMode.DOCTOR && (
          <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700">
            <h3 className="text-slate-300 font-medium mb-4">Lobar Volumetric Distribution</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lobeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" hide />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} tick={{fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: '#1e293b'}}
                    contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9'}}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {lobeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index > 1 && index < 3 ? '#6366f1' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-500 mt-2 italic">
              Note: Right Lower Lobe (RLL) shows maximal volume loss compared to baseline.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricsPanel;
