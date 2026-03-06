import React, { useState, useRef, useEffect } from 'react';
import { FaMicrophone, FaStop, FaPlay, FaPause, FaTrash } from 'react-icons/fa';

const VoiceMessage = ({ onSend, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  // بدء التسجيل
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setAudioBlob(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      // بدء المؤقت
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  // إيقاف التسجيل
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  // إعادة التسجيل
  const resetRecording = () => {
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingTime(0);
    audioChunksRef.current = [];
  };

  // تشغيل/إيقاف التسجيل الصوتي
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // تنظيف
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // تنسيق الوقت
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="voice-message-container" style={{
      position: 'absolute',
      bottom: '100px',
      left: '20px',
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 5px 20px rgba(0,0,0,0.2)',
      width: '300px',
      zIndex: 1000,
    }}>
      <h4 style={{ margin: '0 0 15px', color: '#333' }}>رسالة صوتية</h4>

      {!audioUrl ? (
        // وضع التسجيل
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: isRecording ? '#f44336' : '#667eea',
            margin: '0 auto 15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            animation: isRecording ? 'pulse 1s infinite' : 'none',
          }}
          onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? (
              <FaStop size={30} color="white" />
            ) : (
              <FaMicrophone size={30} color="white" />
            )}
          </div>

          {isRecording && (
            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f44336' }}>
                {formatTime(recordingTime)}
              </div>
              <div style={{ color: '#666', fontSize: '14px' }}>
                جاري التسجيل...
              </div>
            </div>
          )}

          {!isRecording && (
            <p style={{ color: '#666', marginBottom: '15px' }}>
              اضغط على الميكروفون لبدء التسجيل
            </p>
          )}
        </div>
      ) : (
        // معاينة التسجيل
        <div>
          <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
          }}>
            <button
              onClick={togglePlay}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#667eea',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isPlaying ? <FaPause /> : <FaPlay />}
            </button>

            <div style={{ flex: 1 }}>
              <div style={{
                height: '4px',
                background: '#e0e0e0',
                borderRadius: '2px',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: '0%',
                  background: '#667eea',
                  borderRadius: '2px',
                }} />
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '5px',
                fontSize: '11px',
                color: '#999',
              }}>
                <span>0:00</span>
                <span>{formatTime(recordingTime)}</span>
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '10px',
          }}>
            <button
              onClick={() => {
                onSend(audioBlob);
                onCancel();
              }}
              style={{
                flex: 1,
                padding: '10px',
                background: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              إرسال
            </button>
            <button
              onClick={resetRecording}
              style={{
                padding: '10px',
                background: '#f5f5f5',
                color: '#f44336',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <FaTrash />
            </button>
            <button
              onClick={onCancel}
              style={{
                padding: '10px',
                background: '#f5f5f5',
                color: '#666',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceMessage;