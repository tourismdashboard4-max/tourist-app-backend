import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiMapPin, FiCalendar, FiUsers, FiDollarSign,
  FiSearch, FiFilter, FiStar, FiClock, FiHeart,
  FiShare2, FiBookmark, FiChevronLeft, FiChevronRight,
  FiGrid, FiList, FiEye, FiMessageCircle
} from 'react-icons/fi';
import api from '../services/api';
import './ProgramsPage.css';

const ProgramsPage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [programs, setPrograms] = useState([]);
  const [filteredPrograms, setFilteredPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid / list
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState([]);
  
  // الفلاتر
  const [filters, setFilters] = useState({
    location: 'all',
    activity: 'all',
    priceRange: { min: 0, max: 1000 },
    duration: 'all',
    rating: 0,
    guests: 1
  });

  // البحث
  const [searchQuery, setSearchQuery] = useState('');
  
  // التقسيم
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 9,
    totalPages: 1
  });

  // الإحصائيات
  const [stats, setStats] = useState({
    totalPrograms: 0,
    totalGuides: 0,
    averagePrice: 0,
    popularLocations: []
  });

  // خيارات الفلترة
  const locations = ['الكل', 'مكة', 'المدينة', 'الرياض', 'جدة', 'الدمام', 'أبها', 'تبوك'];
  const activities = ['الكل', 'سياحة دينية', 'سياحة ثقافية', 'سياحة مغامرات', 'سياحة ترفيهية', 'سياحة علاجية'];
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

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const response = await api.get('/programs');
      if (response.data.success) {
        setPrograms(response.data.programs);
        calculateStats(response.data.programs);
      }
    } catch (err) {
      setError('حدث خطأ في تحميل البرامج');
      console.error('Error fetching programs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const response = await api.get(`/users/${user.id}/favorites`);
      if (response.data.success) {
        setFavorites(response.data.favorites);
      }
    } catch (err) {
      console.error('Error fetching favorites:', err);
    }
  };

  const calculateStats = (programsData) => {
    const total = programsData.length;
    const uniqueGuides = new Set(programsData.map(p => p.guide_id)).size;
    const avgPrice = programsData.reduce((acc, p) => acc + p.price, 0) / total;
    const locationCount = programsData.reduce((acc, p) => {
      acc[p.location] = (acc[p.location] || 0) + 1;
      return acc;
    }, {});
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

  const applyFilters = () => {
    let filtered = [...programs];

    // فلترة البحث
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // فلترة الموقع
    if (filters.location && filters.location !== 'الكل') {
      filtered = filtered.filter(p => p.location === filters.location);
    }

    // فلترة النشاط
    if (filters.activity && filters.activity !== 'الكل') {
      filtered = filtered.filter(p => p.activity === filters.activity);
    }

    // فلترة السعر
    filtered = filtered.filter(p =>
      p.price >= filters.priceRange.min && p.price <= filters.priceRange.max
    );

    // فلترة المدة
    if (filters.duration && filters.duration !== 'الكل') {
      // منطق فلترة المدة حسب الحاجة
    }

    // فلترة التقييم
    if (filters.rating > 0) {
      filtered = filtered.filter(p => (p.rating || 0) >= filters.rating);
    }

    // فلترة عدد الضيوف
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
      navigate('/login', { state: { from: '/programs', message: 'يرجى تسجيل الدخول لإضافة المفضلة' } });
      return;
    }

    try {
      if (favorites.includes(programId)) {
        await api.delete(`/users/${user.id}/favorites/${programId}`);
        setFavorites(prev => prev.filter(id => id !== programId));
      } else {
        await api.post(`/users/${user.id}/favorites/${programId}`);
        setFavorites(prev => [...prev, programId]);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleBookProgram = (programId) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/programs', message: 'يرجى تسجيل الدخول لحجز البرنامج' } });
      return;
    }
    navigate(`/booking/${programId}`);
  };

  const handleContactGuide = (guideId) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/programs', message: 'يرجى تسجيل الدخول للتواصل مع المرشد' } });
      return;
    }
    navigate(`/chat/guide/${guideId}`);
  };

  const getPaginatedPrograms = () => {
    const start = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const end = start + pagination.itemsPerPage;
    return filteredPrograms.slice(start, end);
  };

  const getRatingStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <FiStar
          key={i}
          className={`star-icon ${i <= rating ? 'filled' : ''}`}
        />
      );
    }
    return stars;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (loading) {
    return (
      <div className="programs-loading">
        <div className="spinner"></div>
        <p>جاري تحميل البرامج...</p>
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
          <h1>اكتشف برامج سياحية مميزة</h1>
          <p>اختر برنامجك المفضل واستكشف أجمل الوجهات مع مرشدين محترفين</p>
          
          <div className="hero-search">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="ابحث عن برنامج سياحي..."
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
              <FiFilter /> فلتر
            </motion.button>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <span className="stat-number">{stats.totalPrograms}</span>
              <span className="stat-label">برنامج</span>
            </div>
            <div className="hero-stat">
              <span className="stat-number">{stats.totalGuides}</span>
              <span className="stat-label">مرشد</span>
            </div>
            <div className="hero-stat">
              <span className="stat-number">{stats.averagePrice} ₴</span>
              <span className="stat-label">متوسط السعر</span>
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
                <label>الموقع</label>
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
                <label>النشاط</label>
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
                <label>المدة</label>
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
                <label>عدد الضيوف</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={filters.guests}
                  onChange={(e) => setFilters({...filters, guests: parseInt(e.target.value)})}
                  className="filter-input"
                />
              </div>

              <div className="filter-group price-range">
                <label>نطاق السعر</label>
                <div className="price-inputs">
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={filters.priceRange.min}
                    onChange={(e) => setFilters({
                      ...filters, 
                      priceRange: {...filters.priceRange, min: parseInt(e.target.value)}
                    })}
                    className="price-input"
                  />
                  <span>إلى</span>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={filters.priceRange.max}
                    onChange={(e) => setFilters({
                      ...filters, 
                      priceRange: {...filters.priceRange, max: parseInt(e.target.value)}
                    })}
                    className="price-input"
                  />
                </div>
              </div>

              <div className="filter-group">
                <label>التقييم</label>
                <div className="rating-filter">
                  {[1, 2, 3, 4, 5].map(star => (
                    <FiStar
                      key={star}
                      className={`rating-star ${star <= filters.rating ? 'active' : ''}`}
                      onClick={() => setFilters({...filters, rating: star})}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="filter-actions">
              <motion.button 
                className="btn-clear"
                onClick={() => setFilters({
                  location: 'all',
                  activity: 'all',
                  priceRange: { min: 0, max: 1000 },
                  duration: 'all',
                  rating: 0,
                  guests: 1
                })}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                مسح الكل
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
          <span>{filteredPrograms.length} برنامج متاح</span>
        </div>
      </div>

      {/* قائمة البرامج */}
      {error ? (
        <div className="error-container">
          <p className="error-message">{error}</p>
          <motion.button 
            onClick={fetchPrograms}
            className="btn-retry"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            إعادة المحاولة
          </motion.button>
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
                      src={program.image || '/default-program.jpg'} 
                      alt={program.title}
                      onError={(e) => e.target.src = '/default-program.jpg'}
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
                        onClick={() => {/* مشاركة البرنامج */}}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <FiShare2 />
                      </motion.button>
                    </div>
                    <div className="program-badge">
                      {program.isPopular && '🌟 مميز'}
                    </div>
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
                        <span>1-{program.max_guests || 10} أشخاص</span>
                      </div>
                    </div>

                    <div className="program-footer">
                      <div className="program-price">
                        <span className="price">{formatPrice(program.price)}</span>
                        <span className="per">/ للشخص</span>
                      </div>

                      <div className="program-actions">
                        <motion.button 
                          className="btn-view"
                          onClick={() => setSelectedProgram(program)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <FiEye />
                        </motion.button>
                        <motion.button 
                          className="btn-book"
                          onClick={() => handleBookProgram(program.id)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          احجز الآن
                        </motion.button>
                        <motion.button 
                          className="btn-chat"
                          onClick={() => handleContactGuide(program.guide_id)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
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
              
              {[...Array(pagination.totalPages)].map((_, i) => (
                <motion.button
                  key={i + 1}
                  onClick={() => setPagination({...pagination, currentPage: i + 1})}
                  className={`pagination-number ${pagination.currentPage === i + 1 ? 'active' : ''}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {i + 1}
                </motion.button>
              ))}
              
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
                  src={selectedProgram.image || '/default-program.jpg'} 
                  alt={selectedProgram.title}
                  onError={(e) => e.target.src = '/default-program.jpg'}
                />
                <div className="modal-header-content">
                  <h2>{selectedProgram.title}</h2>
                  <div className="modal-rating">
                    {getRatingStars(selectedProgram.rating || 4)}
                    <span>({selectedProgram.reviews || 0} تقييم)</span>
                  </div>
                </div>
              </div>

              <div className="modal-body">
                <div className="modal-info-grid">
                  <div className="modal-info-item">
                    <FiMapPin />
                    <div>
                      <label>الموقع</label>
                      <span>{selectedProgram.location}</span>
                    </div>
                  </div>
                  <div className="modal-info-item">
                    <FiCalendar />
                    <div>
                      <label>المدة</label>
                      <span>{selectedProgram.duration || 'يوم واحد'}</span>
                    </div>
                  </div>
                  <div className="modal-info-item">
                    <FiUsers />
                    <div>
                      <label>العدد المسموح</label>
                      <span>1-{selectedProgram.max_guests || 10} أشخاص</span>
                    </div>
                  </div>
                  <div className="modal-info-item">
                    <FiDollarSign />
                    <div>
                      <label>السعر</label>
                      <span>{formatPrice(selectedProgram.price)} / للشخص</span>
                    </div>
                  </div>
                </div>

                <div className="modal-description">
                  <h3>عن البرنامج</h3>
                  <p>{selectedProgram.description}</p>
                </div>

                {selectedProgram.includes && (
                  <div className="modal-includes">
                    <h3>يشمل البرنامج</h3>
                    <ul>
                      {selectedProgram.includes.map((item, i) => (
                        <li key={i}>✓ {item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedProgram.excludes && (
                  <div className="modal-excludes">
                    <h3>لا يشمل</h3>
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
                  احجز الآن
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
                  تواصل مع المرشد
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