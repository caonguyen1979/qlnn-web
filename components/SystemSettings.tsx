import React, { useState, useEffect } from 'react';
import { SystemConfigData } from '../types';
import { Save } from 'lucide-react';
import { gasService } from '../services/gasService';

interface SystemSettingsProps {
  config: SystemConfigData;
  onRefresh: () => void;
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({ config, onRefresh }) => {
  // Use local string state for textareas to allow free typing (including trailing commas)
  const [schoolName, setSchoolName] = useState(config.schoolName || '');
  const [classesStr, setClassesStr] = useState(config.classes?.join(', ') || '');
  const [reasonsStr, setReasonsStr] = useState(config.reasons?.join(', ') || '');
  const [loading, setLoading] = useState(false);

  // Sync with prop changes (e.g. after refresh)
  useEffect(() => {
    setSchoolName(config.schoolName || '');
    setClassesStr(config.classes?.join(', ') || '');
    setReasonsStr(config.reasons?.join(', ') || '');
  }, [config]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Parse strings back to arrays
      const classes = classesStr.split(',').map(s => s.trim()).filter(s => s !== '');
      const reasons = reasonsStr.split(',').map(s => s.trim()).filter(s => s !== '');

      const newConfig: SystemConfigData = {
        schoolName,
        classes,
        reasons
      };

      await gasService.saveSystemConfig(newConfig);
      alert('Đã lưu cấu hình thành công!');
      onRefresh();
    } catch (e) {
      alert('Lỗi khi lưu: ' + e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-800 text-lg">Thiết lập chung</h3>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 hover:bg-green-700 disabled:opacity-50"
        >
          <Save size={16} /> <span>{loading ? 'Đang lưu...' : 'Lưu cấu hình'}</span>
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tên trường / Đơn vị</label>
          <input 
            type="text" 
            className="w-full border rounded-lg px-3 py-2 outline-none focus:border-primary"
            value={schoolName}
            onChange={e => setSchoolName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Danh sách Lớp học <span className="text-gray-400 font-normal">(Phân cách bằng dấu phẩy)</span>
          </label>
          <textarea 
            rows={3}
            className="w-full border rounded-lg px-3 py-2 outline-none focus:border-primary"
            value={classesStr}
            onChange={e => setClassesStr(e.target.value)}
            placeholder="Ví dụ: 10A1, 10A2, 10A3..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Danh sách Lý do nghỉ <span className="text-gray-400 font-normal">(Phân cách bằng dấu phẩy)</span>
          </label>
          <textarea 
             rows={3}
             className="w-full border rounded-lg px-3 py-2 outline-none focus:border-primary"
             value={reasonsStr}
             onChange={e => setReasonsStr(e.target.value)}
             placeholder="Ví dụ: Ốm đau, Việc riêng..."
           />
        </div>
      </div>
    </div>
  );
};
