// ===================== 👤 Profile Page (المُصلحة بالكامل + إضافة الرصيد) =====================
function ProfilePage({ lang, user, setPage, setShowLogin, onLogout, onUpdateUser }) {
  const [userData, setUserData] = useState(user || null);
  const [isEditing, setIsEditing] = useState(false);
  const [showProfileContent, setShowProfileContent] = useState(false);
  const [editData, setEditData] = useState({ fullName: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [phoneVerificationStep, setPhoneVerificationStep] = useState('idle');
  const [tempPhone, setTempPhone] = useState('');
  const [countdown, setCountdown] = useState(0);

  // --- إضافة الرصيد ---
  const [balance, setBalance] = useState(user?.balance || 0);
  const [showAddBalance, setShowAddBalance] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [addBalanceLoading, setAddBalanceLoading] = useState(false);
  // -------------------

  useEffect(() => {
    if (user) {
      setUserData(user);
      setEditData({ fullName: user.fullName || '', phone: user.phone || '' });
      let avatarUrl = user.avatar;
      if (avatarUrl && !avatarUrl.startsWith('http')) avatarUrl = `${API_BASE_URL}${avatarUrl}`;
      setAvatarPreview(avatarUrl);
      setBalance(user.balance ?? 0); // مزامنة الرصيد
    }
  }, [user]);

  useEffect(() => { if (userData) localStorage.setItem('user', JSON.stringify(userData)); }, [userData]);

  useEffect(() => { if (countdown > 0) { const timer = setTimeout(() => setCountdown(countdown - 1), 1000); return () => clearTimeout(timer); } }, [countdown]);

  const handleEditToggle = () => { setIsEditing(!isEditing); setShowVerificationInput(false); setPhoneVerificationStep('idle'); };
  useEffect(() => { if (!isEditing && userData) setEditData({ fullName: userData.fullName || '', phone: userData.phone || '' }); }, [isEditing, userData]);
  const handleInputChange = (e) => { const { name, value } = e.target; setEditData(prev => ({ ...prev, [name]: value })); };

  const handleVerifyPhone = async () => {
    const phoneNumber = editData.phone;
    if (!phoneNumber || phoneNumber === 'غير مضاف') { alert(lang === 'ar' ? '❌ الرجاء إدخال رقم الجوال أولاً' : '❌ Please enter your phone number first'); return; }
    const saudiPhoneRegex = /^(05|5)[0-9]{8}$|^\+9665[0-9]{8}$/;
    if (!saudiPhoneRegex.test(phoneNumber.replace(/\s/g, ''))) { alert(lang === 'ar' ? '❌ رقم الجوال غير صحيح' : '❌ Invalid phone number'); return; }
    setPhoneVerificationStep('sending'); setTempPhone(phoneNumber);
    try {
      const response = await api.sendPhoneVerification(userData.id, phoneNumber);
      if (response.success) { setPhoneVerificationStep('sent'); setShowVerificationInput(true); setCountdown(60); alert(lang === 'ar' ? `📱 تم إرسال رمز التحقق إلى ${phoneNumber}` : `📱 Verification code sent to ${phoneNumber}`); }
      else { setPhoneVerificationStep('idle'); alert(lang === 'ar' ? '❌ فشل إرسال الرمز' : '❌ Failed to send code'); }
    } catch (error) { console.error(error); setPhoneVerificationStep('idle'); alert(lang === 'ar' ? '❌ خطأ في الاتصال' : '❌ Connection error'); }
  };
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length < 4) { alert(lang === 'ar' ? '❌ الرجاء إدخال الرمز' : '❌ Please enter code'); return; }
    setPhoneVerificationStep('verifying');
    try {
      const response = await api.verifyPhoneCode(userData.id, tempPhone, verificationCode);
      if (response.success) {
        const updatedUser = { ...userData, phone: tempPhone, phoneVerified: true };
        setUserData(updatedUser);
        if (onUpdateUser) onUpdateUser(updatedUser);
        setEditData(prev => ({ ...prev, phone: tempPhone }));
        setPhoneVerificationStep('verified'); setShowVerificationInput(false);
        alert(lang === 'ar' ? '✅ تم التحقق بنجاح' : '✅ Verified successfully');
      } else { setPhoneVerificationStep('sent'); alert(lang === 'ar' ? '❌ رمز غير صحيح' : '❌ Invalid code'); }
    } catch (error) { console.error(error); setPhoneVerificationStep('sent'); alert(lang === 'ar' ? '❌ خطأ في التحقق' : '❌ Verification error'); }
  };
  const handleResendCode = () => { if (countdown > 0) return; handleVerifyPhone(); };
  const handleSaveProfile = async () => {
    setSaveLoading(true);
    try {
      const response = await api.updateUserProfile(userData.id, { fullName: editData.fullName });
      if (response.success) {
        const updatedUser = { ...userData, fullName: editData.fullName };
        setUserData(updatedUser);
        if (onUpdateUser) onUpdateUser(updatedUser);
        setIsEditing(false);
        alert(lang === 'ar' ? '✅ تم تحديث الاسم' : '✅ Name updated');
      }
    } catch (error) { console.error(error); alert(lang === 'ar' ? '❌ فشل التحديث' : '❌ Update failed'); } finally { setSaveLoading(false); }
  };

  // --- دالة إضافة الرصيد ---
  const handleAddBalance = async () => {
    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount <= 0) {
      alert(lang === 'ar' ? '⚠️ الرجاء إدخال مبلغ صحيح أكبر من 0' : '⚠️ Please enter a valid amount > 0');
      return;
    }
    setAddBalanceLoading(true);
    try {
      const response = await api.addBalance(userData.id, amount);
      if (response.success) {
        const newBalance = response.newBalance;
        setBalance(newBalance);
        const updatedUser = { ...userData, balance: newBalance };
        setUserData(updatedUser);
        if (onUpdateUser) onUpdateUser(updatedUser);
        alert(lang === 'ar' ? `✅ تمت إضافة ${amount} ريال بنجاح. الرصيد الحالي: ${newBalance}` : `✅ Added ${amount} SAR successfully. New balance: ${newBalance}`);
        setShowAddBalance(false);
        setAddAmount('');
      } else {
        alert(lang === 'ar' ? '❌ فشل إضافة الرصيد' : '❌ Failed to add balance');
      }
    } catch (error) {
      console.error(error);
      alert(lang === 'ar' ? '❌ خطأ في الاتصال' : '❌ Connection error');
    } finally {
      setAddBalanceLoading(false);
    }
  };
  // -------------------------

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert(lang === 'ar' ? '⚠️ حجم الصورة كبير جداً (حد أقصى 2 ميجابايت)' : '⚠️ Image too large (max 2MB)'); e.target.value = ''; return; }
    if (!file.type.startsWith('image/')) { alert(lang === 'ar' ? '⚠️ الرجاء اختيار صورة' : '⚠️ Please select an image'); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (event) => setAvatarPreview(event.target.result);
    reader.readAsDataURL(file);
    const formData = new FormData(); formData.append('avatar', file);
    setLoading(true);
    try {
      const response = await api.uploadAvatar(userData.id, formData);
      if (response.success && response.avatarUrl) {
        let fullUrl = response.avatarUrl;
        if (!fullUrl.startsWith('http')) fullUrl = `https://tourist-app-api.onrender.com${fullUrl}`;
        const updatedUser = { ...userData, avatar: fullUrl };
        setUserData(updatedUser); setAvatarPreview(fullUrl);
        if (onUpdateUser) onUpdateUser(updatedUser);
        alert(lang === 'ar' ? '✅ تم تحديث الصورة' : '✅ Picture updated');
      } else throw new Error(response.message || 'Upload failed');
    } catch (error) { console.error(error); alert(lang === 'ar' ? '❌ فشل رفع الصورة' : '❌ Upload failed'); setAvatarPreview(userData?.avatar || null); } finally { setLoading(false); e.target.value = ''; }
  };

  const handleDeleteAvatar = async () => {
    if (!confirm(lang === 'ar' ? '⚠️ هل أنت متأكد من حذف الصورة؟' : '⚠️ Delete picture?')) return;
    setLoading(true);
    try {
      const response = await api.deleteAvatar(userData.id);
      if (response.success) {
        const updatedUser = { ...userData, avatar: null };
        setUserData(updatedUser); setAvatarPreview(null);
        if (onUpdateUser) onUpdateUser(updatedUser);
        alert(lang === 'ar' ? '✅ تم حذف الصورة' : '✅ Picture deleted');
      }
    } catch (error) { console.error(error); alert(lang === 'ar' ? '❌ فشل الحذف' : '❌ Delete failed'); } finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('user'); localStorage.removeItem('token'); localStorage.removeItem('userType');
    setUserData(null);
    if (onLogout) onLogout();
    setPage('home');
  };
  const toggleProfileContent = () => setShowProfileContent(!showProfileContent);
  const navigateToSettings = () => setPage('settings');
  const navigateToNotifications = () => setPage('notifications');
  const navigateToMyTrips = () => alert(lang === 'ar' ? '📅 صفحة رحلاتي - قيد التطوير' : '📅 My Trips - Coming soon');

  const renderProfileContent = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-4">
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 flex items-center justify-between"><h3 className="text-white font-bold text-lg">{lang === 'ar' ? 'الملف الشخصي' : 'Profile'}</h3><button onClick={toggleProfileContent} className="text-white/80 hover:text-white">✕</button></div>
      <div className="p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative group">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-white dark:border-gray-800 shadow-md overflow-hidden">
              {avatarPreview ? <img src={avatarPreview} alt={userData.fullName} className="w-full h-full object-cover" /> : (userData.fullName?.charAt(0) || 'U')}
            </div>
            <button onClick={() => document.getElementById('avatar-upload').click()} className="absolute -bottom-1 -right-1 bg-green-600 text-white p-1.5 rounded-full hover:bg-green-700 transition shadow-md" disabled={loading}><Camera size={14} /></button>
            {avatarPreview && <button onClick={handleDeleteAvatar} className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition shadow-md w-6 h-6 flex items-center justify-center text-xs" disabled={loading}>✕</button>}
            <input type="file" id="avatar-upload" className="hidden" accept="image/jpeg,image/png,image/jpg,image/gif,image/webp" onChange={handleAvatarChange} />
          </div>
          <div className="flex-1"><h4 className="text-lg font-bold text-gray-800 dark:text-white">{userData.fullName}</h4><p className="text-sm text-gray-500 dark:text-gray-400">{lang === 'ar' ? 'عضو منذ ' : 'Member since '}{new Date(userData.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</p></div>
        </div>
        {loading && <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center"><div className="inline-flex items-center gap-2 text-blue-600"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div><span>{lang === 'ar' ? 'جاري المعالجة...' : 'Processing...'}</span></div></div>}
        <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4 mb-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"><div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"><Mail size={16} className="text-green-600 dark:text-green-400" /></div><div className="flex-1"><p className="text-xs text-gray-500 dark:text-gray-400">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</p><p className="text-sm font-medium text-gray-800 dark:text-white">{userData.email}</p></div></div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"><div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"><Phone size={16} className="text-green-600 dark:text-green-400" /></div><div className="flex-1"><p className="text-xs text-gray-500 dark:text-gray-400">{lang === 'ar' ? 'رقم الجوال' : 'Phone'}</p><div className="flex items-center justify-between"><p className="text-sm font-medium text-gray-800 dark:text-white">{userData.phone || (lang === 'ar' ? 'غير مضاف' : 'Not added')}</p>{userData.phone && userData.phoneVerified && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✓ {lang === 'ar' ? 'موثق' : 'Verified'}</span>}</div></div></div>
          
          {/* ------------------- قسم الرصيد ------------------- */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <DollarSign size={16} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">{lang === 'ar' ? 'الرصيد' : 'Balance'}</p>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-800 dark:text-white">{balance} ريال</p>
                <button 
                  onClick={() => setShowAddBalance(!showAddBalance)}
                  className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full hover:bg-green-200"
                >
                  {lang === 'ar' ? 'شحن' : 'Add'}
                </button>
              </div>
              {showAddBalance && (
                <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-200">
                  <input
                    type="number"
                    placeholder={lang === 'ar' ? 'المبلغ (ريال)' : 'Amount (SAR)'}
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    className="w-full p-2 border rounded-lg mb-2 dark:bg-gray-700"
                    min="1"
                    step="1"
                  />
                  <button
                    onClick={handleAddBalance}
                    disabled={addBalanceLoading}
                    className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {addBalanceLoading ? (lang === 'ar' ? 'جاري...' : 'Processing...') : (lang === 'ar' ? 'تأكيد الشحن' : 'Confirm')}
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* ------------------------------------------------- */}
        </div>
        <button onClick={handleEditToggle} className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 text-sm font-medium"><Edit2 size={18} />{isEditing ? (lang === 'ar' ? 'إلغاء' : 'Cancel') : (lang === 'ar' ? 'تعديل الملف الشخصي' : 'Edit Profile')}</button>
        {isEditing && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3 border border-green-200 dark:border-green-800">
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{lang === 'ar' ? 'تعديل البيانات' : 'Edit Data'}</h4>
            <input type="text" name="fullName" value={editData.fullName} onChange={handleInputChange} placeholder={lang === 'ar' ? 'الاسم الكامل' : 'Full Name'} className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500" />
            <div className="space-y-2">
              <div className="flex gap-2"><input type="tel" name="phone" value={editData.phone} onChange={handleInputChange} placeholder={lang === 'ar' ? 'رقم الجوال (05xxxxxxxx)' : 'Phone (05xxxxxxxx)'} className="flex-1 p-3 border rounded-lg dark:bg-gray-700 dark:text-white" dir="ltr" />{editData.phone && editData.phone !== userData.phone && <button onClick={handleVerifyPhone} disabled={phoneVerificationStep === 'sending' || phoneVerificationStep === 'verifying'} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap">{phoneVerificationStep === 'sending' ? (lang === 'ar' ? 'جاري...' : 'Sending...') : (lang === 'ar' ? 'تحقق' : 'Verify')}</button>}</div>
              {showVerificationInput && <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{lang === 'ar' ? `تم إرسال الرمز إلى ${tempPhone}` : `Code sent to ${tempPhone}`}</p><div className="flex gap-2"><input type="text" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder={lang === 'ar' ? 'أدخل الرمز' : 'Enter code'} className="flex-1 p-2 border rounded-lg text-center" maxLength="6" /><button onClick={handleVerifyCode} disabled={phoneVerificationStep === 'verifying'} className="px-4 py-2 bg-green-600 text-white rounded-lg">{phoneVerificationStep === 'verifying' ? '...' : (lang === 'ar' ? 'تأكيد' : 'Confirm')}</button></div><div className="mt-2 text-center"><button onClick={handleResendCode} disabled={countdown > 0} className="text-sm text-blue-600 hover:underline disabled:text-gray-400">{countdown > 0 ? (lang === 'ar' ? `إعادة الإرسال بعد ${countdown} ث` : `Resend in ${countdown}s`) : (lang === 'ar' ? 'إعادة إرسال الرمز' : 'Resend code')}</button></div></div>}
            </div>
            <button onClick={handleSaveProfile} disabled={saveLoading} className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">{saveLoading ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ الاسم' : 'Save Name')}</button>
          </div>
        )}
      </div>
    </div>
  );

  if (!userData) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 pb-20">
        <div className="bg-gradient-to-b from-green-500 to-emerald-600 p-6 text-white"><div className="flex items-center mb-4"><div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center ml-4"><User size={32} /></div><div><h1 className="text-xl font-bold">{lang === 'ar' ? 'زائر' : 'Guest'}</h1><p className="text-white/80">{lang === 'ar' ? 'مستكشف' : 'Explorer'}</p></div></div></div>
        <div className="p-4"><button onClick={() => setShowLogin(true)} className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition">{lang === 'ar' ? 'تسجيل الدخول' : 'Login'}</button></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="bg-gradient-to-b from-green-500 to-emerald-600 p-6 text-white"><h1 className="text-2xl font-bold">{lang === 'ar' ? `مرحباً، ${userData.fullName?.split(' ')[0]}` : `Welcome, ${userData.fullName?.split(' ')[0]}`}</h1><p className="text-white/80 mt-1">{lang === 'ar' ? 'استعرض وأدر حسابك من هنا' : 'View and manage your account'}</p></div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button onClick={toggleProfileContent} className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-2 hover:scale-105 ${showProfileContent ? 'ring-2 ring-green-500' : ''}`}><div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center"><User size={24} className="text-white" /></div><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{lang === 'ar' ? 'الملف الشخصي' : 'Profile'}</span></button>
          <button onClick={navigateToMyTrips} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-2 hover:scale-105"><div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center"><Package size={24} className="text-white" /></div><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{lang === 'ar' ? 'رحلاتي' : 'My Trips'}</span></button>
          <button onClick={navigateToNotifications} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-2 hover:scale-105"><div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center"><Bell size={24} className="text-white" /></div><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{lang === 'ar' ? 'الإشعارات' : 'Notifications'}</span></button>
          <button onClick={navigateToSettings} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-2 hover:scale-105"><div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center"><Settings size={24} className="text-white" /></div><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{lang === 'ar' ? 'الإعدادات' : 'Settings'}</span></button>
        </div>
        {showProfileContent && renderProfileContent()}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md mb-4"><h3 className="font-bold text-gray-800 dark:text-white mb-3">{lang === 'ar' ? 'المساعدة والدعم' : 'Help & Support'}</h3><div className="space-y-2"><button className="flex items-center justify-between w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition"><span className="text-gray-700 dark:text-gray-300 flex items-center gap-3"><FileText size={18} className="text-purple-600" />{lang === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'}</span><span className="text-gray-400">‹</span></button></div></div>
        <button onClick={handleLogout} className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition flex items-center justify-center gap-2"><LogOut size={18} />{lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}</button>
      </div>
    </div>
  );
}


// ===================== ⚙️ Settings Page (معدل زر الوضع الليلي) =====================
function SettingsPage({ lang, dark, setDark, setLang, setPage, locationEnabled, setLocationEnabled }) {
  const t = (k) => LOCALES[lang][k] || k;
  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      <div className="flex items-center mb-6"><button onClick={() => setPage("profile")} className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm ml-4"><span className="text-xl dark:text-white">‹</span></button><h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t("settings")}</h1></div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b dark:border-gray-700"><div className="flex items-center justify-between"><div><h3 className="font-medium text-gray-800 dark:text-white">{t("darkMode")}</h3><p className="text-sm text-gray-500 dark:text-gray-400">مريح للعين في الإضاءة المنخفضة</p></div><button onClick={() => setDark()} className={`w-12 h-6 rounded-full relative transition-colors ${dark ? "bg-green-600" : "bg-gray-300"}`}><div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${dark ? "right-0.5" : "left-0.5"}`}></div></button></div></div>
        <div className="p-4 border-b dark:border-gray-700"><div className="flex items-center justify-between"><div><h3 className="font-medium text-gray-800 dark:text-white">{t("locationSharing")}</h3><p className="text-sm text-gray-500 dark:text-gray-400">مشاركة موقعك لعرض البرامج القريبة</p></div><button onClick={() => setLocationEnabled(!locationEnabled)} className={`w-12 h-6 rounded-full relative transition-colors ${locationEnabled ? "bg-green-600" : "bg-gray-300"}`}><div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${locationEnabled ? "right-0.5" : "left-0.5"}`}></div></button></div></div>
        <div className="p-4 border-b dark:border-gray-700"><div className="flex items-center justify-between"><h3 className="font-medium text-gray-800 dark:text-white">{t("language")}</h3><select value={lang} onChange={(e) => setLang(e.target.value)} className="border rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"><option value="ar">العربية</option><option value="en">English</option></select></div></div>
        <div className="p-4"><h3 className="font-medium text-gray-800 dark:text-white mb-3">حول التطبيق</h3><div className="space-y-2"><div className="flex items-center justify-between w-full p-2"><span className="text-gray-700 dark:text-gray-300">الإصدار</span><span className="text-gray-500 dark:text-gray-400">1.0.0</span></div><button className="flex items-center justify-between w-full p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition"><span className="text-gray-700 dark:text-gray-300">الشروط والأحكام</span><span className="text-gray-400">‹</span></button><button className="flex items-center justify-between w-full p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition"><span className="text-gray-700 dark:text-gray-300">سياسة الخصوصية</span><span className="text-gray-400">‹</span></button></div></div>
      </div>
    </div>
  );
}

// ===================== 🚨 صفحة الطوارئ =====================
function EmergencyPage({ setPage, user }) {
  const emergencyNumbers = [
    { name: "الشرطة", number: "999", icon: "📞", color: "bg-blue-100 dark:bg-blue-900/30", textColor: "text-blue-700 dark:text-blue-300" },
    { name: "الإسعاف", number: "997", icon: "🚑", color: "bg-red-100 dark:bg-red-900/30", textColor: "text-red-700 dark:text-red-300" },
    { name: "الدفاع المدني", number: "998", icon: "🔥", color: "bg-orange-100 dark:bg-orange-900/30", textColor: "text-orange-700 dark:text-orange-300" },
    { name: "النجدة", number: "911", icon: "🚨", color: "bg-purple-100 dark:bg-purple-900/30", textColor: "text-purple-700 dark:text-purple-300" }
  ];
  const handleCall = (number) => { window.location.href = `tel:${number}`; };
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-4 pb-20">
      <div className="flex items-center mb-6"><button onClick={() => setPage('home')} className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-md ml-4 transition hover:bg-gray-100 dark:hover:bg-gray-700"><span className="text-xl dark:text-white">‹</span></button><h1 className="text-2xl font-bold text-gray-800 dark:text-white">🚨 خدمات الطوارئ</h1></div>
      <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl p-4 mb-6"><p className="text-red-700 dark:text-red-300 text-sm font-medium">⚠️ في حالات الطوارئ الخطيرة، اتصل فوراً على الأرقام أدناه.</p></div>
      <div className="grid gap-4">
        {emergencyNumbers.map((item, idx) => (
          <button key={idx} onClick={() => handleCall(item.number)} className={`${item.color} rounded-xl p-4 shadow-sm hover:shadow-md transition transform hover:scale-[1.02] active:scale-98`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4"><span className="text-3xl">{item.icon}</span><div className="text-right"><h3 className={`font-bold text-lg ${item.textColor}`}>{item.name}</h3><p className={`text-2xl font-mono font-bold ${item.textColor}`}>{item.number}</p></div></div>
              <span className="text-gray-500 dark:text-gray-400 text-sm">📞 اتصل</span>
            </div>
          </button>
        ))}
      </div>
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"><h3 className="font-bold text-gray-800 dark:text-white mb-2">💡 نصائح مهمة</h3><ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400"><li>• حافظ على هدوئك وقدم معلومات دقيقة للمسؤول.</li><li>• حدد موقعك بوضوح (استخدم تطبيق الخرائط إذا أمكن).</li><li>• لا تتصل برقم الطوارئ إلا للحالات الخطيرة.</li><li>• أخبر شخصاً قريباً منك بحالتك إن أمكن.</li></ul></div>
    </div>
  );
}
// ===================== 👑 شريط المسؤولين (معدل – أنحف وأصغر) =====================
function AdminTopBar({ setPage, lang, unreadCount }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user?.role === 'admin';
  const isSupport = user?.role === 'support';
  const showAdminBar = isAdmin || isSupport;
  if (!showAdminBar) return null;

  return (
    <div className="bg-gradient-to-r from-teal-600 to-cyan-600 py-0.5 px-2 flex justify-center gap-1.5 shadow-md relative z-10">
      <button
        onClick={() => setPage('adminNotifications')}
        className="relative flex items-center justify-center w-7 h-7 bg-white/20 rounded-full hover:bg-white/30 transition"
        title={lang === 'ar' ? 'الإشعارات' : 'Notifications'}
      >
        <Bell size={14} className="text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      <button
        onClick={() => setPage('adminSupport')}
        className="px-2 py-0.5 bg-white text-teal-700 rounded-full text-[11px] font-bold shadow-md hover:bg-gray-100 transition flex items-center gap-1"
      >
        📧 {lang === 'ar' ? 'تذاكر الدعم' : 'Support Tickets'}
      </button>
      {isAdmin && (
        <button
          onClick={() => setPage('upgrade-requests')}
          className="px-2 py-0.5 bg-white text-teal-700 rounded-full text-[11px] font-bold shadow-md hover:bg-gray-100 transition flex items-center gap-1"
        >
          ⭐ {lang === 'ar' ? 'طلبات الترقية' : 'Upgrade Requests'}
        </button>
      )}
    </div>
  );
}
// ===================== 📱 Main App Component (المعدل نهائياً - رفع المحتوى للأعلى) =====================
export function TouristAppPrototype() {
  const { user: authUser, logout: authLogout, updateUser: authUpdateUser } = useAuth();
  const { darkMode: dark, toggleDarkMode } = useTheme();

  const [lang, setLang] = useState("ar");
  const [showLogin, setShowLogin] = useState(false);
  const [page, setPage] = useState("home");
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [userPrograms, setUserPrograms] = useState([]);
  const mapContainerRef = useRef(null);
  const [transport, setTransport] = useState("driving");
  const [refreshMap, setRefreshMap] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatType, setChatType] = useState(null);
  const [guideUnreadCount, setGuideUnreadCount] = useState(0);
  const pollingRef = useRef(null);
  const prevGuideUnreadCountRef = useRef(0);

  const user = authUser;
  const isGuide = user?.isGuide === true || user?.role === 'guide' || user?.type === 'guide' || user?.guide_status === 'approved';

  // ✅ دالة مساعدة لإنشاء تذكرة guide_chat جديدة (احتياطي)
  const createChatTicket = useCallback(async (touristId, guideId, touristName, guideName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://tourist-app-api.onrender.com/api/support/tickets', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'guide_chat',
          user_id: touristId,
          metadata: { guideId, guideName, created_by_name: touristName, created_by_id: touristId },
          subject: `محادثة بين ${touristName} والمرشد ${guideName}`,
          status: 'open',
          priority: 'normal'
        })
      });
      const data = await response.json();
      return data.success ? data.ticket : null;
    } catch (error) { console.error(error); return null; }
  }, []);

  // ✅ دالة محسنة لفتح المحادثة من الإشعار – تفتح DirectChatPage لكل المستخدمين
  const openChatFromNotification = useCallback(async (notification) => {
    console.log('🔔 Opening chat from notification:', notification);
    
    const isGuideChatNotif = notification.type === 'GUIDE_CHAT' ||
                            notification.type === 'guide_chat' ||
                            notification.type === 'guide_chat_message' ||
                            notification.type === 'new_message';

    if (isGuideChatNotif) {
      const currentUserId = user?.id ? String(user.id) : null;
      let otherPartyId = notification.userId || notification.data?.userId ||
                         notification.data?.created_by_id || notification.data?.senderId;
      let otherPartyName = notification.userName || notification.data?.userName ||
                           notification.data?.fromName || notification.data?.created_by_name ||
                           (lang === 'ar' ? 'مستخدم' : 'User');
      let ticketId = notification.ticketId || notification.data?.ticketId;
      if (!ticketId && notification.action_url) {
        const match = notification.action_url.match(/\d+/);
        if (match) ticketId = match[0];
      }
      
      if (!otherPartyId && ticketId) {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`https://tourist-app-api.onrender.com/api/support/tickets/${ticketId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.status === 404) {
            toast.error(lang === 'ar' ? 'هذه المحادثة لم تعد موجودة' : 'This conversation no longer exists');
            if (notification.id && !String(notification.id).startsWith('ticket_')) {
              try { await api.deleteNotification(notification.id); } catch(e) {}
            }
            return;
          }
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.ticket) {
              const ticket = data.ticket;
              if (ticket.user_id && (!currentUserId || String(ticket.user_id) !== currentUserId)) {
                otherPartyId = ticket.user_id;
                otherPartyName = ticket.user_name || (lang === 'ar' ? 'مستخدم' : 'User');
              } else if (ticket.metadata?.created_by_id && (!currentUserId || String(ticket.metadata.created_by_id) !== currentUserId)) {
                otherPartyId = ticket.metadata.created_by_id;
                otherPartyName = ticket.metadata.created_by_name || (lang === 'ar' ? 'مسافر' : 'Traveler');
              } else if (ticket.metadata?.guideId && (!currentUserId || String(ticket.metadata.guideId) !== currentUserId)) {
                otherPartyId = ticket.metadata.guideId;
                otherPartyName = ticket.metadata.guideName || (lang === 'ar' ? 'مرشد' : 'Guide');
              } else if (ticket.sender_id && (!currentUserId || String(ticket.sender_id) !== currentUserId)) {
                otherPartyId = ticket.sender_id;
              }
            }
          }
        } catch (err) {
          console.error('Error fetching ticket for notification:', err);
        }
      }
      
      if (otherPartyId) {
        localStorage.setItem('directChatParams', JSON.stringify({
          recipientId: otherPartyId,
          recipientName: otherPartyName,
          recipientType: 'tourist',
          ticketId: ticketId || null
        }));
        setPage('directChat');
      } else {
        toast.error(lang === 'ar' ? 'تعذر تحديد الطرف الآخر للمحادثة' : 'Cannot identify the other party');
      }
      return;
    }
    
    let ticketId = null;
    let type = 'support';
    let userName = null;
    if (notification.ticketId) ticketId = notification.ticketId;
    else if (notification.data?.ticketId) ticketId = notification.data.ticketId;
    else if (notification.action_url) ticketId = notification.action_url.match(/\d+/)?.[0];
    if (ticketId) {
      localStorage.setItem('selectedTicketId', ticketId);
      localStorage.setItem('selectedChatType', type);
      if (userName) localStorage.setItem('chatUserName', userName);
      setChatType(type);
      setPage('support');
    } else {
      setChatType(type);
      setPage('support');
    }
  }, [user, lang, setPage, setChatType]);

  // ✅ دالة جلب التذاكر غير المقروءة للمرشد
  const fetchGuideUnreadCount = useCallback(async () => {
    if (!user || (!user.isGuide && user.role !== 'guide')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://tourist-app-api.onrender.com/api/support/tickets?status=open', {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success && data.tickets) {
        const guideId = user.id;
        let unreadTickets = data.tickets.filter(ticket =>
          ticket.type === 'guide_chat' &&
          !ticket.is_read &&
          (ticket.metadata?.guideId == guideId || ticket.user_id === guideId)
        );
        unreadTickets.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
        const newCount = unreadTickets.length;
        if (newCount > prevGuideUnreadCountRef.current && newCount > 0) {
          const latestTicket = unreadTickets[0];
          const userName = latestTicket.metadata?.created_by_name || (latestTicket.user_id === guideId ? 'الدعم' : 'مسافر');
          let touristId = null;
          if (latestTicket.metadata?.created_by_id && String(latestTicket.metadata.created_by_id) !== String(guideId)) {
            touristId = latestTicket.metadata.created_by_id;
          } else if (latestTicket.user_id && String(latestTicket.user_id) !== String(guideId)) {
            touristId = latestTicket.user_id;
          } else if (latestTicket.metadata?.userId && String(latestTicket.metadata.userId) !== String(guideId)) {
            touristId = latestTicket.metadata.userId;
          } else if (latestTicket.metadata?.sender_id && String(latestTicket.metadata.sender_id) !== String(guideId)) {
            touristId = latestTicket.metadata.sender_id;
          }
          toast(`📩 ${lang === 'ar' ? `رسالة جديدة من ${userName}` : `New message from ${userName}`}`, {
            icon: '💬',
            duration: 8000,
            onClick: () => {
              if (touristId) {
                localStorage.setItem('directChatParams', JSON.stringify({
                  recipientId: touristId,
                  recipientName: userName,
                  recipientType: 'tourist',
                }));
                setPage('directChat');
              } else {
                localStorage.setItem('selectedTicketId', latestTicket.id);
                localStorage.setItem('selectedChatType', 'guide');
                localStorage.setItem('chatUserName', userName);
                setChatType('guide');
                setPage('support');
              }
            }
          });
        }
        prevGuideUnreadCountRef.current = newCount;
        setGuideUnreadCount(newCount);
      }
    } catch (err) {
      console.error('Polling error for guide tickets:', err);
    }
  }, [user, lang]);

  // بدء polling للمرشد
  useEffect(() => {
    if (user && isGuide) {
      fetchGuideUnreadCount();
      pollingRef.current = setInterval(fetchGuideUnreadCount, 10000);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [user, isGuide, fetchGuideUnreadCount]);

  // تحديث عند تغيير الصفحة
  useEffect(() => {
    if (user && isGuide) fetchGuideUnreadCount();
  }, [page, user, fetchGuideUnreadCount]);

  // جلب عدد الإشعارات للمسؤول
  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'support')) {
      const fetchAdminUnread = async () => {
        try {
          const response = await api.getUserNotifications({ status: 'unread', limit: 1 });
          let count = 0;
          if (response.success && response.pagination) count = response.pagination.total || 0;
          else if (response.unreadCount !== undefined) count = response.unreadCount;
          setUnreadCount(count);
        } catch (err) { console.error(err); }
      };
      fetchAdminUnread();
      const interval = setInterval(fetchAdminUnread, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleProgramAdded = () => {
    setRefreshMap(prev => !prev);
    if (page === 'explore') toast.success(lang === 'ar' ? '🗺️ تم تحديث الخريطة' : '🗺️ Map updated');
  };

  const handleLoginSuccess = (response) => {
    if (response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('userType', response.user.type === 'guide' ? 'guide' : 'user');
    }
    authUpdateUser(response.user);
    setShowLogin(false);
    toast.success(`👋 مرحباً ${response.user.fullName || response.user.name}! تم تسجيل الدخول بنجاح`);
  };

  const handleLogout = () => {
    authLogout();
    setPage('home');
    setUserPrograms([]);
  };

  const handleUserUpdate = (userData) => authUpdateUser(userData);

  const toggleTestMode = () => {
    const newMode = !isTestMode;
    setIsTestMode(newMode);
    authLogout();
    setPage("home");
    toast.info(lang === 'ar' ? `🔄 تم التبديل إلى ${newMode ? 'وضع الاختبار' : 'وضع الإنتاج'}` : `🔄 Switched to ${newMode ? 'Test Mode' : 'Production Mode'}`);
  };

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [lang, dark]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {isTestMode && (
        <div className="bg-yellow-500 text-white text-center py-1 px-4 text-xs font-medium flex items-center justify-center gap-2">
          <span className="animate-pulse">🧪</span>
          <span>{lang === 'ar' ? 'وضع الاختبار التجريبي' : 'Test Mode'}</span>
          <button onClick={toggleTestMode} className="bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded text-xs">🔄</button>
        </div>
      )}
      
      {/* ✅ شريط المسؤولين في الأعلى */}
      <AdminTopBar setPage={setPage} lang={lang} unreadCount={unreadCount} />
      
      {/* ✅ إزالة المسافة العلوية (pt-0) لرفع المحتوى وجعل سطر الكتابة مرئياً */}
      <div className="flex-1 overflow-hidden relative -mt-2">
        {page === "home" && <HomePage lang={lang} user={user} setPage={setPage} dark={dark} setDark={toggleDarkMode} locationEnabled={locationEnabled} setLocationEnabled={setLocationEnabled} />}
        {page === "explore" && <ExplorePage lang={lang} mapContainerRef={mapContainerRef} setPage={setPage} transport={transport} setTransport={setTransport} user={user} programs={userPrograms} setPrograms={setUserPrograms} unreadCount={unreadCount} refreshTrigger={refreshMap} dark={dark} />}
        {page === "directChat" && <DirectChatPage setPage={setPage} lang={lang} />}
        {page === "programs" && <ProgramsPage setPage={setPage} lang={lang} />} 
        {page === "notifications" && <NotificationsPage setPage={setPage} onNotificationClick={openChatFromNotification} />}
        {page === "upgrade-to-guide" && <UpgradeToGuidePage setPage={setPage} onUpgradeSuccess={handleUserUpdate} />}
        {page === "upgrade-status" && <UpgradeStatusPage setPage={setPage} />}
        {page === "support" && <SupportChatPage setPage={setPage} lang={lang} chatType={chatType} />}
        {page === "upgrade-requests" && <SupportUpgradeRequestsPage setPage={setPage} />}
        {(page === "admin-support" || page === "adminSupport") && <AdminSupportPage setPage={setPage} />}
        {page === "admin-notifications" && <AdminNotificationsPage setPage={setPage} />}
        {page === "admin-upgrade-requests" && <AdminUpgradeRequestsPage setPage={setPage} />}
        {page === "favorites" && <FavoritesPage lang={lang} />}
        {page === "events" && <EventsPage lang={lang} />}
        {page === "guides" && <GuidesPage lang={lang} user={user} setPage={setPage} />}
        {page === "emergency" && <EmergencyPage setPage={setPage} user={user} />}
        {page === "guideDashboard" && (isGuide ? <GuideDashboard lang={lang} guide={user} setPage={setPage} user={user} setUserPrograms={setUserPrograms} onProgramAdded={handleProgramAdded} /> : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Shield className="w-24 h-24 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold">{lang === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
              <button onClick={() => setPage('profile')} className="mt-4 px-6 py-3 bg-green-600 text-white rounded-lg">{lang === 'ar' ? 'العودة للملف الشخصي' : 'Back'}</button>
            </div>
          </div>
        ))}
        {page === "profile" && <ProfilePage lang={lang} user={user} setPage={setPage} setShowLogin={setShowLogin} onLogout={handleLogout} onUpdateUser={handleUserUpdate} />}
        {page === "settings" && <SettingsPage lang={lang} dark={dark} setDark={toggleDarkMode} setLang={setLang} setPage={setPage} locationEnabled={locationEnabled} setLocationEnabled={setLocationEnabled} isTestMode={isTestMode} onToggleTestMode={toggleTestMode} onLogout={handleLogout} />}
      </div>
      
      <BottomNav current={page} setCurrent={setPage} lang={lang} user={user} unreadCount={unreadCount + guideUnreadCount} />
      {showLogin && <LoginPage lang={lang} onLoginSuccess={handleLoginSuccess} />}
    </div>
  );
}

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  return showLanding ? (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-b from-green-500 to-emerald-600 text-white p-4 text-center">
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }} className="mb-8">
        <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm"><MapPin size={80} /></div>
      </motion.div>
      <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-4xl font-bold mb-4">السائح</motion.h1>
      <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="text-lg mb-8 max-w-md">دليلك الذكي لاكتشاف أجمل الوجهات السياحية</motion.p>
      <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }} onClick={() => setShowLanding(false)} className="px-8 py-3 bg-white text-green-700 rounded-xl font-bold text-lg shadow-lg hover:bg-gray-100 transition transform hover:scale-105">ابدأ الرحلة</motion.button>
    </div>
  ) : (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <WalletProvider>
            <TouristAppPrototype />
          </WalletProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
