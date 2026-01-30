import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { LeaveRequest, Status } from '../types';

interface DashboardChartProps {
  data: LeaveRequest[];
}

export const DashboardChart: React.FC<DashboardChartProps> = ({ data }) => {
  // Aggregate data for Status
  const statusCounts = [
    { name: Status.APPROVED, value: data.filter(r => r.status === Status.APPROVED).length, color: '#198754' },
    { name: Status.PENDING, value: data.filter(r => r.status === Status.PENDING).length, color: '#ffc107' },
    { name: Status.REJECTED, value: data.filter(r => r.status === Status.REJECTED).length, color: '#dc3545' },
  ];

  // Aggregate data for Class
  const classMap = new Map<string, number>();
  data.forEach(r => {
    const cls = r.class || 'Khác';
    classMap.set(cls, (classMap.get(cls) || 0) + 1);
  });
  const classData = Array.from(classMap.entries()).map(([key, value]) => ({ name: key, count: value }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Status Chart */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Thống kê theo trạng thái</h3>
        <div className="h-64 min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusCounts}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
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

      {/* Class Chart */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Thống kê theo lớp</h3>
        <div className="h-64 min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={classData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#0d6efd" radius={[4, 4, 0, 0]} name="Số lượng" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
