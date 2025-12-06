import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Heart,
  MapPin,
  Stethoscope,
  DollarSign,
  Phone,
  Mail,
  ExternalLink,
  Search,
  Filter,
  Info
} from 'lucide-react';

const ResourcesPage = () => {
  const [activeTab, setActiveTab] = useState('medical');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');

  // 醫療資源資料
  const medicalResources = [
    {
      id: 1,
      name: '博愛動物醫院',
      type: '動物醫院 / 寵物醫院',
      city: '台北市',
      address: '台北市中正區杭州南路二段 92 號 1 樓',
      phone: '02-3393-8850',
      services: ['一般門診', '手術', '急診', '健檢'],
      discount: '',
      website: 'https://www.poaipets.com.tw/',
      openHours: '09:30–12:30, 14:00–18:00, 19:00–21:30'
    },
    {
      id: 2,
      name: '汎亞動物醫院',
      type: '動物診療機構',
      city: '台北市',
      address: '台北市士林區承德路四段 183號 1 樓',
      phone: '02-2882-6655',
      services: ['一般門診', '手術', '急診'],
      discount: '',
      website: 'https://www.facebook.com/panasiavet/?locale=zh_TW',
      openHours: '10:00–12:30, 14:00–21:00'
    },
    {
      id: 3,
      name: '安心動物醫院',
      type: '動物醫院',
      city: '台北市',
      address: '台北市文山區羅斯福路五段 17 號',
      phone: '02-2932-6935',
      services: ['一般門診', '健檢'],
      discount: '',
      website: 'https://www.facebook.com/p/%E5%AE%89%E5%BF%83%E5%8B%95%E7%89%A9%E9%86%AB%E9%99%A2-100063825224729/?locale=zh_TW',
      openHours: '10:00–12:00, 15:00–18:00'
    }
  ];

  // 寵物友善地標
  const friendlyPlaces = [
    {
      id: 1,
      name: '浪浪別哭（台北店）',
      type: '中途之家＋寵物友善咖啡廳 / 餐廳',
      city: '台北市',
      address: '台北市中正區林森北路 9 巷 13 號',
      phone: '02-2356-0766',
      website: 'https://www.langlangdontcry.com.tw/',
      features: ['中途之家', '寵物友善咖啡廳', '餐飲服務'],
      openHours: '12:00–21:00'
    },
    {
      id: 2,
      name: '台北鳥店街',
      type: '主題寵物鳥用品集中商街（多間鳥類用品店聚集）',
      city: '台北市',
      address: '台北市萬華區和平西路三段（艋舺大道與南寧路之間）',
      phone: '',
      website: '',
      features: ['鳥類用品店集中', '主題商街'],
      openHours: '10:00–22:00'
    }
  ];

  // 贊助機構
  const sponsorOrganizations = [
    {
      id: 1,
      name: '臺北市流浪貓保護協會 (SCPA Taipei)',
      type: '流浪動物保護協會（主要以貓為主）',
      city: '台北市',
      description: '',
      phone: '02-2726-1079',
      email: '',
      website: 'https://scpa.eoffering.org.tw/',
      donationLink: 'https://scpa.eoffering.org.tw/',
      programs: [],
      openHours: '14:00–20:00',
      address: '110臺北市信義區信義路六段81號１樓'
    },
    {
      id: 2,
      name: '社團法人台灣流浪動物救援協會 (THARA / Taiwan Homeless Animals Rescue Association)',
      type: '公益救援協會',
      city: '嘉義縣',
      description: '',
      phone: '(05)226-9595',
      email: '',
      website: 'https://thara.eoffering.org.tw/',
      donationLink: 'https://thara.eoffering.org.tw/',
      programs: [],
      openHours: '14:00–17:00',
      address: '621嘉義縣民雄鄉民溪路80號'
    },
    {
      id: 3,
      name: '台灣動物保護協進會 (TAPADogs / Taiwan Animal Protection Association)',
      type: '動物保護組織 / 協會',
      city: '',
      description: '',
      phone: '0970-831318',
      email: '',
      website: 'https://www.tapadogs.org.tw/',
      donationLink: 'https://www.tapadogs.org.tw/',
      programs: [],
      openHours: '',
      address: ''
    }
  ];

  const tabs = [
    { id: 'medical', label: '醫療資源', icon: <Stethoscope className="w-5 h-5" /> },
    { id: 'places', label: '友善地標', icon: <MapPin className="w-5 h-5" /> },
    { id: 'sponsors', label: '贊助機構', icon: <Heart className="w-5 h-5" /> }
  ];

  const cities = ['all', '台北市', '新北市', '台中市'];

  const getMapLink = (address) => {
    if (!address || !address.trim()) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  const filterData = (data) => {
    return data.filter(item => {
      const matchCity = selectedCity === 'all' || item.city === selectedCity;
      const matchSearch = searchQuery === '' || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCity && matchSearch;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">寵物資源整合</h1>
          <p className="text-lg text-gray-600">為您整理完整的寵物醫療、友善場所與贊助資訊</p>
        </motion.div>

        {/* 分類標籤 */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <div className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                    activeTab === tab.id ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 搜尋和篩選 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" placeholder="搜尋名稱..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600" />
            </div>
            <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}
              className="pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 appearance-none bg-white"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}>
              {cities.map(city => (<option key={city} value={city}>{city === 'all' ? '所有縣市' : city}</option>))}
            </select>
          </div>
        </div>

        {/* 內容區域 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {activeTab === 'medical' && filterData(medicalResources).map((resource) => (
            <div key={resource.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{resource.name}</h3>
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm mb-3">{resource.type}</span>
              <div className="space-y-2 mb-4 flex-grow">
                <div className="flex items-center text-sm text-gray-600"><MapPin className="w-4 h-4 mr-2" />{resource.address}</div>
                <div className="flex items-center text-sm text-gray-600"><Phone className="w-4 h-4 mr-2" />{resource.phone && resource.phone.trim() ? resource.phone : '—'}</div>
                <div className="flex items-center text-sm text-gray-600"><Info className="w-4 h-4 mr-2" />開放時間：{resource.openHours && resource.openHours.trim() ? resource.openHours : '—'}</div>
              </div>
              {resource.discount && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-orange-800 font-medium"> {resource.discount}</p>
                </div>
              )}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">提供服務：</p>
                <div className="flex flex-wrap gap-2">
                  {resource.services.map((service, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{service}</span>
                  ))}
                </div>
              </div>
              <div className="mt-auto">
                {getMapLink(resource.address) ? (
                  <a href={getMapLink(resource.address)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all">
                    快速導航
                  </a>
                ) : (
                  <div className="text-center text-sm text-gray-500">—</div>
                )}
              </div>
            </div>
          ))}

          {activeTab === 'places' && filterData(friendlyPlaces).map((place) => (
            <div key={place.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{place.name}</h3>
              <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm mb-3">{place.type}</span>
              <div className="space-y-2 mb-4 flex-grow">
                <div className="flex items-center text-sm text-gray-600"><MapPin className="w-4 h-4 mr-2" />{place.address}</div>
                <div className="flex items-center text-sm text-gray-600"><Phone className="w-4 h-4 mr-2" />{place.phone && place.phone.trim() ? place.phone : '—'}</div>
                <div className="flex items-center text-sm text-gray-600"><Info className="w-4 h-4 mr-2" />開放時間：{place.openHours}</div>
                <div className="flex items-center text-sm text-gray-600">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {place.website && place.website.trim() ? (
                    <a href={place.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{place.website}</a>
                  ) : (
                    '—'
                  )}
                </div>
              </div>
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">特色設施：</p>
                <div className="flex flex-wrap gap-2">
                  {place.features.map((feature, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{feature}</span>
                  ))}
                </div>
              </div>
              <div className="mt-auto">
                {getMapLink(place.address) ? (
                  <a href={getMapLink(place.address)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all">
                    快速導航
                  </a>
                ) : (
                  <div className="text-center text-sm text-gray-500">—</div>
                )}
              </div>
            </div>
          ))}

          {activeTab === 'sponsors' && filterData(sponsorOrganizations).map((org) => (
            <div key={org.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{org.name}</h3>
              <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm mb-3">{org.type}</span>
              <p className="text-gray-600 text-sm mb-4">{org.description}</p>
              <div className="space-y-2 mb-4 flex-grow">
                <div className="flex items-center text-sm text-gray-600"><MapPin className="w-4 h-4 mr-2" />{org.address && org.address.trim() ? org.address : '—'}</div>
                <div className="flex items-center text-sm text-gray-600"><Phone className="w-4 h-4 mr-2" />{org.phone && org.phone.trim() ? org.phone : '—'}</div>
                <div className="flex items-center text-sm text-gray-600"><Info className="w-4 h-4 mr-2" />營業時間：{org.openHours && org.openHours.trim() ? org.openHours : '—'}</div>
                <div className="flex items-center text-sm text-gray-600">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {org.website && org.website.trim() ? (
                    <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{org.website}</a>
                  ) : (
                    '—'
                  )}
                </div>
              </div>
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">執行項目：</p>
                <div className="flex flex-wrap gap-2">
                  {org.programs && org.programs.length > 0 ? org.programs.map((program, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{program}</span>
                  )) : <span className="text-xs text-gray-500">—</span>}
                </div>
              </div>
              <div className="mt-auto space-y-2">
                { (org.website && org.website.trim()) ? (
                  <a href={org.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-2 rounded-lg font-semibold transition-all">
                    我要贊助
                  </a>
                ) : (
                  <div className="text-center text-sm text-gray-500">—</div>
                )}
                {org.donationLink && org.donationLink.trim() && (org.donationLink !== org.website) && (
                  <a href={org.donationLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full border border-gray-200 text-gray-700 py-2 rounded-lg font-semibold transition-all">
                    <DollarSign className="w-4 h-4" />另行贊助連結
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResourcesPage;
