import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Heart, 
  Search, 
  MapPin, 
  Star, 
  Users, 
  MessageCircle,
  ArrowRight,
  Calendar,
  Shield,
  Award,
  Play,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { petAPI, generalAPI, postAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import RecommendationSection from '../components/RecommendationSection';

const HomePage = () => {
  const [featuredPets, setFeaturedPets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    available: 0,
    adopted: 0,
    pending: 0,
    bySpecies: []
  });
  const [loading, setLoading] = useState(true);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  
  // Story 1.2: 檢查使用者登入狀態
  const isAuthenticated = !!localStorage.getItem('token');
  const queryClient = useQueryClient();
  
  // Story 1.2: 取得推薦寵物
  const { 
    data: recommendationsData, 
    isLoading: isLoadingRecommendations,
    refetch: refetchRecommendations
  } = useQuery(
    'recommendations',
    () => generalAPI.getRecommendations({ limit: 8 }),
    {
      enabled: isAuthenticated, // 僅登入使用者啟用推薦
      select: (response) => response.data,
      staleTime: 60 * 60 * 1000, // 1 小時
      retry: 1, // 失敗只重試一次
      onError: () => {
        // 靜默處理錯誤，不顯示訊息
      }
    }
  );
  
  // Story 1.2: 重新整理推薦
  const refreshMutation = useMutation(
    () => generalAPI.refreshRecommendations(),
    {
      onSuccess: () => {
        refetchRecommendations();
        toast.success('推薦已更新！');
      },
      onError: (error) => {
        // 靜默處理錯誤
        console.warn('更新推薦失敗:', error);
      }
    }
  );

  // 從社群貼文抓取領養故事（若無則使用靜態範例）
  const { data: adoptionStoriesData, isLoading: isLoadingStories } = useQuery(
    ['adoptionStories'],
    // 取得較多的領養故事，前端再隨機抽 5 篇展示，確保每次開啟平台內容不同
    () => postAPI.getPosts({ type: 'adoption-story', limit: 100, sort: 'publishedAt' }),
    {
      select: (res) => res.data.data,
      refetchOnMount: 'always',
      refetchInterval: 60 * 1000, // 每 60s 自動更新，讓新貼文能較快出現在佈告欄
      onSuccess: (data) => {
        console.log('載入領養故事:', data.posts?.length || 0);
      },
      onError: (err) => {
        console.warn('載入領養故事失敗:', err?.message || err);
      }
    }
  );

  const fetchedStories = adoptionStoriesData?.posts || [];

  // 從 fetchedStories 隨機抽取最多 5 篇，使用 useMemo 在資料改變時重新抽樣
  const sampledStories = useMemo(() => {
    if (!fetchedStories || fetchedStories.length === 0) return [];

    // Fisher-Yates shuffle 的淺拷貝
    const arr = fetchedStories.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr.slice(0, 5);
  }, [fetchedStories]);

  // 推薦內容（使用後端領養故事轉換為 testimonial 格式，若無文章則回退到靜態示例）
  // 轉換用於輪播顯示的 testimonials：以 sampledStories 為來源（優先使用隨機抽樣結果），若沒有則回退到靜態示例
  const testimonials = sampledStories.length > 0 ? sampledStories.map((post) => ({
    id: post._id,
    name: post.author?.firstName || post.author?.username || '匿名',
    pet: post.relatedPets?.[0]?.name || post.title || '毛小孩',
    content: post.excerpt || (post.content ? (post.content.length > 200 ? post.content.substring(0, 200) + '...' : post.content) : ''),
    // 只有當作者或貼文/相關寵物有真實圖片時才帶圖片，否則留為 null，避免自動帶入虛擬佔位圖
    image: post.author?.avatar_url || null,
    petImage: (post.images && post.images.length > 0 && post.images[0].url)
      ? post.images[0].url
      : (post.relatedPets?.[0]?.photos?.[0]?.url ? post.relatedPets[0].photos[0].url : null),
    rating: 5
  })) : [
    {
      id: 1,
      name: '陳小美',
      pet: '小白',
      content: '透過這個平台，我找到了我的最佳夥伴小白。整個認養流程非常順利，工作人員也很貼心。',
      image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80',
      petImage: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
      rating: 5
    },
    {
      id: 2,
      name: '王大明',
      pet: '咪咪',
      content: '這個平台讓我們全家都找到了快樂。咪咪現在是我們家不可或缺的一員。',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80',
      petImage: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
      rating: 5
    },
    {
      id: 3,
      name: '李志華',
      pet: '旺旺',
      content: '感謝平台讓我遇見旺旺，牠改變了我的生活，每天都充滿歡笑。',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80',
      petImage: 'https://images.unsplash.com/photo-1552053831-71594a27632d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
      rating: 5
    }
  ];

  const features = [
    {
      icon: <Search className="w-8 h-8" />,
      title: '智慧搜尋',
      description: '使用 AI 技術，根據您的偏好找到最適合的毛孩'
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: '安全保障',
      description: '完善的審核機制，確保每一次認養都是負責任的'
    },
    {
      icon: <MessageCircle className="w-8 h-8" />,
      title: '即時溝通',
      description: '與送養人直接溝通，了解寵物的詳細資訊'
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: '專業服務',
      description: '專業團隊提供認養前後的諮詢和支援服務'
    }
  ];

  const adoptionSteps = [
    {
      step: 1,
      title: '瀏覽動物',
      description: '在我們的平台上瀏覽可認養的毛小孩，找到心儀的伴侶。',
    },
    {
      step: 2,
      title: '提交申請',
      description: '填寫詳細的認養申請表，讓我們了解您的家庭環境。',
    },
    {
      step: 3,
      title: '審核評估',
      description: '我們會仔細評估您的申請，確保配對的適合性。',
    },
    {
      step: 4,
      title: '見面配對',
      description: '安排您與心儀的動物見面，確認彼此的緣分。',
    },
    {
      step: 5,
      title: '完成認養',
      description: '簽署認養協議，帶您的新家人回家開始新生活。',
    },
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  // 自動輪播：使用 ref 可在手動切換時重置計時器，避免立即又自動切換
  const autoRotateRef = useRef(null);
  const AUTO_ROTATE_INTERVAL = 5000;

  const startAutoRotate = () => {
    if (autoRotateRef.current) clearInterval(autoRotateRef.current);
    if (!testimonials || testimonials.length === 0) return;
    autoRotateRef.current = setInterval(() => {
      setCurrentTestimonial((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
    }, AUTO_ROTATE_INTERVAL);
  };

  const resetAutoRotate = () => {
    if (autoRotateRef.current) clearInterval(autoRotateRef.current);
    // 重新啟動計時器
    startAutoRotate();
  };

  useEffect(() => {
    if (!testimonials || testimonials.length === 0) return;

    // 確保索引在範圍內
    setCurrentTestimonial((prev) => (prev >= testimonials.length ? 0 : prev));

    startAutoRotate();

    return () => {
      if (autoRotateRef.current) clearInterval(autoRotateRef.current);
    };
  }, [testimonials.length]);

  // 當 stories 長度或索引變化時，確保 currentTestimonial 在範圍內
  useEffect(() => {
    if (!testimonials || testimonials.length === 0) {
      setCurrentTestimonial(0);
    } else if (currentTestimonial >= testimonials.length) {
      setCurrentTestimonial(0);
    }
  }, [testimonials.length, currentTestimonial]);

  // 前後切換函式（放在 component scope，供按鈕使用）
  const goPrevTestimonial = () => {
    if (!testimonials || testimonials.length === 0) return;
    setCurrentTestimonial((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
    resetAutoRotate();
  };

  const goNextTestimonial = () => {
    if (!testimonials || testimonials.length === 0) return;
    setCurrentTestimonial((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
    resetAutoRotate();
  };

  const goToTestimonial = (index) => {
    if (!testimonials || testimonials.length === 0) return;
    setCurrentTestimonial(index);
    resetAutoRotate();
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // 並行載入資料 - 使用預設值避免錯誤
      const [petsResponse, statsResponse] = await Promise.all([
        petAPI.getFeaturedPets(6).catch((err) => {
          console.log('使用模擬寵物資料');
          return { data: [] };
        }),
        generalAPI.getStats().catch((err) => {
          console.log('使用模擬統計資料');
          return { data: { available: 0, adopted: 0, pending: 0, bySpecies: [] } };
        })
      ]);

      if (petsResponse.data) {
        setFeaturedPets(Array.isArray(petsResponse.data) ? petsResponse.data : []);
      }

      if (statsResponse.data) {
        // 後端回應結構為 { success: true, data: { ... } }
        const payload = statsResponse.data.data || statsResponse.data;
        setStats(payload);
      }
    } catch (error) {
      console.error('載入首頁資料失敗:', error);
      // 不顯示錯誤訊息，因為已經有預設值
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/pets?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  return (
    <motion.div 
      className="min-h-screen"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        
        <div className="container mx-auto px-4 z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div variants={itemVariants} className="space-y-8">
              <div className="space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  台灣最信賴的認養平台
                </motion.div>
                
                <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  給每個毛孩
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                    溫暖的家
                  </span>
                </h1>
                
                <p className="text-xl text-gray-600 leading-relaxed">
                  我們致力於連結有愛心的家庭與需要家的毛孩們，
                  透過科技讓認養變得更簡單、更安全、更有意義。
                </p>
              </div>

              {/* 搜尋框 */}
              <motion.form
                variants={itemVariants}
                onSubmit={handleSearch}
                className="flex flex-col sm:flex-row gap-4"
              >
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="搜尋您理想的毛孩..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-2xl hover:shadow-lg transition-all duration-200 flex items-center justify-center"
                >
                  開始尋找
                  <ArrowRight className="ml-2 w-5 h-5" />
                </motion.button>
              </motion.form>

              {/* 統計數據 */}
              <motion.div
                variants={itemVariants}
                className="grid grid-cols-2 lg:grid-cols-4 gap-6"
              >
                {[
                  { label: '待認養寵物', value: stats.available, icon: Heart },
                  { label: '成功配對', value: stats.adopted, icon: Star },
                  { label: '愛心家庭', value: stats.importedPets ?? 0, icon: Users },
                  { label: '動物種類', value: stats.bySpecies?.length || 0, icon: MessageCircle }
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.05 }}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg border border-gray-100"
                  >
                    <stat.icon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{(stat.value ?? 0).toLocaleString()}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* Hero 圖片 */}
            <motion.div
              variants={itemVariants}
              className="relative"
            >
              <motion.div
                animate={{ 
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative z-10"
              >
                <img
                  src="https://images.unsplash.com/photo-1601758228041-f3b2795255f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="可愛的寵物們"
                  className="w-full h-auto rounded-3xl shadow-2xl"
                />
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* 背景裝飾 */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </section>

      {/* 特色功能 */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            variants={itemVariants}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              為什麼選擇我們？
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              我們提供最完善的認養服務，讓每個毛孩都能找到最適合的家庭
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -10 }}
                className="text-center p-8 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:shadow-xl transition-all duration-300"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Story 1.2: 個人化推薦區塊 (僅登入使用者) */}
      {isAuthenticated && (
        <RecommendationSection
          recommendations={recommendationsData?.recommendations || []}
          isLoading={isLoadingRecommendations}
          hasPreferences={recommendationsData?.hasPreferences}
          onRefresh={() => refreshMutation.mutate()}
          isRefreshing={refreshMutation.isLoading}
        />
      )}

      {/* 推薦寵物 */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            variants={itemVariants}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              等待認養的毛孩們
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              每一個毛孩都有自己的故事，他們正在等待一個溫暖的家
            </p>
          </motion.div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="bg-white rounded-2xl overflow-hidden shadow-lg animate-pulse">
                  <div className="h-64 bg-gray-300"></div>
                  <div className="p-6 space-y-4">
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                    <div className="h-10 bg-gray-300 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredPets.map((pet, index) => (
                <motion.div
                  key={pet._id || index}
                  variants={itemVariants}
                  whileHover={{ y: -10 }}
                  className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <div className="relative">
                    <img
                      src={pet.primaryPhoto?.url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'}
                      alt={pet.name || '可愛寵物'}
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg">
                      <Heart className="w-5 h-5 text-gray-400 hover:text-red-500 cursor-pointer transition-colors" />
                    </div>
                    <div className="absolute bottom-4 left-4">
                      <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                        {pet.species === 'dog' ? '狗狗' : pet.species === 'cat' ? '貓咪' : '其他'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{pet.name || '可愛寵物'}</h3>
                      <span className="text-sm text-gray-500">{pet.ageDescription || '年輕'}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600 mb-4">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span className="text-sm">{pet.shelterInfo?.location || '台灣'}</span>
                    </div>
                    
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {pet.description || '這是一隻可愛的毛孩，正在尋找溫暖的家。'}
                    </p>
                    
                    <Link
                      to={`/pets/${pet._id || '#'}`}
                      className="block w-full text-center py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200"
                    >
                      了解更多
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <motion.div
            variants={itemVariants}
            className="text-center mt-12"
          >
            <Link
              to="/pets"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-2xl hover:shadow-lg transition-all duration-200"
            >
              查看所有寵物
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 認養流程 */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            variants={itemVariants}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              認養流程
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              簡單五個步驟，就能為毛小孩找到新家，也為您的生活增添無限歡樂。
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {adoptionSteps.map((step, index) => (
              <motion.div 
                key={index} 
                variants={itemVariants}
                className="text-center relative"
              >
                {index < adoptionSteps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gray-300 transform -translate-y-1/2 z-0"></div>
                )}
                <div className="relative z-10">
                  <motion.div 
                    whileHover={{ scale: 1.1 }}
                    className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl"
                  >
                    {step.step}
                  </motion.div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            variants={itemVariants}
            className="text-center mt-12"
          >
            <Link
              to="/pets"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-2xl hover:shadow-lg transition-all duration-200"
            >
              開始認養之旅
              <Heart className="ml-2 w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 成功故事 */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            variants={itemVariants}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              成功配對的溫馨故事
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              聽聽那些找到家的毛孩和他們新家庭的溫暖故事
            </p>
          </motion.div>

          <div className="relative max-w-4xl mx-auto">
            {/* 左右箭頭 */}
            <button
              onClick={goPrevTestimonial}
              aria-label="上一則故事"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white shadow-md hover:bg-gray-100"
              style={{ transform: 'translate(-50%, -50%)' }}
            >
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </button>

            <button
              onClick={goNextTestimonial}
              aria-label="下一則故事"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white shadow-md hover:bg-gray-100"
              style={{ transform: 'translate(50%, -50%)' }}
            >
              <ChevronRight className="w-6 h-6 text-gray-700" />
            </button>

            <AnimatePresence mode="wait">
              {testimonials[currentTestimonial] && (
                (sampledStories.length > 0 && testimonials[currentTestimonial].id)
                  ? (
                    <Link
                      to={`/community/${testimonials[currentTestimonial].id}`}
                      key={testimonials[currentTestimonial].id}
                      className="block"
                    >
                      <motion.div
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ duration: 0.5 }}
                        className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-8 lg:p-12"
                      >
                        <div className="grid lg:grid-cols-2 gap-8 items-center">
                          <div>
                            <div className="flex items-center mb-6">
                              {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                                <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                              ))}
                            </div>
                            
                            <blockquote className="text-xl text-gray-700 mb-6 leading-relaxed">
                              "{testimonials[currentTestimonial].content}"
                            </blockquote>
                            
                            <div className="flex items-center">
                              {testimonials[currentTestimonial].image ? (
                                <img
                                  src={testimonials[currentTestimonial].image}
                                  alt={testimonials[currentTestimonial].name}
                                  className="w-12 h-12 rounded-full object-cover mr-4"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gray-200 mr-4 flex items-center justify-center text-sm text-gray-600">
                                  {testimonials[currentTestimonial].name ? testimonials[currentTestimonial].name.charAt(0) : ''}
                                </div>
                              )}
                              <div>
                                <div className="font-semibold text-gray-900">
                                  {testimonials[currentTestimonial].name}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {testimonials[currentTestimonial].pet} 的新家長
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="relative">
                            {testimonials[currentTestimonial].petImage ? (
                              <img
                                src={testimonials[currentTestimonial].petImage}
                                alt={testimonials[currentTestimonial].pet}
                                className="w-full h-80 object-cover rounded-2xl shadow-xl"
                              />
                            ) : (
                              <div className="w-full h-80 bg-gray-100 rounded-2xl flex items-center justify-center">
                                <div className="text-center">
                                  <div className="font-semibold text-gray-900">{testimonials[currentTestimonial].pet}</div>
                                  <div className="text-xs text-gray-600">已找到家</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  ) : (
                    <div
                      key={`fallback-${currentTestimonial}`}
                      className="block"
                    >
                      <motion.div
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ duration: 0.5 }}
                        className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-8 lg:p-12"
                      >
                        <div className="grid lg:grid-cols-2 gap-8 items-center">
                          <div>
                            <div className="flex items-center mb-6">
                              {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                                <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                              ))}
                            </div>
                            
                            <blockquote className="text-xl text-gray-700 mb-6 leading-relaxed">
                              "{testimonials[currentTestimonial].content}"
                            </blockquote>
                            
                            <div className="flex items-center">
                              {testimonials[currentTestimonial].image ? (
                                <img
                                  src={testimonials[currentTestimonial].image}
                                  alt={testimonials[currentTestimonial].name}
                                  className="w-12 h-12 rounded-full object-cover mr-4"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gray-200 mr-4 flex items-center justify-center text-sm text-gray-600">
                                  {testimonials[currentTestimonial].name ? testimonials[currentTestimonial].name.charAt(0) : ''}
                                </div>
                              )}
                              <div>
                                <div className="font-semibold text-gray-900">
                                  {testimonials[currentTestimonial].name}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {testimonials[currentTestimonial].pet} 的新家長
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="relative">
                            {testimonials[currentTestimonial].petImage ? (
                              <img
                                src={testimonials[currentTestimonial].petImage}
                                alt={testimonials[currentTestimonial].pet}
                                className="w-full h-80 object-cover rounded-2xl shadow-xl"
                              />
                            ) : (
                              <div className="w-full h-80 bg-gray-100 rounded-2xl flex items-center justify-center">
                                <div className="text-center">
                                  <div className="font-semibold text-gray-900">{testimonials[currentTestimonial].pet}</div>
                                  <div className="text-xs text-gray-600">已找到家</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  )
              )}
            </AnimatePresence>

            {/* 指示器 */}
            <div className="flex justify-center mt-8 space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-200 ${
                    index === currentTestimonial 
                      ? 'bg-blue-600 scale-125' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            variants={itemVariants}
            className="max-w-3xl mx-auto text-white"
          >
            <h2 className="text-4xl font-bold mb-6">
              準備好迎接新的家庭成員了嗎？
            </h2>
            <p className="text-xl mb-8 opacity-90">
              立即開始尋找您的完美夥伴，或是分享您想要送養的毛孩資訊
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/pets"
                className="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-2xl hover:bg-gray-50 transition-all duration-200"
              >
                開始認養
                <Heart className="ml-2 w-5 h-5" />
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-2xl hover:bg-white hover:text-blue-600 transition-all duration-200"
              >
                加入我們
                <Users className="ml-2 w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
};

export default HomePage;