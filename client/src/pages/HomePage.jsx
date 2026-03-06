// client/src/pages/HomePage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  FaMapMarkedAlt, 
  FaUserTie, 
  FaWallet, 
  FaComments,
  FaStar,
  FaArrowLeft,
  FaShieldAlt,
  FaClock,
  FaMoon,
  FaSun,
  FaBars,
  FaUserCircle
} from 'react-icons/fa';
import { motion } from 'framer-motion';

const HomePage = () => {
  const { user } = useAuth();
  const { darkMode, theme, toggleDarkMode } = useTheme();
  const { language, setLanguage } = useLanguage();

  const features = [
    {
      icon: <FaMapMarkedAlt size={40} />,
      title: 'اكتشف الأماكن',
      description: 'استكشف أفضل الوجهات السياحية والأماكن المميزة في جميع أنحاء المملكة',
      color: theme.primary
    },
    {
      icon: <FaUserTie size={40} />,
      title: 'مرشدين محترفين',
      description: 'احجز مع مرشدين سياحيين معتمدين ومتميزين بخبرة عالية',
      color: theme.secondary
    },
    {
      icon: <FaWallet size={40} />,
      title: 'محفظة إلكترونية',
      description: 'ادفع بسهولة وأمان عبر محفظتك الرقمية مع نظام رسوم شفاف 2.5%',
      color: theme.accent
    },
    {
      icon: <FaComments size={40} />,
      title: 'تواصل فوري',
      description: 'تحدث مع المرشدين مباشرة عبر المحادثة الفورية قبل وأثناء الرحلة',
      color: theme.warning
    }
  ];

  const stats = [
    { value: '500+', label: 'مرشد سياحي' },
    { value: '1000+', label: 'رحلة مكتملة' },
    { value: '98%', label: 'تقييم إيجابي' },
    { value: '24/7', label: 'دعم فني' }
  ];

  const testimonials = [
    {
      name: 'أحمد محمد',
      role: 'سائح',
      comment: 'تجربة رائعة جداً، المرشد كان محترف والمكان جميل',
      rating: 5,
      image: 'https://i.pravatar.cc/100?img=1'
    },
    {
      name: 'سارة عبدالله',
      role: 'سائحة',
      comment: 'سهولة في الحجز والتواصل، أنصح الجميع باستخدام التطبيق',
      rating: 5,
      image: 'https://i.pravatar.cc/100?img=2'
    },
    {
      name: 'محمد علي',
      role: 'مرشد سياحي',
      comment: 'منصة ممتازة للتواصل مع السياح وإدارة الحجوزات بكل سهولة',
      rating: 5,
      image: 'https://i.pravatar.cc/100?img=3'
    }
  ];

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  return (
    <div style={{
      backgroundColor: theme.bg,
      color: theme.text,
      minHeight: '100vh',
      direction: 'rtl',
      transition: 'all 0.3s ease'
    }}>
      
      {/* شريط التنقل العلوي */}
      <nav style={{
        backgroundColor: darkMode ? theme.card : 'white',
        boxShadow: theme.shadow,
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: `1px solid ${theme.border}`
      }}>
        <div className="container mx-auto px-4 py-3">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            {/* الشعار */}
            <Link to="/" style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: theme.primary,
              textDecoration: 'none'
            }}>
              Tourist<span style={{ color: theme.accent }}>App</span>
            </Link>

            {/* القائمة */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              {/* زر اللغة */}
              <button
                onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
                style={{
                  background: 'none',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: theme.text,
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                {language === 'ar' ? 'EN' : 'عربي'}
              </button>

              {/* زر الوضع الليلي */}
              <button
                onClick={toggleDarkMode}
                style={{
                  background: 'none',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: theme.text,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                {darkMode ? <FaSun /> : <FaMoon />}
                <span style={{ fontSize: '14px' }}>
                  {darkMode ? 'نهاري' : 'ليلي'}
                </span>
              </button>

              {/* زر الملف الشخصي */}
              {user ? (
                <Link to="/profile" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  color: theme.text
                }}>
                  <FaUserCircle size={24} color={theme.primary} />
                  <span>{user.name}</span>
                </Link>
              ) : (
                <Link to="/login" style={{
                  background: theme.primary,
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  textDecoration: 'none'
                }}>
                  دخول
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - مع دعم الوضع الليلي */}
      <section style={{
        background: darkMode 
          ? `linear-gradient(135deg, ${theme.card}, ${theme.bg})`
          : 'linear-gradient(135deg, #16a34a, #059669)',
        color: darkMode ? theme.text : 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: darkMode ? 0.1 : 0.2
        }} />
        
        <div className="container mx-auto px-4 py-24 md:py-32" style={{ position: 'relative', zIndex: 10 }}>
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 'bold',
              marginBottom: '1.5rem',
              color: darkMode ? theme.text : 'white'
            }}>
              اكتشف جمال السياحة مع 
              <span style={{
                display: 'block',
                color: darkMode ? theme.primary : '#fbbf24',
                marginTop: '0.5rem'
              }}>
                مرشدين محترفين
              </span>
            </h1>
            <p style={{
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              marginBottom: '2rem',
              color: darkMode ? theme.textSecondary : '#f3f4f6'
            }}>
              منصتك المتكاملة لحجز المرشدين السياحيين واكتشاف الأماكن الرائعة في المملكة
            </p>
            
            {!user ? (
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '1rem',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                <Link
                  to="/register"
                  style={{
                    padding: '1rem 2rem',
                    background: darkMode ? theme.primary : '#fbbf24',
                    color: darkMode ? theme.bg : '#111827',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    textDecoration: 'none',
                    transition: 'all 0.3s ease',
                    boxShadow: theme.shadowLg,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <span>ابدأ الآن مجاناً</span>
                  <FaArrowLeft />
                </Link>
                <Link
                  to="/programs"
                  style={{
                    padding: '1rem 2rem',
                    background: 'transparent',
                    color: darkMode ? theme.text : 'white',
                    border: `2px solid ${darkMode ? theme.primary : 'white'}`,
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    textDecoration: 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = darkMode ? theme.primary : 'white';
                    e.currentTarget.style.color = darkMode ? theme.bg : theme.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = darkMode ? theme.text : 'white';
                  }}
                >
                  استكشف البرامج
                </Link>
              </div>
            ) : (
              <Link
                to={user.type === 'guide' ? '/guide/dashboard' : '/programs'}
                style={{
                  padding: '1rem 2rem',
                  background: darkMode ? theme.primary : '#fbbf24',
                  color: darkMode ? theme.bg : '#111827',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  textDecoration: 'none',
                  transition: 'all 0.3s ease',
                  boxShadow: theme.shadowLg,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>اذهب إلى لوحة التحكم</span>
                <FaArrowLeft />
              </Link>
            )}
          </motion.div>
        </div>

        {/* Wave Shape - يتغير مع الوضع */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" 
              fill={darkMode ? theme.card : 'white'} />
          </svg>
        </div>
      </section>

      {/* Stats Section - متوافقة مع الوضع الليلي */}
      <section style={{
        padding: '5rem 0',
        backgroundColor: darkMode ? theme.card : 'white'
      }}>
        <div className="container mx-auto px-4">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '2rem',
            '@media (max-width: 768px)': {
              gridTemplateColumns: 'repeat(2, 1fr)'
            }
          }}>
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                style={{ textAlign: 'center' }}
              >
                <div style={{
                  fontSize: 'clamp(2rem, 4vw, 2.5rem)',
                  fontWeight: 'bold',
                  color: theme.primary,
                  marginBottom: '0.5rem'
                }}>
                  {stat.value}
                </div>
                <div style={{ color: theme.textSecondary }}>{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - متوافقة مع الوضع الليلي */}
      <section style={{
        padding: '5rem 0',
        backgroundColor: darkMode ? theme.bg : '#f9fafb'
      }}>
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: 'center', marginBottom: '4rem' }}
          >
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 2.5rem)',
              fontWeight: 'bold',
              color: theme.text,
              marginBottom: '1rem'
            }}>
              مميزات التطبيق
            </h2>
            <p style={{
              fontSize: '1.25rem',
              color: theme.textSecondary,
              maxWidth: '800px',
              margin: '0 auto'
            }}>
              كل ما تحتاجه في منصة واحدة لتجربة سياحية مميزة
            </p>
          </motion.div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '2rem',
            '@media (max-width: 1024px)': {
              gridTemplateColumns: 'repeat(2, 1fr)'
            },
            '@media (max-width: 640px)': {
              gridTemplateColumns: '1fr'
            }
          }}>
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -10 }}
                style={{
                  backgroundColor: darkMode ? theme.card : 'white',
                  borderRadius: '1rem',
                  padding: '2rem',
                  boxShadow: theme.shadowLg,
                  transition: 'all 0.3s ease',
                  border: darkMode ? `1px solid ${theme.border}` : 'none'
                }}
              >
                <div style={{ color: feature.color, marginBottom: '1rem' }}>
                  {feature.icon}
                </div>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: theme.text,
                  marginBottom: '0.75rem'
                }}>
                  {feature.title}
                </h3>
                <p style={{
                  color: theme.textSecondary,
                  lineHeight: '1.6'
                }}>
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - متوافقة مع الوضع الليلي */}
      <section style={{
        padding: '5rem 0',
        backgroundColor: darkMode ? theme.card : 'white'
      }}>
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: 'center', marginBottom: '4rem' }}
          >
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 2.5rem)',
              fontWeight: 'bold',
              color: theme.text,
              marginBottom: '1rem'
            }}>
              كيف تعمل المنصة؟
            </h2>
            <p style={{
              fontSize: '1.25rem',
              color: theme.textSecondary,
              maxWidth: '800px',
              margin: '0 auto'
            }}>
              ثلاث خطوات بسيطة لحجز رحلتك المثالية
            </p>
          </motion.div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '2rem',
            '@media (max-width: 768px)': {
              gridTemplateColumns: '1fr'
            }
          }}>
            {[
              {
                step: '1',
                title: 'اختر المرشد',
                description: 'تصفح قائمة المرشدين واختر الأنسب لرحلتك',
                icon: '🔍'
              },
              {
                step: '2',
                title: 'احجز البرنامج',
                description: 'حدد الموعد وادفع عبر المحفظة الإلكترونية',
                icon: '📅'
              },
              {
                step: '3',
                title: 'استمتع بالرحلة',
                description: 'تواصل مع المرشد واستمتع بتجربة فريدة',
                icon: '🎉'
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index === 1 ? 0 : index === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                style={{
                  position: 'relative',
                  textAlign: 'center',
                  backgroundColor: darkMode ? theme.bg : '#f9fafb',
                  padding: '2rem',
                  borderRadius: '1rem',
                  border: darkMode ? `1px solid ${theme.border}` : 'none'
                }}
              >
                <div style={{
                  fontSize: '4rem',
                  marginBottom: '1rem',
                  filter: darkMode ? 'brightness(0.9)' : 'none'
                }}>
                  {item.icon}
                </div>
                <div style={{
                  position: 'absolute',
                  top: '-1rem',
                  [language === 'ar' ? 'right' : 'left']: '-1rem',
                  width: '3rem',
                  height: '3rem',
                  backgroundColor: theme.primary,
                  color: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  boxShadow: theme.shadow
                }}>
                  {item.step}
                </div>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: theme.text,
                  marginBottom: '0.75rem'
                }}>
                  {item.title}
                </h3>
                <p style={{ color: theme.textSecondary }}>{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials - متوافقة مع الوضع الليلي */}
      <section style={{
        padding: '5rem 0',
        backgroundColor: darkMode ? theme.bg : '#f9fafb'
      }}>
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: 'center', marginBottom: '4rem' }}
          >
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 2.5rem)',
              fontWeight: 'bold',
              color: theme.text,
              marginBottom: '1rem'
            }}>
              آراء المستخدمين
            </h2>
            <p style={{
              fontSize: '1.25rem',
              color: theme.textSecondary,
              maxWidth: '800px',
              margin: '0 auto'
            }}>
              ماذا يقول عملاؤنا عن تجربتهم معنا
            </p>
          </motion.div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '2rem',
            '@media (max-width: 1024px)': {
              gridTemplateColumns: 'repeat(2, 1fr)'
            },
            '@media (max-width: 640px)': {
              gridTemplateColumns: '1fr'
            }
          }}>
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                style={{
                  backgroundColor: darkMode ? theme.card : 'white',
                  borderRadius: '1rem',
                  padding: '2rem',
                  boxShadow: theme.shadowLg,
                  border: darkMode ? `1px solid ${theme.border}` : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    style={{
                      width: '4rem',
                      height: '4rem',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: darkMode ? `2px solid ${theme.primary}` : 'none'
                    }}
                  />
                  <div>
                    <h4 style={{ fontWeight: 'bold', color: theme.text }}>{testimonial.name}</h4>
                    <p style={{ fontSize: '0.875rem', color: theme.textSecondary }}>{testimonial.role}</p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem' }}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <FaStar key={i} style={{ color: theme.warning }} />
                  ))}
                </div>

                <p style={{
                  color: theme.textSecondary,
                  lineHeight: '1.6',
                  fontStyle: 'italic'
                }}>
                  "{testimonial.comment}"
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - متوافقة مع الوضع الليلي */}
      <section style={{
        padding: '5rem 0',
        background: darkMode 
          ? `linear-gradient(135deg, ${theme.card}, ${theme.bg})`
          : 'linear-gradient(135deg, #16a34a, #059669)',
        color: darkMode ? theme.text : 'white'
      }}>
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            style={{ maxWidth: '800px', margin: '0 auto' }}
          >
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 2.5rem)',
              fontWeight: 'bold',
              marginBottom: '1.5rem'
            }}>
              انضم إلى آلاف المستخدمين
            </h2>
            <p style={{
              fontSize: '1.25rem',
              marginBottom: '2rem',
              color: darkMode ? theme.textSecondary : '#f3f4f6'
            }}>
              ابدأ رحلتك السياحية مع أفضل المرشدين الآن واستمتع بتجربة فريدة
            </p>
            
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <Link
                to="/register"
                style={{
                  padding: '1rem 2rem',
                  background: darkMode ? theme.primary : '#fbbf24',
                  color: darkMode ? theme.bg : '#111827',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  textDecoration: 'none',
                  transition: 'all 0.3s ease',
                  boxShadow: theme.shadowLg
                }}
              >
                سجل مجاناً
              </Link>
              <Link
                to="/programs"
                style={{
                  padding: '1rem 2rem',
                  background: 'transparent',
                  color: darkMode ? theme.text : 'white',
                  border: `2px solid ${darkMode ? theme.primary : 'white'}`,
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  textDecoration: 'none',
                  transition: 'all 0.3s ease'
                }}
              >
                تصفح البرامج
              </Link>
            </div>

            {/* Trust Badges */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '2rem',
              marginTop: '3rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaShieldAlt style={{ color: darkMode ? theme.primary : '#fbbf24' }} />
                <span>دفع آمن 100%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaClock style={{ color: darkMode ? theme.primary : '#fbbf24' }} />
                <span>دعم فني 24/7</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaStar style={{ color: darkMode ? theme.primary : '#fbbf24' }} />
                <span>مرشدين معتمدين</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer - متوافق مع الوضع الليلي */}
      <footer style={{
        backgroundColor: darkMode ? theme.footer : '#1f2937',
        color: '#f3f4f6',
        padding: '3rem 0'
      }}>
        <div className="container mx-auto px-4">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '2rem',
            '@media (max-width: 768px)': {
              gridTemplateColumns: 'repeat(2, 1fr)'
            },
            '@media (max-width: 480px)': {
              gridTemplateColumns: '1fr'
            }
          }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                Tourist<span style={{ color: theme.primary }}>App</span>
              </h3>
              <p style={{ color: '#9ca3af' }}>
                منصتك المتكاملة لحجز المرشدين السياحيين واكتشاف الأماكن الرائعة
              </p>
            </div>
            <div>
              <h4 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>روابط سريعة</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ marginBottom: '0.5rem' }}>
                  <Link to="/" style={{ color: '#9ca3af', textDecoration: 'none', hover: { color: 'white' } }}>
                    الرئيسية
                  </Link>
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <Link to="/programs" style={{ color: '#9ca3af', textDecoration: 'none', hover: { color: 'white' } }}>
                    البرامج
                  </Link>
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <Link to="/about" style={{ color: '#9ca3af', textDecoration: 'none', hover: { color: 'white' } }}>
                    عن التطبيق
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>الدعم</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ marginBottom: '0.5rem' }}>
                  <Link to="/faq" style={{ color: '#9ca3af', textDecoration: 'none', hover: { color: 'white' } }}>
                    الأسئلة الشائعة
                  </Link>
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <Link to="/privacy" style={{ color: '#9ca3af', textDecoration: 'none', hover: { color: 'white' } }}>
                    سياسة الخصوصية
                  </Link>
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <Link to="/terms" style={{ color: '#9ca3af', textDecoration: 'none', hover: { color: 'white' } }}>
                    شروط الاستخدام
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>تواصل معنا</h4>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <a href="#" style={{ color: '#9ca3af', fontSize: '1.5rem', hover: { color: theme.primary } }}>📱</a>
                <a href="#" style={{ color: '#9ca3af', fontSize: '1.5rem', hover: { color: theme.primary } }}>📘</a>
                <a href="#" style={{ color: '#9ca3af', fontSize: '1.5rem', hover: { color: theme.primary } }}>📷</a>
                <a href="#" style={{ color: '#9ca3af', fontSize: '1.5rem', hover: { color: theme.primary } }}>🐦</a>
              </div>
            </div>
          </div>
          <div style={{
            borderTop: `1px solid ${darkMode ? theme.border : '#374151'}`,
            marginTop: '2rem',
            paddingTop: '2rem',
            textAlign: 'center',
            color: '#9ca3af'
          }}>
            <p>جميع الحقوق محفوظة © 2026 TouristApp</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;