import React from 'react';

function GuidesPage({ lang, onGuideLogin, onGuideRegister, user }) {
  console.log('✅ GuidesPage is rendering!');
  
  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ fontSize: '24px', color: 'green' }}>
        {lang === 'ar' ? 'صفحة المرشدين تعمل!' : 'Guides Page is working!'}
      </h1>
      <p style={{ marginTop: '10px' }}>
        {lang === 'ar' ? 'تم تحميل الصفحة بنجاح' : 'Page loaded successfully'}
      </p>
    </div>
  );
}

export default GuidesPage;