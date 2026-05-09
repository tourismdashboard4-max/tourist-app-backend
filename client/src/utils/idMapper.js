// client/src/utils/idMapper.js
const API_BASE = 'https://tourist-app-api.onrender.com';

// خريطة لتخزين التحويلات مؤقتاً
let uuidToOldIdMap = new Map();
let oldIdToUuidMap = new Map();

export const loadGuidesMapping = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/guides`);
    let guidesList = [];
    
    if (response.data?.data?.guides) guidesList = response.data.data.guides;
    else if (response.data?.guides) guidesList = response.data.guides;
    else if (Array.isArray(response.data)) guidesList = response.data;
    else if (response.data?.data && Array.isArray(response.data.data)) guidesList = response.data.data;

    guidesList.forEach(guide => {
      const uuid = guide.id || guide.uuid;
      const numericId = guide.old_id;
      if (uuid && numericId && !isNaN(Number(numericId))) {
        uuidToOldIdMap.set(uuid, Number(numericId));
        oldIdToUuidMap.set(String(numericId), uuid);
      }
    });
    
    console.log(`✅ Loaded ${uuidToOldIdMap.size} guide mappings`);
    return { uuidToOldIdMap, oldIdToUuidMap };
  } catch (err) {
    console.error('Failed to load guides mapping:', err);
    return { uuidToOldIdMap, oldIdToUuidMap };
  }
};

export const getRealUuid = async (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  // إذا كان بالفعل UUID
  if (typeof id === 'string' && uuidRegex.test(id)) {
    return id;
  }
  
  // إذا كان old_id رقمي
  if (!isNaN(Number(id))) {
    const cached = oldIdToUuidMap.get(String(id));
    if (cached) return cached;
    
    // محاولة جلب من API
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/users/${id}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      const data = await response.json();
      if (data.success && data.user?.id) {
        oldIdToUuidMap.set(String(id), data.user.id);
        return data.user.id;
      }
    } catch (e) {
      console.warn('Failed to fetch user:', e);
    }
  }
  
  return null;
};

export const getOldId = (uuid) => {
  return uuidToOldIdMap.get(uuid) || null;
};
