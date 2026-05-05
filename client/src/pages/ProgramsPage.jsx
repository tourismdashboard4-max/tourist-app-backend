// client/src/pages/ProgramsPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiMapPin, FiCalendar, FiUsers, FiDollarSign,
  FiSearch, FiFilter, FiStar, FiClock, FiHeart,
  FiShare2, FiBookmark, FiChevronLeft, FiChevronRight,
  FiGrid, FiList, FiEye, FiMessageCircle, FiX, FiLoader
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import './ProgramsPage.css';

const ProgramsPage = ({ setPage, lang = 'ar' }) => {
  const { user, isAuthenticated } = useAuth();
  
  const [programs, setPrograms] = useState([]);
  const [filteredPrograms, setFilteredPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState([]);
  
  // الفلاتر
  const [filters, setFilters] = useState({
    location: 'all',
    activity: 'all',
    priceRange: { min: 0, max: 5000 },
    duration: 'all',
    rating: 0,
    guests: 1
  });

  const [searchQuery, setSearchQuery] = useState('');
  
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 9,
    totalPages: 1
  });

  const [stats, setStats] = useState({
    totalPrograms: 0,
    totalGuides: 0,
    averagePrice: 0,
    popularLocations: []
  });

  const locations = ['الكل', 'مكة المكرمة', 'المدينة المنورة', 'الرياض', 'جدة', 'الدمام', 'أبها', 'تبوك', 'الطائف'];
  const activities = ['الكل', 'سياحة دينية', 'سياحة ثقافية', 'سياحة مغامرات', 'سياحة ترفيهية', 'سياحة علاجية', 'سياحة طبيعية'];
  const durations = ['الكل', 'يوم واحد', '2-3 أيام', '4-7 أيام', 'أسبوعين', 'شهر'];

  useEffect(() => {
    fetchPrograms();
    if (isAuthenticated && user) {
      fetchFavorites();
    }
  }, []);

  useEffect(() => {
    applyFilters();
  }, [programs, filters, searchQuery]);

  // جلب البرامج الحقيقية من API
  const fetchPrograms = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/programs');
      console.log('📥 Programs API response:', response);
      
      let programsData = [];
      if (response.data?.success && response.data.programs) {
        programsData = response.data.programs;
      } else if (Array.isArray(response.data)) {
        programsData = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        programsData = response.data.data;
      } else {
        throw new Error('تنسيق البيانات غير صحيح');
      }
      
      // تنسيق البيانات لتتناسب مع الواجهة
      const formattedPrograms = programsData.map(p => ({
        id: p.id,
        title: p.name,
        description: p.description || '',
        location: p.location || p.location_name || 'غير محدد',
        activity: p.activity || 'سياحة عامة',
        price: p.price || 0,
        duration: p.duration || 'يوم واحد',
        max_guests: p.max_participants || p.maxParticipants || 20,
        rating: p.rating || 4.5,
        reviews: p.reviews || Math.floor(Math.random() * 200) + 10,
        image: p.image ? (p.image.startsWith('http') ? p.image : `https://tourist-app-api.onrender.com${p.image}`) : null,
        images: p.images || [],
        guide_id: p.guide_id,
        guide_name: p.guide_name,
        isPopular: p.isPopular || false,
        includes: p.includes || ['المرشد السياحي', 'وجبة غداء', 'مشروبات'],
        excludes: p.excludes || ['تذاكر الطيران', 'الإقامة']
      }));
      
      setPrograms(formattedPrograms);
      calculateStats(formattedPrograms);
      
    } catch (err) {
      console.error('Error fetching programs:', err);
      setError('حدث خطأ في تحميل البرامج. يرجى المحاولة مرة أخرى.');
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  };

  // جلب المفضلة
  const fetchFavorites = async () => {
    try {
      const response = await api.get('/favorites');
      if (response.data?.success && response.data.favorites) {
        setFavorites(response.data.favorites.map(f => f.program_id));
      }
    } catch (err) {
      console.error('Error fetching favorites:', err);
    }
  };

  // حساب الإحصائيات
  const calculateStats = (programsData) => {
    const total = programsData.length;
    const uniqueGuides = new Set(programsData.map(p => p.guide_id)).size;
    const avgPrice = programsData.reduce((acc, p) => acc + (p.price || 0), 0) / (total || 1);
    
    const locationCount = {};
    programsData.forEach(p => {
      if (p.location) {
        locationCount[p.location] = (locationCount[p.location] || 0) + 1;
      }
    });
    
    const popularLocs = Object.entries(locationCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([loc]) => loc);

    setStats({
      totalPrograms: total,
      totalGuides: uniqueGuides,
      averagePrice: Math.round(avgPrice),
      popularLocations: popularLocs
    });
  };

  // تطبيق الفلاتر
  const applyFilters = () => {
    let filtered = [...programs];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.location?.toLowerCase().includes(query)
      );
    }

    if (filters.location && filters.location !== 'الكل') {
      filtered = filtered.filter(p => p.location === filters.location);
    }

    if (filters.activity && filters.activity !== 'الكل') {
      filtered = filtered.filter(p => p.activity === filters.activity);
    }

    filtered = filtered.filter(p =>
      (p.price || 0) >= filters.priceRange.min && 
      (p.price || 0) <= filters.priceRange.max
    );

    if (filters.duration && filters.duration !== 'الكل') {
      filtered = filtered.filter(p => p.duration === filters.duration);
    }

    if (filters.rating > 0) {
      filtered = filtered.filter(p => (p.rating || 0) >= filters.rating);
    }

    if (filters.guests > 1) {
      filtered = filtered.filter(p => (p.max_guests || 10) >= filters.guests);
    }

    setFilteredPrograms(filtered);
    setPagination(prev => ({
      ...prev,
      totalPages: Math.ceil(filtered.length / prev.itemsPerPage),
      currentPage: 1
    }));
  };

  const toggleFavorite = async (programId) => {
    if (!isAuthenticated) {
      toast.error('يرجى تسجيل الدخول لإضافة المفضلة');
      setPage('profile');
      return;
    }

    try {
      if (favorites.includes(programId)) {
        await api.delete(`/favorites/${programId}`);
        setFavorites(prev => prev.filter(id => id !== programId));
        toast.success('تم إزالة من المفضلة');
      } else {
        await api.post(`/favorites/${programId}`);
        setFavorites(prev => [...prev, programId]);
        toast.success('تم إضافة إلى المفضلة');
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      toast.error('حدث خطأ');
    }
  };

  const handleBookProgram = (programId) => {
    if (!isAuthenticated) {
      toast.error('يرجى تسجيل الدخول لحجز البرنامج');
      setPage('profile');
      return;
    }
    // التوجيه إلى صفحة الحجز (يمكن إضافتها لاحقاً)
    toast.info(lang === 'ar' ? 'جاري تحويلك إلى صفحة الحجز...' : 'Redirecting to booking...');
    // navigate(`/booking/${programId}`);
  };

  const handleContactGuide = (guideId) => {
    if (!isAuthenticated) {
      toast.error('يرجى تسجيل الدخول للتواصل مع المرشد');
      setPage('profile');
      return;
    }
    // فتح المحادثة المباشرة مع المرشد
    localStorage.setItem('directChatParams', JSON.stringify({
      recipientId: guideId,
      recipientName: 'Guide',
      recipientType: 'guide',
    }));
    setPage('directChat');
  };

  const getPaginatedPrograms = () => {
    const start = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const end = start + pagination.itemsPerPage;
    return filteredPrograms.slice(start, end);
  };

  const getRatingStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating || 0);
    const hasHalfStar = (rating % 1) >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<FiStar key={i} className="star-icon filled" fill="currentColor" />);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<FiStar key={i} className="star-icon half" />);
      } else {
        stars.push(<FiStar key={i} className="star-icon" />);
      }
    }
    return stars;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(price || 0);
  };

  if (loading) {
    return (
      <div className="programs-loading">
        <FiLoader className="spinner" />
        <p>{lang === 'ar' ? 'جاري تحميل البرامج...' : 'Loading programs...'}</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="programs-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      dir="rtl"
    >
      {/* رأس الصفحة */}
      <div className="programs-hero">
        <div className="hero-content">
          <h1>{lang === 'ar' ? 'اكتشف برامج سياحية مميزة' : 'Discover Amazing Tour Programs'}</h1>
          <p>{lang === 'ar' ? 'اختر برنامجك المفضل واستكشف أجمل الوجهات مع مرشدين محترفين' : 'Choose your favorite program and explore the best destinations with professional guides'}</p>
          
          <div className="hero-search">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder={lang === 'ar' ? 'ابحث عن برنامج سياحي...' : 'Search for a tour program...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <motion.button 
              className={`filter-toggle ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiFilter /> {lang === 'ar' ? 'فلتر' : 'Filter'}
            </motion.button>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <span className="stat-number">{stats.totalPrograms}</span>
              <span className="stat-label">{lang === 'ar' ? 'برنامج' : 'Programs'}</span>
            </div>
            <div className="hero-stat">
              <span className="stat-number">{stats.totalGuides}</span>
              <span className="stat-label">{lang === 'ar' ? 'مرشد' : 'Guides'}</span>
            </div>
            <div className="hero-stat">
              <span className="stat-number">{stats.averagePrice}</span>
              <span className="stat-label">{lang === 'ar' ? 'متوسط السعر' : 'Avg. Price'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* لوحة الفلاتر */}
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            className="filters-panel"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="filters-grid">
              <div className="filter-group">
                <label>{lang === 'ar' ? 'الموقع' : 'Location'}</label>
                <select 
                  value={filters.location}
                  onChange={(e) => setFilters({...filters, location: e.target.value})}
                  className="filter-select"
                >
                  {locations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>{lang === 'ar' ? 'النشاط' : 'Activity'}</label>
                <select 
                  value={filters.activity}
                  onChange={(e) => setFilters({...filters, activity: e.target.value})}
                  className="filter-select"
                >
                  {activities.map(act => (
                    <option key={act} value={act}>{act}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>{lang === 'ar' ? 'المدة' : 'Duration'}</label>
                <select 
                  value={filters.duration}
                  onChange={(e) => setFilters({...filters, duration: e.target.value})}
                  className="filter-select"
                >
                  {durations.map(dur => (
                    <option key={dur} value={dur}>{dur}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>{lang === 'ar' ? 'عدد الضيوف' : 'Guests'}</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={filters.guests}
                  onChange={(e) => setFilters({...filters, guests: parseInt(e.target.value) || 1})}
                  className="filter-input"
                />
              </div>

              <div className="filter-group price-range">
                <label>{lang === 'ar' ? 'نطاق السعر (ريال)' : 'Price Range (SAR)'}</label>
                <div className="price-inputs">
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    value={filters.priceRange.min}
                    onChange={(e) => setFilters({
                      ...filters, 
                      priceRange: {...filters.priceRange, min: parseInt(e.target.value) || 0}
                    })}
                    className="price-input"
                    placeholder={lang === 'ar' ? 'الحد الأدنى' : 'Min'}
                  />
                  <span>إلى</span>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    value={filters.priceRange.max}
                    onChange={(e) => setFilters({
                      ...filters, 
                      priceRange: {...filters.priceRange, max: parseInt(e.target.value) || 0}
                    })}
                    className="price-input"
                    placeholder={lang === 'ar' ? 'الحد الأعلى' : 'Max'}
                  />
                </div>
              </div>

              <div className="filter-group">
                <label>{lang === 'ar' ? 'التقييم' : 'Rating'}</label>
                <div className="rating-filter">
                  {[1, 2, 3, 4, 5].map(star => (
                    <FiStar
                      key={star}
                      className={`rating-star ${star <= filters.rating ? 'active' : ''}`}
                      onClick={() => setFilters({...filters, rating: star})}
                    />
                  ))}
                  {filters.rating > 0 && (
                    <button 
                      className="rating-clear"
                      onClick={() => setFilters({...filters, rating: 0})}
                    >
                      <FiX size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="filter-actions">
              <motion.button 
                className="btn-clear"
                onClick={() => setFilters({
                  location: 'all',
                  activity: 'all',
                  priceRange: { min: 0, max: 5000 },
                  duration: 'all',
                  rating: 0,
                  guests: 1
                })}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {lang === 'ar' ? 'مسح الكل' : 'Clear All'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* شريط التحكم في العرض */}
      <div className="programs-controls">
        <div className="view-controls">
          <motion.button 
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <FiGrid />
          </motion.button>
          <motion.button 
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <FiList />
          </motion.button>
        </div>
        
        <div className="results-info">
          <span>{filteredPrograms.length} {lang === 'ar' ? 'برنامج متاح' : 'programs available'}</span>
        </div>
      </div>

      {/* قائمة البرامج */}
      {error && filteredPrograms.length === 0 ? (
        <div className="error-container">
          <p className="error-message">{error}</p>
          <motion.button 
            onClick={fetchPrograms}
            className="btn-retry"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </motion.button>
        </div>
      ) : filteredPrograms.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>{lang === 'ar' ? 'لا توجد برامج متاحة' : 'No programs available'}</h3>
          <p>{lang === 'ar' ? 'حاول تعديل خيارات البحث أو الفلترة' : 'Try adjusting your search or filter options'}</p>
        </div>
      ) : (
        <>
          <div className={`programs-grid ${viewMode}`}>
            <AnimatePresence>
              {getPaginatedPrograms().map((program, index) => (
                <motion.div
                  key={program.id}
                  className={`program-card ${viewMode}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -5 }}
                >
                  <div className="program-image">
                    <img 
                      src={program.image || '/images/default-program.jpg'} 
                      alt={program.title}
                      onError={(e) => { e.target.src = '/images/default-program.jpg'; }}
                    />
                    <div className="program-overlay">
                      <motion.button 
                        className={`favorite-btn ${favorites.includes(program.id) ? 'active' : ''}`}
                        onClick={() => toggleFavorite(program.id)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <FiHeart />
                      </motion.button>
                      <motion.button 
                        className="share-btn"
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.origin + `/programs/${program.id}`);
                          toast.success(lang === 'ar' ? 'تم نسخ الرابط' : 'Link copied');
                        }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <FiShare2 />
                      </motion.button>
                    </div>
                    {program.isPopular && (
                      <div className="program-badge">
                        🌟 {lang === 'ar' ? 'مميز' : 'Popular'}
                      </div>
                    )}
                  </div>

                  <div className="program-content">
                    <div className="program-header">
                      <h3>{program.title}</h3>
                      <div className="program-rating">
                        {getRatingStars(program.rating || 4)}
                        <span>({program.reviews || 0})</span>
                      </div>
                    </div>

                    <p className="program-description">
                      {program.description?.slice(0, 100)}...
                    </p>

                    <div className="program-details">
                      <div className="detail">
                        <FiMapPin className="detail-icon" />
                        <span>{program.location}</span>
                      </div>
                      <div className="detail">
                        <FiCalendar className="detail-icon" />
                        <span>{program.duration || 'يوم'}</span>
                      </div>
                      <div className="detail">
                        <FiUsers className="detail-icon" />
                        <span>{lang === 'ar' ? `1-${program.max_guests || 10} أشخاص` : `1-${program.max_guests || 10} persons`}</span>
                      </div>
                    </div>

                    <div className="program-footer">
                      <div className="program-price">
                        <span className="price">{formatPrice(program.price)}</span>
                        <span className="per">{lang === 'ar' ? '/ للشخص' : '/ person'}</span>
                      </div>

                      <div className="program-actions">
                        <motion.button 
                          className="btn-view"
                          onClick={() => setSelectedProgram(program)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          title={lang === 'ar' ? 'عرض التفاصيل' : 'View details'}
                        >
                          <FiEye />
                        </motion.button>
                        <motion.button 
                          className="btn-book"
                          onClick={() => handleBookProgram(program.id)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {lang === 'ar' ? 'احجز الآن' : 'Book Now'}
                        </motion.button>
                        <motion.button 
                          className="btn-chat"
                          onClick={() => handleContactGuide(program.guide_id)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          title={lang === 'ar' ? 'تواصل مع المرشد' : 'Contact guide'}
                        >
                          <FiMessageCircle />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* التقسيم */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <motion.button
                onClick={() => setPagination({...pagination, currentPage: pagination.currentPage - 1})}
                disabled={pagination.currentPage === 1}
                className="pagination-btn"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FiChevronRight />
              </motion.button>
              
              {[...Array(Math.min(pagination.totalPages, 5))].map((_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.currentPage <= 3) {
                  pageNum = i + 1;
                } else if (pagination.currentPage >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.currentPage - 2 + i;
                }
                
                return (
                  <motion.button
                    key={pageNum}
                    onClick={() => setPagination({...pagination, currentPage: pageNum})}
                    className={`pagination-number ${pagination.currentPage === pageNum ? 'active' : ''}`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {pageNum}
                  </motion.button>
                );
              })}
              
              <motion.button
                onClick={() => setPagination({...pagination, currentPage: pagination.currentPage + 1})}
                disabled={pagination.currentPage === pagination.totalPages}
                className="pagination-btn"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FiChevronLeft />
              </motion.button>
            </div>
          )}
        </>
      )}

      {/* نافذة تفاصيل البرنامج */}
      <AnimatePresence>
        {selectedProgram && (
          <motion.div 
            className="program-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedProgram(null)}
          >
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="modal-close" onClick={() => setSelectedProgram(null)}>×</button>
              
              <div className="modal-header">
                <img 
                  src={selectedProgram.image || '/images/default-program.jpg'} 
                  alt={selectedProgram.title}
                  onError={(e) => { e.target.src = '/images/default-program.jpg'; }}
                />
                <div className="modal-header-content">
                  <h2>{selectedProgram.title}</h2>
                  <div className="modal-rating">
                    {getRatingStars(selectedProgram.rating || 4)}
                    <span>({selectedProgram.reviews || 0} {lang === 'ar' ? 'تقييم' : 'reviews'})</span>
                  </div>
                </div>
              </div>

              <div className="modal-body">
                <div className="modal-info-grid">
                  <div className="modal-info-item">
                    <FiMapPin />
                    <div>
                      <label>{lang === 'ar' ? 'الموقع' : 'Location'}</label>
                      <span>{selectedProgram.location}</span>
                    </div>
                  </div>
                  <div className="modal-info-item">
                    <FiCalendar />
                    <div>
                      <label>{lang === 'ar' ? 'المدة' : 'Duration'}</label>
                      <span>{selectedProgram.duration || 'يوم واحد'}</span>
                    </div>
                  </div>
                  <div className="modal-info-item">
                    <FiUsers />
                    <div>
                      <label>{lang === 'ar' ? 'العدد المسموح' : 'Capacity'}</label>
                      <span>{lang === 'ar' ? `1-${selectedProgram.max_guests || 10} أشخاص` : `1-${selectedProgram.max_guests || 10} persons`}</span>
                    </div>
                  </div>
                  <div className="modal-info-item">
                    <FiDollarSign />
                    <div>
                      <label>{lang === 'ar' ? 'السعر' : 'Price'}</label>
                      <span>{formatPrice(selectedProgram.price)} / {lang === 'ar' ? 'للشخص' : 'person'}</span>
                    </div>
                  </div>
                </div>

                <div className="modal-description">
                  <h3>{lang === 'ar' ? 'عن البرنامج' : 'About the program'}</h3>
                  <p>{selectedProgram.description}</p>
                </div>

                {selectedProgram.includes && selectedProgram.includes.length > 0 && (
                  <div className="modal-includes">
                    <h3>{lang === 'ar' ? 'يشمل البرنامج' : 'Includes'}</h3>
                    <ul>
                      {selectedProgram.includes.map((item, i) => (
                        <li key={i}>✓ {item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedProgram.excludes && selectedProgram.excludes.length > 0 && (
                  <div className="modal-excludes">
                    <h3>{lang === 'ar' ? 'لا يشمل' : 'Excludes'}</h3>
                    <ul>
                      {selectedProgram.excludes.map((item, i) => (
                        <li key={i}>✗ {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <motion.button 
                  className="modal-btn-book"
                  onClick={() => {
                    handleBookProgram(selectedProgram.id);
                    setSelectedProgram(null);
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {lang === 'ar' ? 'احجز الآن' : 'Book Now'}
                </motion.button>
                <motion.button 
                  className="modal-btn-chat"
                  onClick={() => {
                    handleContactGuide(selectedProgram.guide_id);
                    setSelectedProgram(null);
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {lang === 'ar' ? 'تواصل مع المرشد' : 'Contact Guide'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ProgramsPage;
