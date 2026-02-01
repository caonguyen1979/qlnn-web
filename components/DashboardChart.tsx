import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { LeaveRequest, Status, SystemConfigData } from '../types';
import { Users, School, Calendar, TrendingUp, Award } from 'lucide-react';

interface DashboardChartProps {
  allData: LeaveRequest[];
  systemConfig: SystemConfigData;
  selectedWeek: number;
}

export const DashboardChart: React.FC<DashboardChartProps> = ({ allData, systemConfig, selectedWeek }) => {
  // Local state for analysis range
  const [fromWeek, setFromWeek] = useState<number>(1);
  const [toWeek, setToWeek] = useState<number>(systemConfig.currentWeek || 1);

  // Get list of available weeks from data
  const availableWeeks = useMemo(() => {
    const weeks = new Set<number>();
    weeks.add(1);
    if (systemConfig.currentWeek) weeks.add(Number(systemConfig.currentWeek));
    allData.forEach(item => { if (item.week) weeks.add(Number(item.week)); });
    return Array.from(weeks).sort((a, b) => a - b);
  }, [allData, systemConfig]);

  // Data filtered by the global selected week (for original charts)
  const currentWeekData = useMemo(() => 
    allData.filter(r => Number(r.week) === selectedWeek), 
  [allData, selectedWeek]);

  // Data filtered by analysis range (for new list statistics)
  const rangeFilteredData = useMemo(() => {
    return allData.filter(r => 
      r.status === Status.APPROVED && 
      Number(r.week) >= fromWeek && 
      Number(r.week) <= toWeek
    );
  }, [allData, fromWeek, toWeek]);

  // Original Chart 1: Status (for current week)
  const statusCounts = [
    { name: Status.APPROVED, value: currentWeekData.filter(r => r.status === Status.APPROVED).length, color: '#198754' },
    { name: Status.PENDING, value: currentWeekData.filter(r => r.status === Status.PENDING).length, color: '#ffc107' },
    { name: Status.REJECTED, value: currentWeekData.filter(r => r.status === Status.REJECTED).length, color: '#dc3545' },
  ];

  // List 1: Absences by Class (Sorted Desc)
  const classStats = useMemo(() => {
    const statsMap = new Map<string, number>();
    // Initialize with 0 to ensure all config classes are considered if they have data
    rangeFilteredData.forEach(r => {
      const cls = r.class || 'Khác';
      statsMap.set(cls, (statsMap.get(cls) || 0) + 1);
    });

    return Array.from(statsMap.entries())
      .map(([name, count]) => ({ name, count }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [rangeFilteredData]);

  // List 2: Top 10 Students (Sorted Desc)
  const studentStats = useMemo(() => {
    const statsMap = new Map<string, { count: number, class: string }>();
    rangeFilteredData.forEach(r => {
      const key = `${r.studentName}|${r.class}`;
      const current = statsMap.get(key) || { count: 0, class: r.class };
      statsMap.set(key, { count: current.count + 1, class: r.class });
    });

    return Array.from(statsMap.entries())
      .map(([key, info]) => ({
        name: key.split('|')[0],
        class: info.class,
        count: info.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [rangeFilteredData]);

  const maxClassCount = classStats.length > 0 ? Math.max(...classStats.map(s => s.count)) : 1;
  const maxStudentCount = studentStats.length > 0 ? Math.max(...studentStats.map(s => s.count)) : 1;

  return (
    <div className="space-y-8 pb-12">
      {/* SECTION 1: GLOBAL CHARTS (Current Week) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-2 mb-4">
             <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><TrendingUp size={20}/></div>
             <h3 className="text-lg font-bold text-gray-800">Trạng thái đơn (Tuần {selectedWeek})</h3>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusCounts}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusCounts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
           <div className="flex items-center space-x-2 mb-4">
             <div className="p-2 bg-green-50 text-green-600 rounded-lg"><School size={20}/></div>
             <h3 className="text-lg font-bold text-gray-800">Lượt vắng theo lớp (Tuần {selectedWeek})</h3>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classStats.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Lượt vắng" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION 2: RANGE ANALYSIS LISTS */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden no-print">
        {/* Sub-header with range filter */}
        <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-extrabold text-gray-800 flex items-center space-x-2">
              <span>Phân tích dữ liệu vắng học</span>
            </h3>
            <p className="text-sm text-gray-500">Thống kê chi tiết theo khoảng thời gian tùy chọn</p>
          </div>
          
          <div className="flex items-center space-x-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center px-3 space-x-2">
              <Calendar size={16} className="text-gray-400" />
              <span className="text-xs font-bold text-gray-400 uppercase">Từ</span>
              <select 
                className="text-sm font-semibold outline-none bg-transparent"
                value={fromWeek}
                onChange={e => setFromWeek(Number(e.target.value))}
              >
                {availableWeeks.map(w => <option key={w} value={w}>Tuần {w}</option>)}
              </select>
            </div>
            <div className="w-px h-6 bg-gray-200"></div>
            <div className="flex items-center px-3 space-x-2">
              <span className="text-xs font-bold text-gray-400 uppercase">Đến</span>
              <select 
                className="text-sm font-semibold outline-none bg-transparent"
                value={toWeek}
                onChange={e => setToWeek(Number(e.target.value))}
              >
                {availableWeeks.map(w => <option key={w} value={w}>Tuần {w}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
          
          {/* LIST 1: CLASSES */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
               <div className="flex items-center space-x-2">
                 <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><School size={18}/></div>
                 <h4 className="font-bold text-gray-700">Xếp hạng vắng theo lớp</h4>
               </div>
               <span className="text-xs font-medium text-gray-400 italic">Tổng: {classStats.length} lớp</span>
            </div>
            
            <div className="space-y-4">
              {classStats.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-sm">Không có dữ liệu lượt vắng trong khoảng này</div>
              ) : (
                classStats.map((item, idx) => (
                  <div key={item.name} className="group">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-gray-600 group-hover:text-primary transition-colors">
                        {idx + 1}. {item.name}
                      </span>
                      <span className="text-sm font-black text-gray-800">{item.count} lượt</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${(item.count / maxClassCount) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* LIST 2: TOP STUDENTS */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
               <div className="flex items-center space-x-2">
                 <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Award size={18}/></div>
                 <h4 className="font-bold text-gray-700">Top 10 học sinh vắng nhiều nhất</h4>
               </div>
               <Users size={16} className="text-gray-300" />
            </div>

            <div className="space-y-3">
              {studentStats.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-sm">Không có dữ liệu học sinh vắng</div>
              ) : (
                studentStats.map((item, idx) => (
                  <div key={`${item.name}-${item.class}`} className="flex items-center space-x-4 p-3 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100 group">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0
                      ${idx === 0 ? 'bg-yellow-100 text-yellow-700 shadow-sm border border-yellow-200' : 
                        idx === 1 ? 'bg-gray-100 text-gray-600' : 
                        idx === 2 ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-400'}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate group-hover:text-primary">{item.name}</p>
                      <p className="text-xs text-gray-500">Lớp {item.class}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-gray-900">{item.count}</div>
                      <div className="text-[10px] text-gray-400 uppercase font-bold">Lần vắng</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
