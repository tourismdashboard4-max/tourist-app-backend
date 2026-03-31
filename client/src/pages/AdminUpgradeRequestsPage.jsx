// client/src/pages/AdminUpgradeRequestsPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  FaArrowLeft, FaSpinner, FaUserPlus, FaCheckCircle, 
  FaTimesCircle, FaClock, FaEye, FaFileAlt, FaImage,
  FaEnvelope, FaPhone, FaCalendarAlt, FaTag, FaFlag,
  FaCheck, FaTimes, FaEdit, FaReply, FaDownload
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const AdminUpgradeRequestsPage = ({ setPage }) => {
  const { user, updateUser } = useAuth();
  const { language } = useLanguage();
  const lang = language;
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [incompleteMessage, setIncompleteMessage] = useState('');

  const t = (key) => {
    const texts = {
      ar: {
        title: 'طلبات الترقية إلى مرشد سياحي',
        subtitle: 'إدارة ومراجعة طلبات الترقية',
        back: 'رجوع',
        noRequests: 'لا توجد طلبات ترقية',
        pending: 'قيد المراجعة',
        approved: 'موافق عليه',
        rejected: 'مرفوض',
        approve: 'موافقة',
        reject: 'رفض',
        incomplete: 'استكمال',
        viewDetails: 'عرض التفاصيل',
        userInfo: 'معلومات المستخدم',
        requestInfo: 'معلومات الطلب',
        documents: 'المستندات',
        licenseDocument: 'وثيقة مزاولة المهنة',
        idDocument: 'صورة الهوية',
        rejectReason: 'سبب الرفض',
        incompleteMessage: 'ملاحظات الاستكمال',
        confirmReject: 'تأكيد الرفض',
        confirmIncomplete: 'تأكيد الاستكمال',
        cancel: 'إلغاء',
        confirm: 'تأكيد',
        approvedMessage: 'تمت الموافقة على طلب الترقية',
        rejectedMessage: 'تم رفض طلب الترقية',
        incompleteSent: 'تم إرسال طلب استكمال البيانات',
        error: 'حدث خطأ'
      },
      en: {
        title: 'Upgrade to Guide Requests',
        subtitle: 'Manage and review upgrade requests',
        back: 'Back',
        noRequests: 'No upgrade requests',
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
        approve: 'Approve',
        reject: 'Reject',
        incomplete: 'Incomplete',
        viewDetails: 'View Details',
        userInfo: 'User Information',
        requestInfo: 'Request Information',
        documents: 'Documents',
        licenseDocument: 'Professional License',
        idDocument: 'ID Document',
        rejectReason: 'Rejection Reason',
        incompleteMessage: 'Completion Notes',
        confirmReject: 'Confirm Rejection',
        confirmIncomplete: 'Confirm Incomplete',
        cancel: 'Cancel',
        confirm: 'Confirm',
        approvedMessage: 'Upgrade request approved',
        rejectedMessage: 'Upgrade request rejected',
        incompleteSent: 'Completion request sent',
        error: 'An error occurred'
      }
    };
    return texts[lang][key] || key;
  };

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'support') {
      fetchRequests();
    } else {
      toast.error('غير مصرح. يرجى تسجيل الدخول كمسؤول');
      setPage('profile');
    }
  }, [user]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://tourist-app-api.onrender.com/api/upgrade/upgrade-requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      console.log('📥 Upgrade requests response:', data);
      if (data.success && data.requests) {
        setRequests(data.requests);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ دالة الموافقة - تم تحديثها لتحديث حالة المستخدم بشكل كامل
  const handleApprove = async (request) => {
    if (!window.confirm('هل أنت متأكد من الموافقة على طلب الترقية؟')) return;
    
    setProcessingId(request.id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://tourist-app-api.onrender.com/api/upgrade/upgrade-requests/${request.id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          notes: 'تمت الموافقة من قبل المسؤول' 
        })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t('approvedMessage'));
        
        // ✅ تحديث المستخدم إذا كان المستخدم الحالي هو صاحب الطلب
        const currentUser = JSON.parse(localStorage.getItem('touristAppUser') || '{}');
        if (currentUser.id === request.user_id) {
          const updatedUser = { 
            ...currentUser, 
            role: 'guide', 
            type: 'guide', 
            isGuide: true,
            guide_status: 'approved'
          };
          
          // تحديث localStorage
          localStorage.setItem('touristAppUser', JSON.stringify(updatedUser));
          localStorage.setItem('userType', 'guide');
          
          // تحديث السياق
          if (updateUser) {
            updateUser(updatedUser);
          }
          
          toast.success('🎉 تم ترقية حسابك إلى مرشد سياحي!');
        }
        
        await fetchRequests();
        setSelectedRequest(null);
      } else {
        toast.error(data.message || t('error'));
      }
    } catch (error) {
      console.error('Error approving:', error);
      toast.error(t('error'));
    } finally {
      setProcessingId(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('الرجاء إدخال سبب الرفض');
      return;
    }
    
    setProcessingId(selectedRequest.id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://tourist-app-api.onrender.com/api/upgrade/upgrade-requests/${selectedRequest.id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: rejectReason })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t('rejectedMessage'));
        await fetchRequests();
        setSelectedRequest(null);
        setShowRejectModal(false);
        setRejectReason('');
      } else {
        toast.error(data.message || t('error'));
      }
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error(t('error'));
    } finally {
      setProcessingId(null);
    }
  };

  const confirmIncomplete = async () => {
    if (!incompleteMessage.trim()) {
      toast.error('الرجاء إدخال ملاحظات الاستكمال');
      return;
    }
    
    setProcessingId(selectedRequest.id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://tourist-app-api.onrender.com/api/notifications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: selectedRequest.user_id,
          title: 'طلب استكمال بيانات الترقية',
          message: `الرجاء استكمال البيانات التالية: ${incompleteMessage}`,
          type: 'upgrade_incomplete',
          data: JSON.stringify({ 
            requestId: selectedRequest.id,
            message: incompleteMessage 
          })
        })
      });
      
      if (response.ok) {
        toast.success(t('incompleteSent'));
        setShowIncompleteModal(false);
        setIncompleteMessage('');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'فشل إرسال طلب الاستكمال');
      }
    } catch (error) {
      console.error('Error sending incomplete:', error);
      toast.error(t('error'));
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return {
          icon: <FaClock className="text-yellow-400" />,
          text: t('pending'),
          color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
        };
      case 'approved':
        return {
          icon: <FaCheckCircle className="text-green-400" />,
          text: t('approved'),
          color: 'bg-green-500/20 text-green-400 border-green-500/30'
        };
      case 'rejected':
        return {
          icon: <FaTimesCircle className="text-red-400" />,
          text: t('rejected'),
          color: 'bg-red-500/20 text-red-400 border-red-500/30'
        };
      default:
        return {
          icon: <FaClock className="text-gray-400" />,
          text: t('pending'),
          color: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
        };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDocumentUrl = (filename) => {
    if (!filename) return null;
    if (filename.startsWith('http')) return filename;
    return `https://tourist-app-api.onrender.com/uploads/documents/${filename}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900 flex items-center justify-center">
        <FaSpinner className="animate-spin text-teal-400 text-4xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setPage('notifications')}
            className="p-2 hover:bg-white/20 rounded-xl transition"
          >
            <FaArrowLeft className="text-white" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
            <p className="text-white/60 text-sm">{t('subtitle')}</p>
          </div>
        </div>

        {/* Requests List */}
        {requests.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 text-center border border-white/20">
            <FaUserPlus className="text-5xl text-white/30 mx-auto mb-3" />
            <p className="text-white/60">{t('noRequests')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {requests.map((request) => {
              const statusBadge = getStatusBadge(request.status);
              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden hover:bg-white/15 transition cursor-pointer"
                  onClick={() => setSelectedRequest(request)}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 flex items-center justify-center">
                          <FaUserPlus className="text-white" />
                        </div>
                        <div>
                          <h3 className="text-white font-bold">
                            {request.full_name || `مستخدم ${request.user_id}`}
                          </h3>
                          <p className="text-white/50 text-xs flex items-center gap-1">
                            <FaEnvelope size={10} />
                            {request.email}
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs ${statusBadge.color}`}>
                        {statusBadge.icon}
                        <span>{statusBadge.text}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-white/70 mb-3">
                      <div>
                        <span className="text-white/50">رقم الهوية:</span>
                        <p className="text-white">{request.civil_id || 'غير متوفر'}</p>
                      </div>
                      <div>
                        <span className="text-white/50">رقم الرخصة:</span>
                        <p className="text-white">{request.license_number || 'غير متوفر'}</p>
                      </div>
                      <div>
                        <span className="text-white/50">سنوات الخبرة:</span>
                        <p className="text-white">{request.experience || 0} سنة</p>
                      </div>
                      <div>
                        <span className="text-white/50">التخصصات:</span>
                        <p className="text-white truncate">{request.specialties || 'غير محدد'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-white/40 mb-3">
                      <FaClock size={10} />
                      <span>{formatDate(request.created_at)}</span>
                    </div>

                    {request.status === 'pending' && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(request);
                          }}
                          disabled={processingId === request.id}
                          className="flex-1 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm transition flex items-center justify-center gap-2"
                        >
                          {processingId === request.id ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                          {t('approve')}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRequest(request);
                            setShowRejectModal(true);
                          }}
                          disabled={processingId === request.id}
                          className="flex-1 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition flex items-center justify-center gap-2"
                        >
                          <FaTimes />
                          {t('reject')}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRequest(request);
                            setShowIncompleteModal(true);
                          }}
                          disabled={processingId === request.id}
                          className="flex-1 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-sm transition flex items-center justify-center gap-2"
                        >
                          <FaEdit />
                          {t('incomplete')}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedRequest(null)}>
          <div className="bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-teal-600 to-cyan-600 p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-lg">تفاصيل طلب الترقية</h3>
                <button onClick={() => setSelectedRequest(null)} className="text-white/70 hover:text-white">
                  <FaTimesCircle />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {/* User Info */}
              <div className="bg-white/10 rounded-xl p-4">
                <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                  <FaUserPlus />
                  {t('userInfo')}
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-white/50">الاسم:</span> <span className="text-white">{selectedRequest.full_name}</span></div>
                  <div><span className="text-white/50">البريد:</span> <span className="text-white">{selectedRequest.email}</span></div>
                  <div><span className="text-white/50">رقم الجوال:</span> <span className="text-white">{selectedRequest.phone || 'غير متوفر'}</span></div>
                  <div><span className="text-white/50">تاريخ الطلب:</span> <span className="text-white">{formatDate(selectedRequest.created_at)}</span></div>
                </div>
              </div>

              {/* Request Info */}
              <div className="bg-white/10 rounded-xl p-4">
                <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                  <FaFileAlt />
                  {t('requestInfo')}
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-white/50">رقم الهوية:</span> <span className="text-white">{selectedRequest.civil_id || 'غير متوفر'}</span></div>
                  <div><span className="text-white/50">رقم الرخصة:</span> <span className="text-white">{selectedRequest.license_number || 'غير متوفر'}</span></div>
                  <div><span className="text-white/50">سنوات الخبرة:</span> <span className="text-white">{selectedRequest.experience || 0} سنة</span></div>
                  <div><span className="text-white/50">التخصصات:</span> <span className="text-white">{selectedRequest.specialties || 'غير محدد'}</span></div>
                </div>
                {selectedRequest.bio && (
                  <div className="mt-2">
                    <span className="text-white/50 text-sm">نبذة:</span>
                    <p className="text-white text-sm mt-1">{selectedRequest.bio}</p>
                  </div>
                )}
              </div>

              {/* Documents */}
              {(selectedRequest.license_document || selectedRequest.id_document) && (
                <div className="bg-white/10 rounded-xl p-4">
                  <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                    <FaImage />
                    {t('documents')}
                  </h4>
                  <div className="space-y-3">
                    {selectedRequest.license_document && (
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-white/70 text-sm mb-2 flex items-center gap-2">
                          <FaFileAlt />
                          {t('licenseDocument')}
                        </p>
                        <a 
                          href={getDocumentUrl(selectedRequest.license_document)} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-2 px-3 py-2 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 rounded-lg text-sm transition"
                        >
                          <FaDownload size={12} />
                          عرض المستند
                        </a>
                      </div>
                    )}
                    {selectedRequest.id_document && (
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-white/70 text-sm mb-2 flex items-center gap-2">
                          <FaImage />
                          {t('idDocument')}
                        </p>
                        <a 
                          href={getDocumentUrl(selectedRequest.id_document)} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-2 px-3 py-2 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 rounded-lg text-sm transition"
                        >
                          <FaDownload size={12} />
                          عرض الصورة
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions if pending */}
              {selectedRequest.status === 'pending' && (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => handleApprove(selectedRequest)}
                    disabled={processingId === selectedRequest.id}
                    className="flex-1 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition flex items-center justify-center gap-2"
                  >
                    {processingId === selectedRequest.id ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                    {t('approve')}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={processingId === selectedRequest.id}
                    className="flex-1 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition flex items-center justify-center gap-2"
                  >
                    <FaTimes />
                    {t('reject')}
                  </button>
                  <button
                    onClick={() => setShowIncompleteModal(true)}
                    disabled={processingId === selectedRequest.id}
                    className="flex-1 py-3 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition flex items-center justify-center gap-2"
                  >
                    <FaEdit />
                    {t('incomplete')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowRejectModal(false)}>
          <div className="bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900 rounded-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 rounded-t-2xl">
              <h3 className="text-white font-bold text-lg">{t('confirmReject')}</h3>
            </div>
            <div className="p-6">
              <label className="block text-white/70 mb-2">{t('rejectReason')}</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-red-400"
                rows="3"
                placeholder="الرجاء إدخال سبب الرفض..."
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={confirmReject}
                  disabled={processingId === selectedRequest?.id}
                  className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                >
                  {processingId === selectedRequest?.id ? <FaSpinner className="animate-spin mx-auto" /> : t('confirm')}
                </button>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                    setSelectedRequest(null);
                  }}
                  className="flex-1 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Incomplete Modal */}
      {showIncompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowIncompleteModal(false)}>
          <div className="bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900 rounded-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 p-4 rounded-t-2xl">
              <h3 className="text-white font-bold text-lg">{t('confirmIncomplete')}</h3>
            </div>
            <div className="p-6">
              <label className="block text-white/70 mb-2">{t('incompleteMessage')}</label>
              <textarea
                value={incompleteMessage}
                onChange={(e) => setIncompleteMessage(e.target.value)}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-yellow-400"
                rows="3"
                placeholder="الرجاء إدخال ملاحظات استكمال البيانات..."
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={confirmIncomplete}
                  disabled={processingId === selectedRequest?.id}
                  className="flex-1 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
                >
                  {processingId === selectedRequest?.id ? <FaSpinner className="animate-spin mx-auto" /> : t('confirm')}
                </button>
                <button
                  onClick={() => {
                    setShowIncompleteModal(false);
                    setIncompleteMessage('');
                    setSelectedRequest(null);
                  }}
                  className="flex-1 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUpgradeRequestsPage;
