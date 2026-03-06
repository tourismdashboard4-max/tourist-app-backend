import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaCloudUploadAlt, FaFile, FaTimes, FaCheck } from 'react-icons/fa';

const FileUpload = ({ onSelect, onClose }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  const onDrop = useCallback((acceptedFiles) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile({
        file: selectedFile,
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc', '.docx'],
      'text/plain': ['.txt'],
    },
  });

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    // محاكاة رفع الملف
    setTimeout(() => {
      setUploading(false);
      setUploadComplete(true);
      
      // إرسال الملف
      setTimeout(() => {
        onSelect(file);
      }, 1000);
    }, 2000);
  };

  return (
    <div className="file-upload-container">
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
      }}>
        {/* رأس النافذة */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}>
          <h4 style={{ margin: 0, color: '#333' }}>رفع ملف</h4>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#666',
            }}
          >
            <FaTimes />
          </button>
        </div>

        {!file ? (
          // منطقة السحب والإفلات
          <div
            {...getRootProps()}
            className="file-upload-area"
            style={{
              border: `2px dashed ${isDragActive ? '#667eea' : '#ddd'}`,
              background: isDragActive ? '#e8f0fe' : '#f9f9f9',
            }}
          >
            <input {...getInputProps()} />
            <FaCloudUploadAlt className="file-upload-icon" />
            <p className="file-upload-text">
              {isDragActive ? 'أفلت الملف هنا' : 'اسحب وأفلت الملف هنا'}
            </p>
            <p className="file-upload-hint">أو اضغط للاختيار</p>
            <p className="file-upload-hint">الحد الأقصى: 5MB</p>
          </div>
        ) : (
          // معاينة الملف
          <div className="file-preview">
            <FaFile className="file-preview-icon" />
            <div className="file-preview-info">
              <div className="file-preview-name">{file.name}</div>
              <div className="file-preview-size">{formatFileSize(file.size)}</div>
            </div>
            {uploadComplete ? (
              <FaCheck style={{ color: '#4caf50' }} />
            ) : (
              <button 
                className="file-preview-remove"
                onClick={() => setFile(null)}
              >
                <FaTimes />
              </button>
            )}
          </div>
        )}

        {/* أزرار الإجراءات */}
        {file && !uploadComplete && (
          <div style={{
            display: 'flex',
            gap: '10px',
            marginTop: '15px',
          }}>
            <button
              onClick={handleUpload}
              disabled={uploading}
              style={{
                flex: 1,
                padding: '10px',
                background: uploading ? '#ccc' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: uploading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {uploading ? 'جاري الرفع...' : 'رفع الملف'}
            </button>
            <button
              onClick={() => setFile(null)}
              disabled={uploading}
              style={{
                padding: '10px 20px',
                background: '#f5f5f5',
                color: '#666',
                border: 'none',
                borderRadius: '8px',
                cursor: uploading ? 'not-allowed' : 'pointer',
              }}
            >
              إلغاء
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;