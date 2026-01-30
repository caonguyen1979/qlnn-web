import React, { useState } from 'react';
import { SystemConfigData } from '../types';
import { Save } from 'lucide-react';
import { gasService } from '../services/gasService';

interface SystemSettingsProps {
  config: SystemConfigData;
  onRefresh: () => void;
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({ config, onRefresh }) => {
  const [localConfig, setLocalConfig] = useState<SystemConfigData>(config);
  const [loading, setLoading] = useState(false);

  const handleArrayChange = (key: string, valueStr: string) => {
    // Split by comma and trim
    const arr = valueStr.split(',').map(s => s.trim()).filter(s => s !== '');
    setLocalConfig(prev => ({ ...prev, [key]: arr }));
  };

  const handleTextChange = (key: string, value: string) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await gasService.saveSystemConfig(localConfig);
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
            value={localConfig.schoolName || ''}
            onChange={e => handleTextChange('schoolName', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Danh sách Lớp học <span className="text-gray-400 font-normal">(Phân cách bằng dấu phẩy)</span>
          </label>
          <textarea 
            rows={3}
            className="w-full border rounded-lg px-3 py-2 outline-none focus:border-primary"
            value={localConfig.classes?.join(', ') || ''}
            onChange={e => handleArrayChange('classes', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Danh sách Lý do nghỉ <span className="text-gray-400 font-normal">(Phân cách bằng dấu phẩy)</span>
          </label>
          <textarea 
             rows={3}
             className="w-full border rounded-lg px-3 py-2 outline-none focus:border-primary"
             value={localConfig.reasons?.join(', ') || ''}
             onChange={e => handleArrayChange('reasons', e.target.value)}
           />
        </div>
      </div>
    </div>
  );
};
