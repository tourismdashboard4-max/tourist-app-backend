// client/src/pages/UpgradeStatusPage.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { FaCheckCircle, FaClock, FaTimesCircle } from 'react-icons/fa';

const UpgradeStatusPage = ({ setPage }) => {
  const { user, checkUpgradeStatus } = useAuth();
  const { theme } = useTheme();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    const data = await checkUpgradeStatus();
    setStatus(data);
    setLoading(false);
  };

  if (loading) {
    return <div>جاري التحميل...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>حالة طلب الترقية</h1>
      
      {!user?.guideData?.upgradeRequest ? (
        <div>
          <p>لم تقم بتقديم طلب ترقية بعد</p>
          <button onClick={() => setPage('guideRegister')}>
            تقديم طلب ترقية
          </button>
        </div>
      ) : (
        <div>
          <div>
            {user.guideData.upgradeRequest.status === 'pending' && (
              <>
                <FaClock color="#eab308" size={48} />
                <h3>قيد المراجعة</h3>
                <p>تم استلام طلبك وهو قيد المراجعة من قبل الإدارة</p>
              </>
            )}
            
            {user.guideData.upgradeRequest.status === 'approved' && (
              <>
                <FaCheckCircle color="#16a34a" size={48} />
                <h3>تمت الموافقة</h3>
                <p>تهانينا! أنت الآن مرشد سياحي معتمد</p>
                <button onClick={() => setPage('guideDashboard')}>
                  اذهب إلى لوحة التحكم
                </button>
              </>
            )}
            
            {user.guideData.upgradeRequest.status === 'rejected' && (
              <>
                <FaTimesCircle color="#dc2626" size={48} />
                <h3>تم الرفض</h3>
                <p>سبب الرفض: {user.guideData.upgradeRequest.rejectionReason}</p>
                <button onClick={() => setPage('guideRegister')}>
                  إعادة تقديم الطلب
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UpgradeStatusPage;