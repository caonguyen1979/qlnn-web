import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Download, AlertCircle, Loader, RotateCw } from 'lucide-react';

interface ImagePreviewModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ imageUrl, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setRotation(0);
  }, [imageUrl]);

  if (!imageUrl) return null;

  const getDriveId = (url: string) => {
    const idMatch = url.match(/\/d\/([^/]+)/);
    return idMatch ? idMatch[1] : null;
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const driveId = getDriveId(imageUrl);
  const isDrive = !!driveId;
  const previewUrl = isDrive 
    ? `https://drive.google.com/file/d/${driveId}/preview`
    : imageUrl;

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-sm p-2 transition-opacity duration-300"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-6xl h-[90vh] flex flex-col items-center justify-center bg-gray-950 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center p-4 bg-gradient-to-b from-black/90 to-transparent pointer-events-none">
          <div className="flex items-center space-x-2">
            <span className="text-white/90 text-sm font-bold px-3 py-1 bg-white/10 rounded-full backdrop-blur-md border border-white/5 shadow-lg drop-shadow-md">
              Minh chứng đính kèm
            </span>
          </div>
          <div className="flex space-x-2 pointer-events-auto">
            {!isDrive && (
              <button 
                onClick={handleRotate}
                className="p-2.5 bg-white/10 text-white rounded-full hover:bg-white/30 transition-all border border-white/10 active:scale-95"
                title="Xoay ảnh 90°"
              >
                <RotateCw size={22} />
              </button>
            )}
            <a 
              href={imageUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="p-2.5 bg-white/10 text-white rounded-full hover:bg-white/30 transition-all border border-white/10 active:scale-95"
              title="Xem trực tiếp"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={22} />
            </a>
            <button 
              onClick={onClose}
              className="p-2.5 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/80 hover:text-white transition-all border border-red-500/30 active:scale-95"
              title="Đóng"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Content Container */}
        <div className="w-full h-full flex items-center justify-center relative bg-gray-950 p-6">
          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 z-0">
               <Loader className="animate-spin mb-2" size={32} />
               <span className="text-sm font-medium">Đang tải minh chứng...</span>
            </div>
          )}

          {error ? (
             <div className="text-center p-8 text-white max-w-md z-10 bg-gray-900/50 rounded-2xl border border-gray-800 backdrop-blur-sm">
               <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
               <h3 className="text-xl font-bold mb-2">Không thể xem nhanh</h3>
               <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                 Tệp tin này có thể bị hạn chế quyền hoặc không được trình duyệt hỗ trợ xem trực tiếp.
               </p>
               <a 
                 href={imageUrl} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="inline-flex items-center px-6 py-3 bg-primary hover:bg-blue-600 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95"
               >
                 <Download size={20} className="mr-2" /> Mở trong tab mới
               </a>
             </div>
          ) : (
            <div 
              className="w-full h-full flex items-center justify-center transition-transform duration-300 ease-out"
              style={{ transform: !isDrive ? `rotate(${rotation}deg)` : 'none' }}
            >
              {isDrive ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0 rounded-lg shadow-2xl bg-white"
                  onLoad={() => setLoading(false)}
                  onError={() => setError(true)}
                  allow="autoplay"
                  title="File Preview"
                />
              ) : (
                <img 
                  src={previewUrl} 
                  alt="Minh chứng" 
                  className="max-w-full max-h-full object-contain shadow-2xl rounded-sm"
                  onLoad={() => setLoading(false)}
                  onError={() => setError(true)}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
