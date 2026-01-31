import React, { useState } from 'react';
import { X, ExternalLink, Download, AlertCircle, Loader } from 'lucide-react';

interface ImagePreviewModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ imageUrl, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Reset state when imageUrl changes
  React.useEffect(() => {
    setLoading(true);
    setError(false);
  }, [imageUrl]);

  if (!imageUrl) return null;

  // Helper to detect Drive ID
  const getDriveId = (url: string) => {
    const idMatch = url.match(/\/d\/([^/]+)/);
    return idMatch ? idMatch[1] : null;
  };

  const driveId = getDriveId(imageUrl);
  
  // Strategy: 
  // 1. If it's a Google Drive link, use the /preview endpoint in an iframe. 
  //    This works better than /view or direct image links due to CORS/Auth.
  // 2. If it's a direct image link (not drive), use <img>.
  
  const isDrive = !!driveId;
  const previewUrl = isDrive 
    ? `https://drive.google.com/file/d/${driveId}/preview`
    : imageUrl;

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 transition-opacity duration-300"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-5xl h-[85vh] flex flex-col items-center justify-center bg-gray-900 rounded-lg overflow-hidden border border-gray-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <span className="text-white/90 text-sm font-medium px-2 drop-shadow-md">
            Xem trước minh chứng
          </span>
          <div className="flex space-x-2 pointer-events-auto">
            <a 
              href={imageUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="p-2 bg-white/10 text-white rounded-full hover:bg-white/30 transition-colors backdrop-blur-md"
              title="Mở link gốc / Tải về"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={20} />
            </a>
            <button 
              onClick={onClose}
              className="p-2 bg-white/10 text-white rounded-full hover:bg-red-500/80 transition-colors backdrop-blur-md"
              title="Đóng"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Container */}
        <div className="w-full h-full flex items-center justify-center relative bg-gray-900">
          
          {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-white/50 z-0">
               <Loader className="animate-spin mr-2" /> Đang tải...
            </div>
          )}

          {error ? (
             <div className="text-center p-6 text-white max-w-md z-10">
               <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
               <h3 className="text-lg font-semibold mb-2">Không thể tải bản xem trước</h3>
               <p className="text-gray-400 text-sm mb-4">
                 File có thể bị giới hạn quyền truy cập hoặc định dạng không hỗ trợ xem nhanh trên trình duyệt.
               </p>
               <a 
                 href={imageUrl} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
               >
                 <Download size={18} className="mr-2" /> Mở link gốc
               </a>
             </div>
          ) : (
            <>
              {isDrive ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0 z-10 bg-white"
                  onLoad={() => setLoading(false)}
                  onError={() => setError(true)}
                  allow="autoplay"
                  title="File Preview"
                />
              ) : (
                <img 
                  src={previewUrl} 
                  alt="Minh chứng" 
                  className="max-w-full max-h-full object-contain z-10"
                  onLoad={() => setLoading(false)}
                  onError={() => setError(true)}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
