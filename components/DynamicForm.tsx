import React, { useState } from 'react';
import { ColumnConfig } from '../types';
import { Upload, X } from 'lucide-react';
import { gasService } from '../services/gasService';

interface DynamicFormProps {
  config: ColumnConfig[];
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({ config, initialData = {}, onSubmit, onCancel, isSubmitting }) => {
  const [formData, setFormData] = useState<any>(initialData);
  const [uploading, setUploading] = useState(false);

  const handleChange = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    if (e.target.files && e.target.files[0]) {
      setUploading(true);
      try {
        const url = await gasService.uploadFile(e.target.files[0]);
        handleChange(key, url);
      } catch (error) {
        alert("Upload failed");
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {config.filter(c => !c.hidden && c.key !== 'id').map((col) => {
          return (
            <div key={col.key} className={col.type === 'textarea' || col.type === 'file' ? "md:col-span-2" : ""}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {col.label} {col.required && <span className="text-red-500">*</span>}
              </label>
              
              {col.type === 'select' ? (
                <select
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={formData[col.key] || ''}
                  onChange={(e) => handleChange(col.key, e.target.value)}
                  required={col.required}
                >
                  <option value="">-- Chọn {col.label} --</option>
                  {col.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : col.type === 'textarea' ? (
                <textarea
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  rows={3}
                  value={formData[col.key] || ''}
                  onChange={(e) => handleChange(col.key, e.target.value)}
                  required={col.required}
                />
              ) : col.type === 'file' ? (
                <div className="flex items-center space-x-2">
                  <label className="cursor-pointer bg-white border border-gray-300 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center">
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? "Đang tải lên..." : "Chọn tệp"}
                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, col.key)} disabled={uploading} />
                  </label>
                  {formData[col.key] && (
                    <span className="text-sm text-green-600 truncate max-w-xs">
                      Đã tải lên
                    </span>
                  )}
                </div>
              ) : (
                <input
                  type={col.type}
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={formData[col.key] || ''}
                  onChange={(e) => handleChange(col.key, e.target.value)}
                  required={col.required}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          disabled={isSubmitting}
        >
          Hủy bỏ
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center"
          disabled={isSubmitting || uploading}
        >
          {isSubmitting ? 'Đang lưu...' : 'Lưu dữ liệu'}
        </button>
      </div>
    </form>
  );
};