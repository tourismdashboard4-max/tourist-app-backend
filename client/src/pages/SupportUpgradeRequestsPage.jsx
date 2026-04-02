// client/src/pages/SupportUpgradeRequestsPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  FaArrowLeft, FaSpinner, FaUserPlus, FaCheckCircle, 
  FaTimesCircle, FaClock, FaEye, FaFileAlt, FaImage,
  FaEnvelope, FaPhone, FaCalendarAlt, FaTag, FaFlag,
  FaCheck, FaTimes, FaEdit, FaReply, FaTicketAlt
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const SupportUpgradeRequestsPage = ({ setPage }) => {
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
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected

  const t = (key) => {
    const texts = {
      ar: {
        title: 'طلبات الترقية إلى مرشد سياحي',
        subtitle: 'إدارة ومراجعة طلبات الترقية المقدمة من المستخدمين',
        back: 'رجوع',
        noRequests: 'لا توجد طلبات ترقية',
        pending: 'قيد المراجعة',
        approved: 'موافق عليه',
        rejected: 'مرفوض',
        all: 'الكل',
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
        approvedMessage: '✅ تمت الموافقة على طلب الترقية',
        rejectedMessage: '❌ تم رفض طلب الترقية',
        incompleteSent: '📝 تم إرسال طلب استكمال البيانات',
        error: 'حدث خطأ',
        fullName: 'الاسم الكامل',
        email: 'البريد الإلكتروني',
        phone: 'رقم الجوال',
        civilId: 'رقم الهوية',
        licenseNumber: 'رقم الرخصة',
        experience: 'سنوات الخبرة',
        specialties: 'التخصصات',
        requestDate: 'تاريخ الطلب',
        stats: 'الإحصائيات',
        totalRequests: 'إجمالي الطلبات',
        pendingRequests: 'قيد المراجعة',
        approvedRequests: 'الموافق عليها',
        rejectedRequests: 'المرفوضة'
      },
      en: {
        title: 'Upgrade to Guide Requests',
        subtitle: 'Manage and review upgrade requests from users',
        back: 'Back',
        noRequests: 'No upgrade requests',
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
        all: 'All',
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
        approvedMessage: '✅ Upgrade request approved',
        rejectedMessage: '❌ Upgrade request rejected',
        incompleteSent: '📝 Completion request sent',
        error: 'An error occurred',
        fullName: 'Full Name',
        email: 'Email',
        phone: 'Phone Number',
        civilId: 'Civil ID',
        licenseNumber: 'License Number',
        experience: 'Years of Experience',
        specialties: 'Specialties',
        requestDate: 'Request Date',
        stats: 'Statistics',
        totalRequests: 'Total Requests',
        pendingRequests: 'Pending',
        approvedRequests: 'Approved',
        rejectedRequests: 'Rejected'
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
        
        if (user?.id === request.user_id) {
          const updatedUser = { ...user, role: 'guide', guide_status: 'approved', isGuide: true };
          if (updateUser) updateUser(updatedUser);
          localStorage.setItem('touristAppUser', JSON.stringify(updatedUser));
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
      await fetch(`https://tourist-app-api.onrender.com/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: selectedRequest.user_id,
          title: 'طلب استكمال بيانات الترقية',
          message: `الرجاء استكمال البيانات التالية: ${incompleteMessage}`,
          type: 'upgrade_incomplete'
        })
      });
      toast.success(t('incompleteSent'));
      setShowIncompleteModal(false);
      setIncompleteMessage('');
      setSelectedRequest(null);
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
    return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // حساب الإحصائيات
  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length
  };

  // فلترة الطلبات
  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

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
            onClick={() => setPage('profile')}
            className="p-2 hover:bg-white/20 rounded-xl transition"
          >
            <FaArrowLeft className="text-white text-xl" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
              <FaUserPlus className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
              <p className="text-white/50 text-sm">{t('subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-white/50">{t('totalRequests')}</div>
          </div>
          <div className="bg-yellow-500/20 backdrop-blur-sm rounded-xl p-3 text-center border border-yellow-500/30">
            <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
            <div className="text-xs text-white/50">{t('pendingRequests')}</div>
          </div>
          <div className="bg-green-500/20 backdrop-blur-sm rounded-xl p-3 text-center border border-green-500/30">
            <div className="text-2xl font-bold text-green-400">{stats.approved}</div>
            <div className="text-xs text-white/50">{t('approvedRequests')}</div>
          </div>
          <div className="bg-red-500/20 backdrop-blur-sm rounded-xl p-3 text-center border border-red-500/30">
            <div className="text-2xl font-bold text-red-400">{stats.rejected}</div>
            <div className="text-xs text-white/50">{t('rejectedRequests')}</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 bg-white/10 rounded-xl p-1">
          {[
            { key: 'all', label: t('all'), icon: FaUserPlus },
            { key: 'pending', label: t('pending'), icon: FaClock },
            { key: 'approved', label: t('approved'), icon: FaCheckCircle },
            { key: 'rejected', label: t('rejected'), icon: FaTimesCircle }
          ].map(status => {
            const Icon = status.icon;
            return (
              <button
                key={status.key}
                onClick={() => setFilter(status.key)}
                className={`flex-1 py-2 rounded-lg text-sm transition flex items-center justify-center gap-2 ${
                  filter === status.key
                    ? 'bg-teal-500 text-white'
                    : 'text-white/70 hover:bg-white/10'
                }`}
              >
                <Icon size={14} />
                <span>{status.label}</span>
                {status.key !== 'all' && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    filter === status.key ? 'bg-white/20' : 'bg-white/10'
                  }`}>
                    {status.key === 'pending' ? stats.pending : status.key === 'approved' ? stats.approved : stats.rejected}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 text-center border border-white/20">
            <FaUserPlus className="text-5xl text-white/30 mx-auto mb-3" />
            <p className="text-white/60">{t('noRequests')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredRequests.map((request) => {
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
                            {request.email || 'غير متوفر'}
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
                        <span className="text-white/50">{t('civilId')}:</span>
                        <p className="text-white">{request.civil_id || 'غير متوفر'}</p>
                      </div>
                      <div>
                        <span className="text-white/50">{t('licenseNumber')}:</span>
                        <p className="text-white">{request.license_number || 'غير متوفر'}</p>
                      </div>
                      <div>
                        <span className="text-white/50">{t('experience')}:</span>
                        <p className="text-white">{request.experience || 0} سنة</p>
                      </div>
                      <div>
                        <span className="text-white/50">{t('specialties')}:</span>
                        <p className="text-white truncate">{request.specialties || 'غير محدد'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-white/40 mb-3">
                      <FaCalendarAlt size={10} />
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
                <div className="flex items-center gap-2">
                  <FaTicketAlt className="text-white" />
                  <h3 className="text-white font-bold text-lg">تفاصيل طلب الترقية</h3>
                </div>
                <button onClick={() => setSelectedRequest(null)} className="text-white/70 hover:text-white">
                  <FaTimesCircle size={20} />
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
                  <div><span className="text-white/50">{t('fullName')}:</span> <span className="text-white">{selectedRequest.full_name || 'غير متوفر'}</span></div>
                  <div><span className="text-white/50">{t('email')}:</span> <span className="text-white">{selectedRequest.email || 'غير متوفر'}</span></div>
                  <div><span className="text-white/50">{t('phone')}:</span> <span className="text-white">{selectedRequest.phone || 'غير متوفر'}</span></div>
                  <div><span className="text-white/50">{t('requestDate')}:</span> <span className="text-white">{formatDate(selectedRequest.created_at)}</span></div>
                </div>
              </div>

              {/* Request Info */}
              <div className="bg-white/10 rounded-xl p-4">
                <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                  <FaFileAlt />
                  {t('requestInfo')}
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-white/50">{t('civilId')}:</span> <span className="text-white">{selectedRequest.civil_id || 'غير متوفر'}</span></div>
                  <div><span className="text-white/50">{t('licenseNumber')}:</span> <span className="text-white">{selectedRequest.license_number || 'غير متوفر'}</span></div>
                  <div><span className="text-white/50">{t('experience')}:</span> <span className="text-white">{selectedRequest.experience || 0} سنة</span></div>
                  <div><span className="text-white/50">{t('specialties')}:</span> <span className="text-white">{selectedRequest.specialties || 'غير محدد'}</span></div>
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
                  <div className="space-y-2">
                    {selectedRequest.license_document && (
                      <div>
                        <p className="text-white/70 text-sm">{t('licenseDocument')}</p>
                        <a href={selectedRequest.license_document} target="_blank" rel="noopener noreferrer" className="text-teal-400 underline text-sm break-all">عرض المستند</a>
                      </div>
                    )}
                    {selectedRequest.id_document && (
                      <div>
                        <p className="text-white/70 text-sm">{t('idDocument')}</p>
                        <a href={selectedRequest.id_document} target="_blank" rel="noopener noreferrer" className="text-teal-400 underline text-sm break-all">عرض الصورة</a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status Info if not pending */}
              {selectedRequest.status !== 'pending' && selectedRequest.admin_notes && (
                <div className={`rounded-xl p-4 ${selectedRequest.status === 'approved' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  <h4 className="font-bold mb-2 flex items-center gap-2 text-white">
                    {selectedRequest.status === 'approved' ? <FaCheckCircle /> : <FaTimesCircle />}
                    {selectedRequest.status === 'approved' ? 'ملاحظات الموافقة' : 'سبب الرفض'}
                  </h4>
                  <p className="text-white/80 text-sm">{selectedRequest.admin_notes || selectedRequest.reason}</p>
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

export default SupportUpgradeRequestsPage;
