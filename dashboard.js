/* ARTECH Robot Management Platform - Đăng nhập & Dashboard */
(function () {
  'use strict';

  const API_BASE = String(window.ARTECH_API_BASE_URL || window.ARTECH_API_BASE || localStorage.getItem('artech_api_base_url') || 'http://localhost:3000').replace(/\/$/, '');
  const TOKEN_KEY = 'artech_auth_token_v3';
  const PENDING_LOGIN_OTP_KEY = 'artech_pending_login_otp_v1';
  const APP_KEY = 'artech_dashboard_data_v6_backend_cache';
  const FRONTEND_ONLY_KEY = 'artech_dashboard_frontend_only_v1';
  const DEMO_DATA = location.search.includes('demo=1');

  const app = document.getElementById('app');
  let currentUser = null;
  let currentTab = 'robots';
  let authView = location.hash === '#register' ? 'register' : location.hash === '#forgot' ? 'forgot' : location.hash === '#otp' ? 'otp' : 'login';
  let pendingLoginOtp = loadPendingLoginOtp();
  let pendingLoginCredentials = null;
  let landingCategory = 'all';
  let knowledgeFilter = 'all';
  let selectedKnowledgeId = null;
  let knowledgeTextDraft = '';
  let selectedAlbumId = null;
  let dashboardData = loadDashboardData();

  const icon = {
    robot: '<svg class="nav-icon" viewBox="0 0 24 24"><path d="M7 12h10"/><path d="M9 7h6"/><path d="M6 12v7h12v-7"/><path d="M8 19v2"/><path d="M16 19v2"/><path d="M12 7V3"/><circle cx="12" cy="3" r="1"/><circle cx="9" cy="15" r="1"/><circle cx="15" cy="15" r="1"/></svg>',
    area: '<svg class="nav-icon" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/><path d="M7 4v16"/><path d="M17 4v16"/><circle cx="12" cy="12" r="2"/></svg>',
    database: '<svg class="nav-icon" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5"/><path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/></svg>',
    image: '<svg class="nav-icon" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="m21 16-5-5L5 19"/></svg>',
    brain: '<svg class="nav-icon" viewBox="0 0 24 24"><path d="M8 8a4 4 0 1 1 8 0"/><path d="M7 12a4 4 0 1 0 4 4"/><path d="M17 12a4 4 0 1 1-4 4"/><path d="M12 8v10"/><path d="M9 13h6"/></svg>',
    card: '<svg class="nav-icon" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/></svg>',
    help: '<svg class="nav-icon" viewBox="0 0 24 24"><path d="M9 9a3 3 0 1 1 5 2.2c-1 .7-2 1.4-2 2.8"/><path d="M12 18h.01"/><rect x="4" y="3" width="16" height="18" rx="2"/></svg>',
    logout: '<svg class="nav-icon" viewBox="0 0 24 24"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M21 19V5"/></svg>',
    search: '<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    close: '<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    plus: '<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
    upload: '<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M20 16v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3"/></svg>',
    trash: '<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 15h10l1-15"/><path d="M10 11v6M14 11v6"/></svg>',
    save: '<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>'
  };

  const statuses = {
    active: { label: 'Đang hoạt động', cls: 'status-active' },
    charging: { label: 'Đang sạc', cls: 'status-charging' },
    connecting: { label: 'Đang kết nối', cls: 'status-connecting' },
    offline: { label: 'Dừng hoạt động', cls: 'status-offline' },
    stop: { label: 'Dừng hoạt động', cls: 'status-stop' }
  };

  const areaStatuses = {
    active: { label: 'Được sử dụng', cls: 'area-status-active' },
    inactive: { label: 'Không được sử dụng', cls: 'area-status-inactive' }
  };

  function normalizeAreaStatus(status) {
    return ['inactive', 'offline', 'stop', 'maintenance', 'draft'].includes(String(status || '').toLowerCase()) ? 'inactive' : 'active';
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function fixMojibakeText(value = '') {
    const text = String(value ?? '');

    // Sửa lỗi phổ biến khi tên file tiếng Việt UTF-8 bị backend/multer đọc thành latin1,
    // ví dụ: "Sao chÃ©p", "áº£nh", "dá»¯ liá»‡u".
    if (!/[ÃÂÄÅÆÐ]|áº|á»/.test(text)) {
      return text;
    }

    try {
      const bytes = new Uint8Array(Array.from(text).map(char => char.charCodeAt(0) & 0xff));
      const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      return decoded || text;
    } catch {
      return text;
    }
  }

  function uid(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function saveDashboardData() {
    localStorage.setItem(APP_KEY, JSON.stringify(dashboardData));
  }

  function demoImageSrc(title, subtitle, start = '#dbeafe', end = '#003366') {
    const safeTitle = String(title || 'ARTECH').replace(/[<>&]/g, '');
    const safeSubtitle = String(subtitle || 'Robot Image').replace(/[<>&]/g, '');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${start}"/><stop offset="1" stop-color="${end}"/></linearGradient><filter id="b"><feGaussianBlur stdDeviation="18"/></filter></defs><rect width="900" height="600" fill="url(#g)"/><circle cx="740" cy="90" r="160" fill="rgba(255,255,255,.20)" filter="url(#b)"/><circle cx="150" cy="520" r="190" fill="rgba(255,255,255,.16)" filter="url(#b)"/><rect x="72" y="78" width="756" height="444" rx="38" fill="rgba(255,255,255,.16)" stroke="rgba(255,255,255,.38)"/><text x="90" y="430" font-family="Segoe UI, Arial" font-size="44" font-weight="800" fill="white">${safeTitle}</text><text x="92" y="478" font-family="Segoe UI, Arial" font-size="22" font-weight="600" fill="rgba(255,255,255,.86)">${safeSubtitle}</text><text x="90" y="132" font-family="Consolas, monospace" font-size="18" font-weight="700" fill="rgba(255,255,255,.82)">ARTECH ROBOTICS</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function demoAlbumImages(album, index = 0) {
    const base = album?.name || 'Album ARTECH';
    const palettes = [
      ['#dbeafe', '#003366'], ['#e0f2fe', '#0f172a'], ['#ccfbf1', '#064e7a'], ['#ede9fe', '#1e1b4b']
    ];
    return [0, 1, 2].map(i => {
      const p = palettes[(index + i) % palettes.length];
      return { id: `demo_${index}_${i}`, name: `Ảnh mẫu #${i + 1}`, src: demoImageSrc(base, `Ảnh mô phỏng ${i + 1}`, p[0], p[1]), demo: true };
    });
  }


  function demoAreaMapImage(title, variant = 0) {
    const safeTitle = String(title || 'Khu vực hoạt động').replace(/[<>&]/g, '');
    const palettes = [
      ['#f8fafc', '#cbd5e1', '#2563eb', '#16a34a'],
      ['#f8fafc', '#d1d5db', '#0ea5e9', '#7c3aed'],
      ['#f8fafc', '#d6d3d1', '#ef4444', '#22c55e'],
      ['#f9fafb', '#d4d4d8', '#0284c7', '#f59e0b']
    ];
    const p = palettes[variant % palettes.length];
    const routeVariants = [
      'M118 206 C170 188, 226 142, 252 118 S334 82, 398 114',
      'M112 182 C156 156, 206 130, 246 132 S326 164, 394 204',
      'M108 212 C146 188, 190 160, 242 160 S332 180, 404 230',
      'M124 170 C172 152, 220 118, 272 120 S352 154, 410 188'
    ];
    const secondaryVariants = [
      'M396 118 C416 136, 430 156, 436 186',
      'M246 132 C246 170, 246 208, 248 244',
      'M164 208 C182 228, 204 238, 236 244',
      'M330 154 C312 184, 302 210, 292 240'
    ];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="620" viewBox="0 0 900 620"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff"/><stop offset="1" stop-color="${p[0]}"/></linearGradient><filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#0f172a" flood-opacity=".08"/></filter></defs><rect width="900" height="620" rx="36" fill="url(#bg)"/><g filter="url(#shadow)"><rect x="56" y="52" width="788" height="516" rx="32" fill="#ffffff" stroke="#d9e2ec" stroke-width="3"/></g><rect x="96" y="96" width="708" height="428" rx="24" fill="#eceff3" stroke="${p[1]}" stroke-width="2"/><g stroke="#bfc7d1" stroke-width="12" stroke-linecap="round"><path d="M112 134h130"/><path d="M262 134h104"/><path d="M112 180h82"/><path d="M226 180h152"/><path d="M420 120h200"/><path d="M652 120h114"/><path d="M420 162h102"/><path d="M550 162h126"/><path d="M110 258h170"/><path d="M312 258h102"/><path d="M440 242h124"/><path d="M590 242h170"/><path d="M106 326h98"/><path d="M236 326h142"/><path d="M420 324h188"/><path d="M636 324h132"/><path d="M114 398h180"/><path d="M334 398h110"/><path d="M480 398h150"/><path d="M658 398h96"/></g><g opacity=".42" fill="#cfd8e3"><rect x="182" y="214" width="128" height="88" rx="18"/><rect x="516" y="146" width="158" height="118" rx="20"/><rect x="534" y="352" width="172" height="96" rx="20"/></g><g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${routeVariants[variant % routeVariants.length]}" stroke="${p[2]}" stroke-width="8"/><path d="${secondaryVariants[variant % secondaryVariants.length]}" stroke="${p[3]}" stroke-width="8"/><path d="M430 224 l34 0 l0 34" stroke="#ef4444" stroke-width="7"/></g><g><circle cx="118" cy="206" r="12" fill="#22c55e"/><circle cx="436" cy="186" r="12" fill="#2563eb"/><circle cx="446" cy="258" r="10" fill="#ef4444"/></g><g fill="#475569"><text x="108" y="92" font-family="Segoe UI, Arial" font-size="24" font-weight="700">${safeTitle}</text><text x="676" y="550" font-family="Segoe UI, Arial" font-size="18" font-weight="700" text-anchor="end">ARTECH ACTIVITY MAP</text></g></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }


  function defaultPaymentHistory() {
    return [
      { id: 'TRX-6942', time: '2026-06-10', description: 'Nạp tiền vào tài khoản thông qua cổng thanh toán ARTECHPay trực tuyến', amount: 1000000, type: 'deposit', status: 'success' },
      { id: 'TRX-8123', time: '2026-06-10', description: 'Yêu cầu rút tiền khỏi hệ sinh thái về tài khoản ngân hàng liên kết', amount: -10000000, type: 'withdraw', status: 'success' },
      { id: 'TRX-6881', time: '2026-06-10', description: 'Yêu cầu rút tiền khỏi hệ sinh thái về tài khoản ngân hàng liên kết', amount: -100000, type: 'withdraw', status: 'success' },
      { id: 'TRX-9657', time: '2026-06-10', description: 'Thanh toán token AI cho robot ARTECH Reception Nova', amount: -1000000, type: 'token', status: 'success' },
      { id: 'TRX-9982', time: '2023-11-01', description: 'Thanh toán phí dịch vụ vận hành thông minh tháng 11', amount: -15000000, type: 'service', status: 'success' },
      { id: 'TRX-9950', time: '2023-10-15', description: 'Nạp tiền vào tài khoản thông qua cổng thanh toán ARTECHPay', amount: 50000000, type: 'deposit', status: 'success' },
      { id: 'TRX-9812', time: '2023-10-01', description: 'Thanh toán phí dịch vụ vận hành thông minh tháng 10', amount: -15000000, type: 'service', status: 'success' },
      { id: 'TRX-9800', time: '2023-09-28', description: 'Gia hạn gói dịch vụ lưu trữ Server đám mây phụ trợ', amount: -5000000, type: 'service', status: 'cancelled' }
    ];
  }

  function defaultWalletData() {
    return {
      balance: 42500000,
      availableBalance: 39200000,
      lockedBalance: 3300000,
      tokenInput: 1246000,
      tokenOutput: 688400,
      tokenPrice: 120,
      monthlyUsage: 2314000,
      plan: 'Business Robot',
      bankAccount: 'ARTECH-0981136986'
    };
  }

  function normalizeDashboardData(data) {
    data.albums = Array.isArray(data.albums) ? data.albums.map((album) => ({
      ...album,
      images: Array.isArray(album.images) ? album.images : [],
      isVirtual: Boolean(album.isVirtual)
    })) : [];
    data.robots = Array.isArray(data.robots) ? data.robots.map(robot => ({ imageSrc: '', robotImageNote: '', ...robot })) : [];
    data.activityAreas = Array.isArray(data.activityAreas) ? data.activityAreas.map((area, index) => ({
      ...area,
      code: area.code || `KV-${index + 1}`,
      floor: area.floor || area.name || `Khu vực ${index + 1}`,
      assignedRobots: Number(area.assignedRobots || 0),
      status: normalizeAreaStatus(area.status),
      imageSrc: area.imageSrc || demoAreaMapImage(area.name || `Khu vực ${index + 1}`, index),
      updatedAt: area.updatedAt || new Date().toISOString()
    })) : [];
    data.knowledge = Array.isArray(data.knowledge) ? data.knowledge : [];
    data.learned = Array.isArray(data.learned) ? data.learned : [];
    data.wallet = { ...defaultWalletData(), ...(data.wallet || {}) };
    data.payments = Array.isArray(data.payments) ? data.payments : defaultPaymentHistory();
    return data;
  }

  function loadDashboardData() {
    const defaults = {
      robots: [
        {
          id: uid('robot'), name: 'ARTECH Reception Robot', deviceId: 'ART-RB-001', status: 'active', battery: 82, imageSrc: '',
          systemPrompt: 'Bạn là robot lễ tân của ARTECH, trả lời lịch sự, ngắn gọn, đúng dữ liệu được cấp.',
          featureStatus: 'Bật chào hỏi, hỏi đáp AI, nhận diện khách', serverLink: 'https://robot-api.artech.local', openaiKey: 'sk-********', geminiKey: 'AIza-********', gptModel: 'gpt-4.1-mini', geminiModel: 'gemini-2.0-flash',
          faceIcons: [{ id: uid('face'), name: 'Mặt vui', src: '' }], linkedKnowledge: true, tokenInput: 128430, tokenOutput: 65420
        },
        {
          id: uid('robot'), name: 'ARTECH Demo Robot', deviceId: 'ART-DEMO-002', status: 'charging', battery: 45, imageSrc: '',
          systemPrompt: 'Bạn là robot giới thiệu giải pháp AI và robot tự hành của ARTECH.',
          featureStatus: 'Bật giọng nói, hiển thị mặt, kết nối server', serverLink: 'https://artech-server.local', openaiKey: '', geminiKey: '', gptModel: 'gpt-4o-mini', geminiModel: 'gemini-1.5-flash',
          faceIcons: [], linkedKnowledge: false, tokenInput: 84200, tokenOutput: 31300
        },
        {
          id: uid('robot'), name: 'Robot Tư vấn Sản phẩm', deviceId: 'ART-RB-003', status: 'connecting', battery: 63, imageSrc: '',
          systemPrompt: 'Tư vấn sản phẩm theo dữ liệu tri thức chung, ưu tiên trả lời rõ ràng và thân thiện.',
          featureStatus: 'Đang đồng bộ tri thức', serverLink: 'https://knowledge.artech.local', openaiKey: '', geminiKey: '', gptModel: 'gpt-4.1', geminiModel: 'gemini-2.5-flash',
          faceIcons: [], linkedKnowledge: true, tokenInput: 42000, tokenOutput: 18750
        }
      ],
      activityAreas: [
        { id: uid('area'), name: 'Tầng 1', code: 'KV-T1', floor: 'Tầng 1', status: 'active', assignedRobots: 2, description: 'Khu vực sảnh chính và quầy lễ tân, ưu tiên cho robot tiếp đón khách và hướng dẫn thông tin.', note: 'Phù hợp cho robot lễ tân và robot info kiosk.', imageSrc: demoAreaMapImage('Tầng 1', 0), updatedAt: new Date().toISOString() },
        { id: uid('area'), name: 'Tầng 2', code: 'KV-T2', floor: 'Tầng 2', status: 'active', assignedRobots: 1, description: 'Khu vực văn phòng làm việc kết hợp không gian demo giải pháp, cần kiểm soát luồng di chuyển ổn định.', note: 'Dùng cho robot dẫn đường và hỗ trợ trình diễn.', imageSrc: demoAreaMapImage('Tầng 2', 1), updatedAt: new Date(Date.now() - 86400000).toISOString() },
        { id: uid('area'), name: 'Tầng 3', code: 'KV-T3', floor: 'Tầng 3', status: 'inactive', assignedRobots: 0, description: 'Khu vực kho kỹ thuật và kiểm thử, đang bảo trì tuyến đường và tinh chỉnh bản đồ hoạt động.', note: 'Chỉ kích hoạt khi hoàn tất hiệu chuẩn map.', imageSrc: demoAreaMapImage('Tầng 3', 2), updatedAt: new Date(Date.now() - 172800000).toISOString() }
      ],
      knowledge: [
        {
          id: uid('doc'),
          name: 'Tài liệu giới thiệu công ty ARTECH.pdf',
          type: 'PDF',
          size: '2.4 MB',
          uploadedAt: new Date().toISOString(),
          linkedRobots: ['ART-RB-001', 'ART-DEMO-002'],
          extractedText: 'Đây là vùng dữ liệu văn bản trích xuất từ tài liệu. Với file PDF/Word thật, bạn có thể nhập/chỉnh sửa nội dung đã đọc được tại đây rồi bấm Lưu AI file để robot sử dụng làm tri thức.'
        }
      ],
      albums: [
        { id: uid('album'), name: 'Sản phẩm A - Model X', description: 'Ảnh giới thiệu sản phẩm robot và kiosk.', images: demoAlbumImages({ name: 'Sản phẩm A - Model X' }, 0) },
        { id: uid('album'), name: 'Môi trường Vận hành', description: 'Ảnh demo lắp đặt, sự kiện và nghiệm thu robot ARTECH.', images: demoAlbumImages({ name: 'Môi trường Vận hành' }, 1) },
        { id: uid('album'), name: 'Mẫu Lỗi Kỹ thuật', description: 'Lưu ảnh lỗi, ảnh kiểm tra và mẫu dữ liệu phục vụ vận hành.', images: demoAlbumImages({ name: 'Mẫu Lỗi Kỹ thuật' }, 2) }
      ],
      learned: [
        { id: uid('learn'), robotId: 'ART-RB-001', question: 'ARTECH có những nhóm giải pháp robot nào?', answer: 'Robot đã ghi nhận câu hỏi và chuyển vào dữ liệu cần học thêm.', createdAt: new Date().toISOString() },
        { id: uid('learn'), robotId: 'ART-DEMO-002', question: 'ARTECH có hỗ trợ tích hợp voice AI không?', answer: 'Có, hệ thống hỗ trợ voice AI, quản lý tri thức và màn hình tương tác.', createdAt: new Date(Date.now() - 86400000).toISOString() }
      ],
      payments: [
        { id: uid('pay'), time: '2026-06-01', packageName: 'Business Robot', amount: '2.500.000đ', status: 'Đã thanh toán' },
        { id: uid('pay'), time: '2026-05-01', packageName: 'Starter AI', amount: '990.000đ', status: 'Đã thanh toán' }
      ]
    };
    try {
      const raw = localStorage.getItem(APP_KEY);
      if (!raw) return normalizeDashboardData(defaults);
      return normalizeDashboardData({ ...defaults, ...JSON.parse(raw) });
    } catch {
      return normalizeDashboardData(defaults);
    }
  }

  function apiUrl(path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path;
    return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  function backendPathFromUrl(value) {
    if (!value) return '';
    const raw = String(value).trim();
    if (!raw || raw.startsWith('data:') || raw.startsWith('blob:')) return '';
    if (API_BASE && raw.startsWith(API_BASE)) return raw.slice(API_BASE.length) || '';
    try {
      const url = new URL(raw);
      return `${url.pathname || ''}${url.search || ''}`;
    } catch {
      return raw.startsWith('/') ? raw : `/${raw}`;
    }
  }

  async function api(path, options = {}) {
    const token = localStorage.getItem(TOKEN_KEY) || '';
    const isForm = options.body instanceof FormData;
    const headers = { ...(options.headers || {}) };
    if (!isForm) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      const res = await fetch(apiUrl(path), {
        method: options.method || 'GET',
        headers,
        // Không gửi cookie qua CORS; backend dùng JWT Authorization header nên tránh lỗi CORS credentials.
        body: options.body ? (isForm ? options.body : JSON.stringify(options.body)) : undefined
      });
      const data = await res.json().catch(() => ({ success: false, message: 'Không đọc được phản hồi server' }));
      if (!res.ok && data.success !== true) return { success: false, status: res.status, message: data.message || `HTTP ${res.status}`, ...data };
      return data;
    } catch (error) {
      return { success: false, message: `Không kết nối được backend tại ${API_BASE}. Kiểm tra backend đã chạy chưa.`, error: error.message };
    }
  }

  async function apiForm(path, formData, method = 'POST') {
    return api(path, { method, body: formData });
  }


  function loadPendingLoginOtp() {
    try {
      const raw = sessionStorage.getItem(PENDING_LOGIN_OTP_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function savePendingLoginOtp(payload) {
    pendingLoginOtp = payload || null;
    if (pendingLoginOtp) sessionStorage.setItem(PENDING_LOGIN_OTP_KEY, JSON.stringify(pendingLoginOtp));
    else sessionStorage.removeItem(PENDING_LOGIN_OTP_KEY);
  }

  async function completeLogin(res, fallbackUser = {}) {
    localStorage.setItem(TOKEN_KEY, res.token || '');
    savePendingLoginOtp(null);
    pendingLoginCredentials = null;
    currentUser = res.user || { username: fallbackUser.email || fallbackUser.username || 'User', role: res.role || 'User' };
    toast(res.message || 'Đăng nhập thành công', 'success');
    closeAuth();
    await refreshDashboardFromBackend({ quiet: true });
    renderDashboard();
  }

  function backendStatusToFrontend(state) {
    const value = String(state || '').toUpperCase();
    if (value === 'ACTIVE' || value === 'CONNECTED') return 'active';
    if (value === 'CHARGING') return 'charging';
    if (value === 'IDLE') return 'connecting';
    if (value === 'STOPPED') return 'stop';
    return 'offline';
  }

  function frontendStatusToBackend(status) {
    const value = String(status || '').toLowerCase();
    if (value === 'active') return 'ACTIVE';
    if (value === 'charging') return 'CHARGING';
    if (value === 'connecting') return 'IDLE';
    if (value === 'stop') return 'STOPPED';
    return 'OFFLINE';
  }

  function fileNameFromUrl(url, fallback = 'Tài nguyên') {
    const raw = String(url || '').split('/').pop() || fallback;
    return decodeURIComponent(raw).replace(/^\d+-/, '') || fallback;
  }

  function typeFromName(name, fallback = 'FILE') {
    const ext = String(name || '').split('.').pop()?.toLowerCase() || '';
    if (!ext) return fallback;
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(ext)) return ext;
    if (ext === 'txt') return 'txt';
    return ext.toUpperCase();
  }

  function normalizeRobotFromApi(row = {}, extra = {}) {
    const cfg = extra.config || {};
    const icons = Array.isArray(extra.icons) ? extra.icons : [];
    const normalizedIcons = icons.map(item => ({
      id: String(item.iconId || item.IconID || item.id || uid('face')),
      robotId: String(item.robotId || item.RobotID || ''),
      name: fixMojibakeText(item.iconName || item.IconName || item.name || 'Icon mặt'),
      src: apiUrl(item.iconUrl || item.IconURL || item.src || ''),
      isActive: Boolean(item.isActive || item.IsActive),
      createdAt: item.createdAt || item.CreatedAt || new Date().toISOString()
    }));
    const activeIcon = normalizedIcons.find(item => item.isActive) || normalizedIcons[0] || null;
    const token = extra.token || {};
    const location = extra.location || null;
    const imageUrl = row.imageUrl || row.ImageURL || row.robotImageUrl || row.imageSrc || '';
    return {
      id: String(row.robotId || row.RobotID || row.id || ''),
      name: row.robotName || row.RobotName || row.name || 'Robot ARTECH',
      deviceId: row.deviceId || row.SerialNumber || row.serialNumber || '',
      macAddress: row.macAddress || row.MACAddress || '',
      systemPrompt: row.promptConfiguration || row.PromptConfiguration || row.systemPrompt || '',
      featureStatus: row.featureStatus || row.FeatureStatus || '',
      description: row.description || row.Description || '',
      mapLocation: row.mapLocation || row.MapLocation || [row.activityAreaName, row.activityAreaCode, row.activityAreaFloor].filter(Boolean).join(' · ') || (location ? [location.branchName, location.department, location.floorNumber].filter(Boolean).join(' · ') : ''),
      activityAreaId: String(row.activityAreaId || row.ActivityAreaID || (location ? String(location.locationId || '') : '') || ''),
      robotImageNote: row.robotImageNote || row.RobotImageNote || '',
      imageSrc: apiUrl(imageUrl),
      battery: Number(row.batteryLevel ?? row.BatteryLevel ?? row.battery ?? 0),
      status: backendStatusToFrontend(row.currentState || row.CurrentState || row.status),
      serverLink: cfg.linkServer || cfg.LinkServer || row.serverLink || '',
      openaiKey: cfg.openAIAPIKey || cfg.OpenAIAPIKey || row.openaiKey || '',
      geminiKey: cfg.geminiAPIKey || cfg.GeminiAPIKey || row.geminiKey || '',
      gptModel: cfg.gptModel || cfg.GPTModel || row.gptModel || 'gpt-4.1-mini',
      geminiModel: cfg.geminiModel || cfg.GeminiModel || row.geminiModel || 'gemini-2.0-flash',
      linkedKnowledge: Boolean(row.linkedKnowledge ?? row.LinkedKnowledge ?? false),
      tokenInput: Number(token.totalInputTokens || row.tokenInput || 0),
      tokenOutput: Number(token.totalOutputTokens || row.tokenOutput || 0),
      faceIconLibrary: normalizedIcons,
      faceIcons: activeIcon ? [{
        id: activeIcon.id,
        name: activeIcon.name,
        src: activeIcon.src
      }] : []
    };
  }

  function normalizeAreaFromApi(row = {}) {
    const id = String(row.areaId || row.locationId || row.id || uid('area'));
    const name = fixMojibakeText(row.name || row.areaName || row.branchName || 'Khu vực hoạt động');
    return {
      id,
      name,
      code: fixMojibakeText(row.code || row.areaCode || `KV-${id.slice(0, 6).toUpperCase()}`),
      floor: fixMojibakeText(row.floor || row.floorNumber || row.department || row.physicalAddress || ''),
      status: normalizeAreaStatus(row.status || (row.isActive || row.IsActive ? 'active' : 'inactive')),
      description: fixMojibakeText(row.description || row.physicalAddress || ''),
      note: fixMojibakeText(row.note || row.operationNote || row.department || ''),
      imageSrc: apiUrl(row.mapImageUrl || row.imageSrc || row.mapUrl || '') || demoAreaMapImage(name || 'Khu vực', 0),
      rosProgress: Number(row.rosProgress || row.RosProgress || 0),
      updatedAt: row.updatedAt || row.createdAt || new Date().toISOString()
    };
  }

  function normalizeKnowledgeFromApi(item = {}) {
    const rawFileUrl = item.fileUrl || item.FileURL || item.url || item.URL || '';
    const rawFileName = fixMojibakeText(item.fileName || item.FileName || item.name || item.Name || '');
    const rawTitle = fixMojibakeText(item.title || item.Title || '');
    const fileName = rawFileName || fixMojibakeText(fileNameFromUrl(rawFileUrl, 'Tri thức'));
    const name = rawTitle || fileName || 'Tri thức';

    const assetType = String(item.assetType || item.AssetType || '').toUpperCase();
    const category = String(item.category || item.Category || '').toLowerCase();

    let ext = typeFromName(fileName || name, 'file');
    ext = String(ext || 'file').toLowerCase();

    let type = String(item.dataType || item.DataType || ext || 'file').toLowerCase();

    // generalassets lưu AssetType kiểu KNOWLEDGE_RESOURCE / KNOWLEDGE_RESOURCE_IMAGE.
    // Không dùng trực tiếp AssetType làm type vì tab PDF/Text/Ảnh sẽ lọc sai.
    if (assetType) {
      type = ext || 'file';
    }

    if (isImageType(ext) || assetType.includes('IMAGE')) {
      type = 'image';
    }

    const normalizedFileUrl = apiUrl(rawFileUrl);
    const description = fixMojibakeText(item.description || item.Description || '');
    const extractedText = fixMojibakeText(item.content || item.Content || item.extractedText || item.ExtractedText || '');
    const rawExtractionStatus = String(item.extractionStatus || item.ExtractionStatus || item.extractStatus || '').toLowerCase();
    const extractionStatus = ['extracted', 'done', 'completed', 'da_trich_xuat', 'đã trích xuất'].includes(rawExtractionStatus)
      ? 'extracted'
      : 'pending';

    return {
      id: String(item.knowledgeId || item.KnowledgeID || item.assetId || item.AssetID || item.id || item.ID || uid('doc')),
      robotId: item.robotId || item.RobotID || '',
      robotName: fixMojibakeText(item.robotName || item.RobotName || ''),
      name,
      type,
      size: item.size || item.Size || item.FileSize || '',
      uploadedAt: item.createdAt || item.CreatedAt || item.uploadedAt || item.UploadedAt || new Date().toISOString(),
      linkedRobots: item.robotName || item.RobotName ? [fixMojibakeText(item.robotName || item.RobotName)] : [],
      extractedText: extractedText || (extractionStatus === 'extracted' ? description : ''),
      description,
      fileUrl: normalizedFileUrl,
      previewSrc: isImageType(type) ? normalizedFileUrl : '',
      status: item.status || item.Status || 'active',
      extractionStatus,
      extractedAt: item.extractedAt || item.ExtractedAt || '',
      assetType,
      category,
      serverSource: item.knowledgeId || item.KnowledgeID ? 'knowledge' : 'asset'
    };
  }

  function normalizeLearnedFromApi(item = {}) {
    const content = fixMojibakeText(item.extractedContent || item.ExtractedContent || '');
    const parts = String(content).split(/\n+/);
    return {
      id: String(item.learningId || item.LearningID || item.id || uid('learn')),
      robotId: item.deviceId || item.robotId || item.RobotID || '',
      robotName: fixMojibakeText(item.robotName || item.RobotName || ''),
      question: fixMojibakeText(parts[0]?.replace(/^Q[:：]?\s*/i, '') || 'Câu hỏi robot đã tiếp nhận'),
      answer: fixMojibakeText(parts.slice(1).join('\n').replace(/^A[:：]?\s*/i, '') || content),
      extractedContent: content,
      isApproved: Boolean(item.isApproved || item.IsApproved),
      createdAt: item.createdAt || item.CreatedAt || new Date().toISOString()
    };
  }

  function mergeFrontendOnly(remoteData) {
    // Từ v0.28 không trộn dữ liệu tạm frontend vào dashboard thật.
    // Mọi khu vực, album, ảnh, robot đều phải đi qua backend/MySQL.
    return remoteData;
  }

  function saveFrontendOnlyPatch(patch) {
    let local = {};
    try { local = JSON.parse(localStorage.getItem(FRONTEND_ONLY_KEY) || '{}'); } catch {}
    localStorage.setItem(FRONTEND_ONLY_KEY, JSON.stringify({ ...local, ...patch }));
  }

  async function refreshDashboardFromBackend({ quiet = false } = {}) {
    if (!currentUser || DEMO_DATA) return false;
    const robotsRes = await api('/api/robots');
    if (!robotsRes.success) {
      if (!quiet) toast(robotsRes.message || 'Không tải được dữ liệu robot từ backend', 'error');
      return false;
    }

    const robotRows = Array.isArray(robotsRes.robots) ? robotsRes.robots : [];
    const tokenRobotsRes = await api('/api/tokens/summary/robots');
    const tokenByRobot = new Map((tokenRobotsRes.robots || []).map(item => [String(item.robotId), item]));

    const robotDetails = await Promise.all(robotRows.map(async (row) => {
      const robotId = row.robotId || row.RobotID;
      const [configRes, iconsRes, locRes] = await Promise.all([
        api(`/api/robots/${robotId}/config`),
        api(`/api/robots/${robotId}/icons`),
        api(`/api/robots/${robotId}/locations/active`)
      ]);
      return normalizeRobotFromApi(row, {
        config: configRes.config || {},
        icons: iconsRes.icons || [],
        location: locRes.location || null,
        token: tokenByRobot.get(String(robotId)) || {}
      });
    }));

    let areaRows = [];
    const areaRes = await api('/api/activity-areas');
    if (areaRes.success && Array.isArray(areaRes.areas)) {
      areaRows = areaRes.areas.map(normalizeAreaFromApi);
    } else {
      if (!quiet) toast(areaRes.message || 'Backend chưa có API /api/activity-areas. Hãy chạy backend upgrade v0.28.', 'error');
      areaRows = [];
    }

    const [knowledgeRes, assetRes, albumRes, selfLearningRes, tokenSummaryRes, balanceRes, txRes, packageRes] = await Promise.all([
      api('/api/knowledge'),
      api('/api/assets'),
      api('/api/albums'),
      api('/api/self-learning'),
      api('/api/tokens/summary'),
      api('/api/billing/balance'),
      api('/api/billing/transactions'),
      api('/api/billing/packages')
    ]);

    const knowledgeList = (knowledgeRes.knowledgeList || []).map(normalizeKnowledgeFromApi);
    const rawAssets = Array.isArray(assetRes.assets) ? assetRes.assets : [];
    const assetList = rawAssets.map(normalizeKnowledgeFromApi);

    const knowledgeAssets = assetList.filter(item => {
      const assetType = String(item.assetType || '').toUpperCase();
      const category = String(item.category || '').toLowerCase();
      return (
        assetType.includes('KNOWLEDGE') ||
        assetType.includes('DOCUMENT') ||
        assetType.includes('RESOURCE') ||
        category === 'knowledge'
      );
    });

    const productAssets = rawAssets.filter(item => {
      const assetType = String(item.assetType || item.AssetType || '').toUpperCase();
      const category = String(item.category || item.Category || '').toLowerCase();
      return (
        assetType.includes('PRODUCT') ||
        category === 'product' ||
        category === 'robot'
      );
    });

    const unassignedAlbumImages = productAssets
      .filter(item => !(item.albumId || item.AlbumID))
      .map((item) => ({
        id: String(item.assetId || item.AssetID || item.id || uid('asset')),
        name: fixMojibakeText(item.fileName || item.FileName || item.title || item.Title || fileNameFromUrl(item.fileUrl || item.FileURL, 'Ảnh sản phẩm')),
        src: apiUrl(item.fileUrl || item.FileURL || ''),
        uploadedAt: item.uploadedAt || item.UploadedAt || item.createdAt || item.CreatedAt,
        serverSource: 'asset',
        assetType: item.assetType || item.AssetType || 'PRODUCT_IMAGE'
      }));

    const serverAlbums = Array.isArray(albumRes.albums) ? albumRes.albums.map(album => ({
      id: String(album.albumId || album.AlbumID || album.id),
      name: fixMojibakeText(album.name || album.Name || 'Album sản phẩm'),
      description: fixMojibakeText(album.description || album.Description || ''),
      category: album.category || album.Category || 'PRODUCT_IMAGE',
      isVirtual: false,
      images: (album.images || []).map(img => ({
        id: String(img.assetId || img.AssetID || img.id),
        name: fixMojibakeText(img.fileName || img.FileName || img.title || img.Title || 'Ảnh sản phẩm'),
        src: apiUrl(img.fileUrl || img.FileURL || img.src || ''),
        uploadedAt: img.uploadedAt || img.UploadedAt,
        serverSource: 'asset',
        assetType: img.assetType || img.AssetType || 'PRODUCT_IMAGE'
      }))
    })) : [];

    const virtualUnassignedAlbum = unassignedAlbumImages.length
      ? [{
          id: 'unassigned_product_images',
          name: 'Ảnh chưa gắn album',
          description: 'Nhóm hệ thống hiển thị các ảnh đã upload nhưng AlbumID còn trống trong bảng generalassets.',
          category: 'UNASSIGNED_PRODUCT_IMAGE',
          isVirtual: true,
          images: unassignedAlbumImages
        }]
      : [];

    const summary = tokenSummaryRes.summary || {};
    const balance = balanceRes.balance || {};
    const remoteData = normalizeDashboardData({
      ...dashboardData,
      robots: robotDetails,
      activityAreas: areaRows,
      knowledge: [...knowledgeList, ...knowledgeAssets],
      learned: (selfLearningRes.learningList || []).map(normalizeLearnedFromApi),
      wallet: {
        ...dashboardData.wallet,
        balance: Number(balance.walletBalance ?? summary.walletBalance ?? dashboardData.wallet?.balance ?? 0),
        availableBalance: Number(balance.walletBalance ?? summary.walletBalance ?? dashboardData.wallet?.availableBalance ?? 0),
        tokenInput: Number(summary.totalInputTokens || 0),
        tokenOutput: Number(summary.totalOutputTokens || 0),
        monthlyUsage: Number(summary.totalTokensUsed || 0),
        availableTokens: Number(balance.availableTokens ?? summary.availableTokens ?? 0),
        packages: packageRes.packages || []
      },
      payments: (txRes.transactions || []).map(tx => ({
        id: tx.transactionId,
        time: tx.createdAt,
        packageName: tx.packageName || tx.transactionType || 'Giao dịch',
        description: tx.packageName ? `Mua ${tx.packageName}` : (tx.transactionType || 'Giao dịch tài khoản'),
        amount: Number(tx.amount || 0),
        type: tx.transactionType || 'transaction',
        status: String(tx.status || '').toLowerCase() === 'success' ? 'success' : String(tx.status || 'pending').toLowerCase()
      })),
      albums: [...serverAlbums, ...virtualUnassignedAlbum]
    });

    dashboardData = mergeFrontendOnly(remoteData);
    saveDashboardData();
    return true;
  }

  async function uploadGeneralAsset(file, assetType = 'OTHER', extra = {}) {
    if (!file) return null;
    const fd = new FormData();
    fd.append('assetType', assetType);
    Object.entries(extra || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) fd.append(key, value);
    });
    fd.append('file', file);
    const res = await apiForm('/api/assets', fd, 'POST');
    return res.success ? res.asset : null;
  }

  async function saveRobotToBackend(oldRobot, next, files = {}) {
    const robotId = oldRobot?.id;
    let imageUrl = next.imageSrc;
    if (files.robotImageFile) {
      const asset = await uploadGeneralAsset(files.robotImageFile, 'ROBOT_AVATAR', {
        title: files.robotImageFile.name,
        category: 'robot-avatar',
        referenceType: 'ROBOT',
        referenceId: robotId || ''
      });
      if (asset?.fileUrl) imageUrl = asset.fileUrl;
    }

    const robotPayload = {
      robotName: next.name,
      deviceId: next.deviceId,
      macAddress: next.macAddress || '',
      promptConfiguration: next.systemPrompt,
      featureStatus: next.featureStatus,
      activityAreaId: next.activityAreaId || '',
      mapLocation: next.mapLocation || getRobotActivityAreaLabel(next),
      imageUrl: backendPathFromUrl(imageUrl),
      robotImageNote: next.robotImageNote,
      linkedKnowledge: next.linkedKnowledge,
      uiTemplateId: next.uiTemplateId || null
    };

    const robotRes = robotId
      ? await api(`/api/robots/${robotId}`, { method: 'PUT', body: robotPayload })
      : await api('/api/robots', { method: 'POST', body: robotPayload });

    if (!robotRes.success) return robotRes;
    const savedRobotId = robotId || robotRes.robotId;

    const [configRes, statusRes] = await Promise.all([
      api(`/api/robots/${savedRobotId}/config`, {
        method: 'PUT',
        body: {
          linkServer: next.serverLink,
          openAIAPIKey: next.openaiKey,
          geminiAPIKey: next.geminiKey,
          gptModel: next.gptModel,
          geminiModel: next.geminiModel
        }
      }),
      api(`/api/robots/${savedRobotId}/status`, {
        method: 'PUT',
        body: {
          batteryLevel: next.battery,
          currentState: frontendStatusToBackend(next.status),
          currentLocationX: 0,
          currentLocationY: 0
        }
      })
    ]);

    if (!configRes.success) return configRes;
    if (!statusRes.success) return statusRes;

    let savedFaceIcon = null;
    if (files.faceFile && next.faceIcons?.[0]?.name) {
      const fd = new FormData();
      fd.append('iconName', next.faceIcons[0].name);
      fd.append('icon', files.faceFile);
      const iconRes = await apiForm(`/api/robots/${savedRobotId}/icons`, fd, 'POST');
      if (!iconRes.success) return iconRes;
      savedFaceIcon = iconRes.icon || null;
      if (iconRes.icon?.iconId) await api(`/api/robots/${savedRobotId}/icons/${iconRes.icon.iconId}/active`, { method: 'PUT', body: {} });
    } else if (files.faceIconId && next.faceIcons?.[0]?.name) {
      const iconRes = await api(`/api/robots/${savedRobotId}/icons/${files.faceIconId}`, {
        method: 'PUT',
        body: { iconName: next.faceIcons[0].name, isActive: true }
      });
      if (!iconRes.success) return iconRes;
      savedFaceIcon = iconRes.icon || null;
    }


    if (Number(next.tokenInput || 0) || Number(next.tokenOutput || 0)) {
      await api('/api/tokens/usage', {
        method: 'POST',
        body: {
          robotId: savedRobotId,
          usageContext: 'MANUAL_CONFIG_UPDATE',
          deviceIdentifier: next.deviceId,
          inputTokens: Number(next.tokenInput || 0),
          outputTokens: Number(next.tokenOutput || 0)
        }
      });
    }

    return { success: true, robotId: savedRobotId, imageUrl, faceIcon: savedFaceIcon };
  }

  async function deleteRobotFromBackend(robotId) {
    if (!robotId || DEMO_DATA) return { success: true };
    return api(`/api/robots/${robotId}`, { method: 'DELETE' });
  }

  async function saveActivityAreaToBackend(oldArea, next, file) {
    const fd = new FormData();
    fd.append('name', next.name);
    fd.append('code', next.code);
    fd.append('floor', next.floor);
    fd.append('status', next.status);
    fd.append('description', next.description);
    fd.append('note', next.note);
    fd.append('rosProgress', String(next.rosProgress || 0));
    if (file) fd.append('map', file);
    const path = oldArea?.id && !String(oldArea.id).startsWith('area_') ? `/api/activity-areas/${oldArea.id}` : '/api/activity-areas';
    const res = await apiForm(path, fd, oldArea?.id && !String(oldArea.id).startsWith('area_') ? 'PUT' : 'POST');
    if (res.success) return { success: true, area: normalizeAreaFromApi(res.area || { ...next, areaId: res.areaId }) };
    return res;
  }

  async function deleteActivityAreaFromBackend(areaId) {
    if (!areaId || String(areaId).startsWith('area_')) return { success: true };
    return api(`/api/activity-areas/${areaId}`, { method: 'DELETE' });
  }

  function toast(message, type = 'info') {
    const root = document.getElementById('toastRoot');
    const item = document.createElement('div');
    item.className = `toast ${type}`;
    item.textContent = message;
    root.appendChild(item);
    setTimeout(() => item.remove(), 3600);
  }

  function render() {
    if (currentUser) renderDashboard();
    else renderAuthPage();
  }

  async function init() {
    const token = localStorage.getItem(TOKEN_KEY) || '';

    if (!token) {
      currentUser = null;
      render();
      return;
    }

    try {
      const me = await api('/api/auth/me');
      if (me.success) {
        currentUser = me.user;
        await refreshDashboardFromBackend({ quiet: true });
      } else {
        localStorage.removeItem(TOKEN_KEY);
        currentUser = null;
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      currentUser = null;
    }

    render();
  }

  function landingProductData() {
    return [
      {
        id: 'bellabot-pro',
        name: 'ARTECH BellaBot Pro',
        category: 'Robot phục vụ',
        categoryKey: 'phuc-vu',
        image: productRobotImage('BellaBot Pro', 0),
        short: 'Robot phục vụ cao cấp cho nhà hàng, khách sạn và khu trải nghiệm dịch vụ.',
        detail: 'ARTECH BellaBot Pro là mẫu robot phục vụ được tối ưu cho không gian tiếp khách cao cấp. Robot hỗ trợ di chuyển linh hoạt, hiển thị nội dung thương hiệu, phát thông báo và phối hợp với hệ thống dashboard để theo dõi trạng thái, pin và dữ liệu vận hành theo thời gian thực.',
        specs: ['Điều phối tác vụ phục vụ', 'Màn hình hiển thị thương hiệu', 'Theo dõi pin & trạng thái', 'Quản lý tập trung qua ARTECH Dashboard']
      },
      {
        id: 'service-max',
        name: 'ARTECH Service Max',
        category: 'Robot phục vụ',
        categoryKey: 'phuc-vu',
        image: productRobotImage('Service Max', 1),
        short: 'Robot hỗ trợ phục vụ đa điểm với giao diện thân thiện và quản lý nội dung linh hoạt.',
        detail: 'ARTECH Service Max phù hợp cho nhà hàng, trung tâm hội nghị và showroom trải nghiệm. Robot có thể chạy kịch bản phục vụ, giới thiệu món hoặc sản phẩm, đồng thời ghi nhận dữ liệu tương tác để doanh nghiệp tối ưu quy trình chăm sóc khách hàng.',
        specs: ['Kịch bản AI tùy biến', 'Giao diện thân thiện', 'Quản lý nội dung tập trung', 'Dữ liệu tương tác theo ca vận hành']
      },
      {
        id: 'reception',
        name: 'ARTECH Reception Nova',
        category: 'Robot lễ tân',
        categoryKey: 'le-tan',
        image: productRobotImage('Reception Nova', 2),
        short: 'Robot lễ tân AI chào khách, hướng dẫn thông tin và giới thiệu doanh nghiệp chuyên nghiệp.',
        detail: 'ARTECH Reception Nova được thiết kế cho sảnh doanh nghiệp, trường học, bệnh viện và trung tâm dịch vụ. Robot có thể chào hỏi khách, dẫn hướng, hiển thị nội dung doanh nghiệp và sử dụng kho tri thức để trả lời những câu hỏi thường gặp.',
        specs: ['Lễ tân AI tiếng Việt', 'Dẫn hướng cơ bản', 'Kho tri thức nội bộ', 'Báo cáo tương tác người dùng']
      },
      {
        id: 'kiosk',
        name: 'ARTECH Info Kiosk',
        category: 'Robot lễ tân',
        categoryKey: 'le-tan',
        image: productRobotImage('Info Kiosk', 3),
        short: 'Kiosk AI hỗ trợ tra cứu thông tin, tiếp nhận câu hỏi và trình chiếu nội dung giới thiệu.',
        detail: 'ARTECH Info Kiosk là lựa chọn phù hợp cho triển lãm, văn phòng tiếp khách và khu giới thiệu sản phẩm. Hệ thống tích hợp AI để tra cứu thông tin, trình chiếu tài nguyên ảnh và gửi dữ liệu người dùng quan tâm về dashboard để phân tích.',
        specs: ['Tra cứu thông tin cảm ứng', 'Tích hợp GPT/Gemini', 'Trình chiếu album ảnh', 'Ghi nhận dữ liệu câu hỏi']
      },
      {
        id: 'delivery-pro',
        name: 'ARTECH Delivery Pro',
        category: 'Robot vận chuyển CN',
        categoryKey: 'van-chuyen',
        image: productRobotImage('Delivery Pro', 4),
        short: 'Robot vận chuyển nội bộ cho nhà máy, kho và văn phòng với cơ chế quản lý lộ trình tập trung.',
        detail: 'ARTECH Delivery Pro hỗ trợ vận chuyển vật phẩm nhẹ trong môi trường nội bộ. Dashboard cho phép doanh nghiệp theo dõi Device ID, tình trạng online, lịch sử hoạt động và cấu hình server riêng cho từng robot.',
        specs: ['Quản lý theo Device ID', 'Theo dõi lịch sử hoạt động', 'Lộ trình nội bộ', 'Đồng bộ dữ liệu server']
      },
      {
        id: 'carrier-x',
        name: 'ARTECH Carrier X',
        category: 'Robot vận chuyển CN',
        categoryKey: 'van-chuyen',
        image: productRobotImage('Carrier X', 5),
        short: 'Robot vận chuyển công nghiệp với khả năng làm việc ổn định ở khu vực phân luồng và kho thông minh.',
        detail: 'ARTECH Carrier X được tối ưu cho việc vận chuyển tài liệu, linh kiện và vật tư trong mô hình nhà máy hoặc văn phòng lớn. Hệ thống có thể kết nối với dashboard để quản lý robot, cảnh báo dừng hoạt động và kiểm soát trạng thái pin theo thời gian thực.',
        specs: ['Vận chuyển nội bộ ổn định', 'Theo dõi pin theo thời gian thực', 'Cảnh báo dừng hoạt động', 'Quản lý đa robot']
      },
      {
        id: 'cleaner-s1',
        name: 'ARTECH Cleaner S1',
        category: 'Robot vệ sinh CN',
        categoryKey: 've-sinh',
        image: productRobotImage('Cleaner S1', 0),
        short: 'Robot vệ sinh công nghiệp cho hành lang, sảnh chờ và khu vực công cộng.',
        detail: 'ARTECH Cleaner S1 phù hợp cho trung tâm thương mại, nhà xưởng, văn phòng và khuôn viên lớn. Robot giúp theo dõi trạng thái vận hành, ghi nhận dữ liệu khu vực vệ sinh và kết nối với dashboard để quản trị từ xa.',
        specs: ['Vệ sinh định kỳ', 'Quản lý khu vực làm việc', 'Theo dõi online/offline', 'Báo cáo bảo trì cơ bản']
      },
      {
        id: 'cleaner-vac',
        name: 'ARTECH Vacuum Pro',
        category: 'Robot vệ sinh CN',
        categoryKey: 've-sinh',
        image: productRobotImage('Vacuum Pro', 1),
        short: 'Robot vệ sinh hút bụi và gom rác nhẹ với cơ chế giám sát kết nối và tài nguyên tiêu thụ.',
        detail: 'ARTECH Vacuum Pro phục vụ trong không gian cần làm sạch định kỳ, giúp doanh nghiệp giảm tải công việc lặp lại. Dữ liệu thiết bị, cấu hình vận hành và hình ảnh robot đều được tập trung trong cùng một hệ thống quản lý.',
        specs: ['Hút bụi và gom rác nhẹ', 'Theo dõi tài nguyên', 'Quản lý hình ảnh robot', 'Kết nối dashboard tập trung']
      },
      {
        id: 'camera-kit',
        name: 'ARTECH Vision Kit',
        category: 'Phụ kiện & Phần mềm',
        categoryKey: 'phu-kien',
        image: productRobotImage('Vision Kit', 2),
        short: 'Bộ camera và phần mềm hỗ trợ quản lý hình ảnh, nhận diện tình trạng và đồng bộ dữ liệu.',
        detail: 'ARTECH Vision Kit là gói mở rộng dành cho robot cần nâng cao khả năng thu thập hình ảnh và quản lý dữ liệu trực quan. Bộ giải pháp này tích hợp album ảnh, phân loại tài nguyên hình ảnh và lưu trữ theo từng chủ đề sử dụng.',
        specs: ['Quản lý album ảnh', 'Gắn dữ liệu theo chủ đề', 'Tối ưu dữ liệu trực quan', 'Đồng bộ với dashboard']
      },
      {
        id: 'software-suite',
        name: 'ARTECH Software Suite',
        category: 'Phụ kiện & Phần mềm',
        categoryKey: 'phu-kien',
        image: productRobotImage('Software Suite', 3),
        short: 'Bộ phần mềm quản lý robot, tri thức và dữ liệu học được trên một nền tảng hợp nhất.',
        detail: 'ARTECH Software Suite giúp doanh nghiệp cấu hình robot, nạp tri thức, quản lý tài nguyên hình ảnh, lưu dữ liệu học được và theo dõi tài khoản thanh toán trong một giao diện trực quan, an toàn và dễ sử dụng.',
        specs: ['Dashboard hợp nhất', 'Quản lý tri thức', 'Theo dõi token sử dụng', 'Phân quyền người dùng']
      },
      {
        id: 'edu-bot',
        name: 'ARTECH EduBot',
        category: 'Robot lễ tân',
        categoryKey: 'le-tan',
        image: productRobotImage('EduBot', 4),
        short: 'Robot tương tác cho trung tâm đào tạo, STEM và khu trải nghiệm công nghệ.',
        detail: 'ARTECH EduBot là giải pháp phù hợp cho trường học, trung tâm trải nghiệm và sự kiện công nghệ. Robot giúp thu hút tương tác, hướng dẫn nội dung học tập và trình diễn năng lực AI theo cách gần gũi, sinh động.',
        specs: ['Tương tác STEM', 'Tích hợp nội dung bài học', 'Trình diễn công nghệ', 'Theo dõi dữ liệu người dùng']
      },
      {
        id: 'patrol-bot',
        name: 'ARTECH Patrol Guard',
        category: 'Robot vận chuyển CN',
        categoryKey: 'van-chuyen',
        image: productRobotImage('Patrol Guard', 5),
        short: 'Robot tuần tra và hỗ trợ giám sát cơ sở vật chất với khả năng ghi nhận thông tin hiện trường.',
        detail: 'ARTECH Patrol Guard phù hợp cho nhà máy, kho và khuôn viên lớn cần giám sát thường xuyên. Robot có thể gửi dữ liệu hình ảnh, thông tin trạng thái và các cảnh báo kết nối về dashboard để đội vận hành xử lý nhanh chóng.',
        specs: ['Tuần tra hỗ trợ giám sát', 'Gửi dữ liệu hình ảnh', 'Cảnh báo kết nối', 'Quản lý đa khu vực']
      }
    ];
  }

  function productRobotImage(title, variant = 0) {
    const palettes = [
      ['#e0f2fe', '#003366', '#00a6e5'],
      ['#ecfeff', '#064e7a', '#2dd4bf'],
      ['#f8fafc', '#0f172a', '#38bdf8'],
      ['#eef2ff', '#1e1b4b', '#818cf8'],
      ['#f0fdf4', '#14532d', '#22c55e'],
      ['#fff7ed', '#7c2d12', '#fb923c']
    ];
    const p = palettes[variant % palettes.length];
    const safeTitle = String(title || 'ARTECH Robot').replace(/[<>&]/g, '');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${p[0]}"/><stop offset="1" stop-color="#ffffff"/></linearGradient><radialGradient id="glow" cx="70%" cy="20%" r="55%"><stop stop-color="${p[2]}" stop-opacity=".38"/><stop offset="1" stop-color="${p[2]}" stop-opacity="0"/></radialGradient><filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="22" stdDeviation="18" flood-color="#001e40" flood-opacity=".22"/></filter></defs><rect width="960" height="640" fill="url(#bg)"/><rect width="960" height="640" fill="url(#glow)"/><g opacity=".38"><circle cx="128" cy="120" r="72" fill="#fff"/><circle cx="850" cy="528" r="96" fill="#fff"/></g><g filter="url(#shadow)"><rect x="338" y="132" width="284" height="198" rx="62" fill="#fff" stroke="${p[1]}" stroke-width="10"/><rect x="392" y="188" width="176" height="70" rx="35" fill="${p[1]}"/><circle cx="438" cy="223" r="16" fill="#e0f2fe"/><circle cx="522" cy="223" r="16" fill="#e0f2fe"/><path d="M438 278c28 24 58 24 86 0" fill="none" stroke="${p[2]}" stroke-width="14" stroke-linecap="round"/><path d="M480 132V82" stroke="${p[1]}" stroke-width="18" stroke-linecap="round"/><circle cx="480" cy="66" r="24" fill="${p[2]}"/><rect x="288" y="328" width="384" height="190" rx="68" fill="#ffffff" stroke="${p[1]}" stroke-width="10"/><path d="M288 388h-70c-34 0-62 28-62 62v54" stroke="${p[1]}" stroke-width="24" stroke-linecap="round" opacity=".46"/><path d="M672 388h70c34 0 62 28 62 62v54" stroke="${p[1]}" stroke-width="24" stroke-linecap="round" opacity=".46"/><rect x="354" y="374" width="252" height="54" rx="27" fill="${p[0]}"/><path d="M402 518v54M558 518v54" stroke="${p[1]}" stroke-width="22" stroke-linecap="round"/><circle cx="402" cy="590" r="24" fill="${p[2]}"/><circle cx="558" cy="590" r="24" fill="${p[2]}"/></g><text x="54" y="78" font-family="Segoe UI, Arial" font-size="20" font-weight="800" fill="${p[1]}" letter-spacing="4">ARTECH ROBOTICS</text><text x="54" y="576" font-family="Segoe UI, Arial" font-size="44" font-weight="900" fill="${p[1]}">${safeTitle}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function landingProductCards(category = 'all') {
    return landingProductData()
      .filter(product => category === 'all' || product.categoryKey === category)
      .map(product => `
        <article class="product-folder-card" data-category="${product.categoryKey}">
          <div class="product-folder-top">
            <div class="folder-tab"></div>
            <div class="folder-body">
              <img src="${product.image}" alt="${escapeHtml(product.name)}" />
              <div class="folder-overlay">
                <span>${escapeHtml(product.category)}</span>
                <h3>${escapeHtml(product.name)}</h3>
                <p>${escapeHtml(product.short)}</p>
                <button class="btn secondary product-more-btn" type="button" data-product-more="${product.id}">Xem thêm</button>
              </div>
            </div>
            <div class="folder-content">
              <h3>${escapeHtml(product.name)}</h3>
              <p>${escapeHtml(product.short)}</p>
              <button class="folder-see-more" type="button" data-product-more="${product.id}">Xem thêm</button>
            </div>
          </div>
          <div class="product-folder-bottom">
            <p>${escapeHtml(product.detail.slice(0, 108))}...</p>
          </div>
        </article>
      `).join('');
  }

  function landingProductFilters() {
    const filters = [
      ['all', 'All'],
      ['phuc-vu', 'Robot Phục Vụ'],
      ['le-tan', 'Robot Lễ Tân'],
      ['van-chuyen', 'Robot Vận Chuyển CN'],
      ['ve-sinh', 'Robot Vệ Sinh CN'],
      ['phu-kien', 'Phụ Kiện & Phần Mềm']
    ];
    return filters.map(([key, label], index) => `<button class="product-filter ${index === 0 ? 'active' : ''}" type="button" data-product-filter="${key}">${label}</button>`).join('');
  }

  function setLandingCategory(key = 'all') {
    landingCategory = key;
    const grid = document.getElementById('landingProductGrid');
    if (grid) grid.innerHTML = landingProductCards(key);
    document.querySelectorAll('[data-product-filter]').forEach(item => item.classList.toggle('active', item.dataset.productFilter === key));
    bindLandingEvents();
  }

  function renderLanding() {
    app.innerHTML = `
      <div class="landing">
        <div class="top-strip"></div>
        <header class="landing-nav landing-nav-pro">
          <a class="logo" href="#home" aria-label="ARTECH Robot">
            <span class="logo-mark">AR</span>
            <span>ARTECH Robot<small>Management Platform</small></span>
          </a>
          <nav class="nav-center nav-menu-pro" aria-label="Danh mục chính">
            <div class="nav-item has-dropdown">
              <a href="#about">Về chúng tôi <span class="chev">⌄</span></a>
              <div class="nav-dropdown">
                <a href="#about">Về ARTECH</a>
                <a href="#about">Năng lực công nghệ</a>
                <a href="#partner">Dự án tiêu biểu</a>
              </div>
            </div>
            <div class="nav-item has-dropdown">
              <a href="#products">Sản phẩm <span class="chev">⌄</span></a>
              <div class="nav-dropdown">
                <a href="#products" data-product-nav="phuc-vu">Robot Phục Vụ</a>
                <a href="#products" data-product-nav="le-tan">Robot Lễ Tân</a>
                <a href="#products" data-product-nav="van-chuyen">Robot Vận Chuyển CN</a>
                <a href="#products" data-product-nav="ve-sinh">Robot Vệ Sinh CN</a>
                <a href="#products" data-product-nav="phu-kien">Phụ kiện & Phần mềm</a>
              </div>
            </div>
            <div class="nav-item has-dropdown">
              <a href="#rent">Thuê Robot <span class="chev">⌄</span></a>
              <div class="nav-dropdown">
                <a href="#rent">Thuê ngắn hạn</a>
                <a href="#rent">Thuê sự kiện</a>
                <a href="#rent">Thuê dài hạn</a>
              </div>
            </div>
            <div class="nav-item has-dropdown">
              <a href="#services">Dịch vụ <span class="chev">⌄</span></a>
              <div class="nav-dropdown">
                <a href="#services">Tư vấn giải pháp</a>
                <a href="#services">Thiết kế kịch bản AI</a>
                <a href="#services">Bảo trì & hỗ trợ</a>
              </div>
            </div>
            <div class="nav-item has-dropdown">
              <a href="#partner">Hợp tác kinh doanh <span class="chev">⌄</span></a>
              <div class="nav-dropdown">
                <a href="#partner">Đại lý phân phối</a>
                <a href="#partner">Hợp tác triển khai</a>
                <a href="#partner">Đồng phát triển giải pháp</a>
              </div>
            </div>
            <div class="nav-item has-dropdown">
              <a href="#news">Tin tức <span class="chev">⌄</span></a>
              <div class="nav-dropdown">
                <a href="#news">Tin công nghệ</a>
                <a href="#news">Dự án nổi bật</a>
                <a href="#news">Tuyển dụng</a>
              </div>
            </div>
            <a class="nav-search" href="#products" aria-label="Tìm kiếm">${icon.search}</a>
          </nav>
          <div class="nav-actions">
            <button class="btn ghost" data-open-auth="login">Đăng nhập</button>
            <button class="btn primary" data-open-auth="register">Đăng ký</button>
          </div>
        </header>
        <main>
          <section id="home" class="hero hero-pro hero-robot-bg">
            <div>
              <div class="eyebrow">ARTECH ROBOTICS</div>
              <h1>Nền tảng quản lý robot chuyên nghiệp cho doanh nghiệp.</h1>
              <p>Quản lý robot, cấu hình AI, tri thức, album ảnh, dữ liệu học được, tài khoản và thanh toán trên một hệ thống thống nhất, bảo mật và dễ vận hành.</p>
              <p class="hero-note">ARTECH phát triển hệ sinh thái robot thông minh dành cho doanh nghiệp, giúp tối ưu vận hành, tự động hóa quy trình tiếp nhận thông tin và quản trị dữ liệu robot tập trung.</p>
              <div class="hero-actions">
                <button class="btn primary" type="button" data-scroll-products>Khám phá</button>
                <button class="btn secondary" type="button" data-open-auth="login">Truy cập hệ thống</button>
              </div>
              <div class="hero-stats">
                <div class="stat-card"><b>24/7</b><span>Giám sát trạng thái robot</span></div>
                <div class="stat-card"><b>AI</b><span>Quản lý tri thức và dữ liệu học</span></div>
                <div class="stat-card"><b>DATA</b><span>Mã hóa dữ liệu và phân quyền truy cập</span></div>
              </div>
            </div>
            <div class="hero-visual">
              <div class="visual-card robot-visual-bg">
                <div class="float-chip one">Pin 82% · Online</div>
                <div class="float-chip two">Knowledge Sync</div>
                <div class="float-chip three">Token Monitor</div>
                ${robotSvg()}
              </div>
            </div>
          </section>
          <section id="about" class="section alt section-bg-robot">
            <div class="section-head">
              <div class="eyebrow">Về chúng tôi</div>
              <h2>ARTECH xây dựng giải pháp robot và AI cho vận hành thực tế.</h2>
              <p class="muted">Hệ thống được thiết kế cho mô hình doanh nghiệp cần quản lý nhiều robot, cập nhật cấu hình nhanh, kiểm soát dữ liệu học được và theo dõi tài nguyên sử dụng.</p>
            </div>
            <div class="grid-3">
              <article class="card feature-card">${featureIcon('robot')}<h3>Robot Service</h3><p>Quản lý từng robot theo Device ID, trạng thái, pin, server và cấu hình AI.</p></article>
              <article class="card feature-card">${featureIcon('database')}<h3>Knowledge Center</h3><p>Tập trung tài liệu PDF, Word, Text và tài nguyên ảnh để liên kết tri thức cho robot.</p></article>
              <article class="card feature-card">${featureIcon('brain')}<h3>Learning Data</h3><p>Ghi nhận câu hỏi người dùng theo ngày giờ và từng robot để cải thiện dữ liệu.</p></article>
            </div>
          </section>
          <section id="products" class="section product-section product-showcase-pro section-bg-soft">
            <div class="section-head product-head product-head-center">
              <div>
                <div class="eyebrow">Sản phẩm</div>
                <h2 class="product-title-large">CÁC SẢN PHẨM ROBOT PHỤC VỤ NỔI BẬT</h2>
                <p class="product-subtitle">Giải pháp tối ưu vận hành toàn diện</p>
              </div>
            </div>
            <div class="product-filter-row">${landingProductFilters()}</div>
            <div class="product-show-grid product-show-grid-cards" id="landingProductGrid">
              ${landingProductCards(landingCategory || 'all')}
            </div>
          </section>
          <section id="rent" class="section alt landing-mini-section section-bg-robot">
            <div class="section-head"><div class="eyebrow">Thuê Robot</div><h2>Gói thuê robot linh hoạt cho sự kiện và vận hành dài hạn.</h2><p class="muted">ARTECH cung cấp robot theo ngày, theo tháng hoặc theo dự án, kèm cấu hình nội dung, tri thức AI và hỗ trợ kỹ thuật trong quá trình vận hành.</p></div>
          </section>
          <section id="services" class="section landing-mini-section section-bg-soft">
            <div class="section-head"><div class="eyebrow">Dịch vụ</div><h2>Tư vấn, triển khai và tích hợp robot theo nhu cầu.</h2><p class="muted">Dịch vụ bao gồm thiết kế kịch bản giao tiếp, tích hợp API, xây dựng dashboard quản lý, đồng bộ dữ liệu và đào tạo vận hành cho đội ngũ doanh nghiệp.</p></div>
          </section>
          <section id="partner" class="section alt landing-mini-section section-bg-robot">
            <div class="section-head"><div class="eyebrow">Hợp tác kinh doanh</div><h2>Cùng phát triển hệ sinh thái robot ứng dụng thực tế.</h2><p class="muted">ARTECH mở rộng hợp tác với đơn vị giáo dục, khu công nghiệp, showroom, doanh nghiệp dịch vụ và đối tác công nghệ để triển khai giải pháp robot thông minh.</p></div>
          </section>
          <section id="news" class="section landing-mini-section section-bg-soft">
            <div class="section-head"><div class="eyebrow">Tin tức</div><h2>Cập nhật xu hướng robot, AI và chuyển đổi số.</h2><p class="muted">Theo dõi các bài viết, dự án mẫu và kinh nghiệm triển khai robot trong môi trường doanh nghiệp, giáo dục và dịch vụ.</p></div>
          </section>
          <section id="contact" class="section contact-section-pro">
            <div class="message-contact-layout">
              <div class="message-card">
                <div class="section-head compact-head">
                  <h2>Để lại lời nhắn cho chúng tôi</h2>
                  <p>Chúng tôi rất vui khi được lắng nghe ý kiến của bạn.</p>
                </div>
                <form id="contactForm" class="message-form-grid">
                  <div class="field wide"><label>Họ và tên <span class="req">*</span></label><input name="fullName" placeholder="Họ tên của bạn" required /></div>
                  <div class="field wide"><label>Số điện thoại <span class="req">*</span></label><input name="phone" placeholder="Nhập số điện thoại" required /></div>
                  <div class="field wide"><label>Gmail <span class="req">*</span></label><input name="email" type="email" autocomplete="email" placeholder="Nhập Gmail của bạn" required /></div>
                  <div class="field wide"><label>Tên công ty <span class="req">*</span></label><input name="company" placeholder="Nhập tên công ty của bạn" required /></div>
                  <div class="field wide"><label>Địa chỉ (Tỉnh/Thành) <span class="req">*</span></label><select name="city" required><option value="">Tìm nhanh tỉnh/thành...</option><option>Hà Nội</option><option>TP. Hồ Chí Minh</option><option>Đà Nẵng</option><option>Hải Phòng</option><option>Bắc Ninh</option></select></div>
                  <div class="field wide"><label>Hạng mục bạn quan tâm <span class="req">*</span></label><select name="interest" required><option value="">Chọn hạng mục</option><option>Robot phục vụ</option><option>Robot lễ tân</option><option>Robot vận chuyển công nghiệp</option><option>Robot vệ sinh công nghiệp</option><option>Phụ kiện & Phần mềm</option><option>Tư vấn triển khai giải pháp</option></select></div>
                  <div class="field wide"><label>Nội dung</label><textarea name="message" placeholder="Nhập nội dung ..."></textarea></div>
                  <div class="form-actions"><button class="btn contact-submit-btn" type="submit">Gửi thông tin ↗</button></div>
                  <div id="contactFormMsg" class="wide"></div>
                </form>
              </div>
              <div class="contact-info-panel">
                <div class="contact-info-grid-top">
                  <article class="contact-info-box">
                    <div class="contact-info-icon">✉</div>
                    <h3>Email</h3>
                    <p>Đội ngũ thân thiện của chúng tôi sẽ hỗ trợ bạn</p>
                    <a href="mailto:contact@artechrobotics.vn">contact@artechrobotics.vn</a>
                  </article>
                  <article class="contact-info-box">
                    <div class="contact-info-icon">■</div>
                    <h3>Số điện thoại</h3>
                    <p>Thứ 2 - thứ 7, 9am - 5pm</p>
                    <a href="tel:0981136986">098 113 6986</a>
                  </article>
                </div>
                <article class="contact-office-box">
                  <div class="contact-info-icon">⌖</div>
                  <h3>Văn phòng</h3>
                  <p>Ghé thăm địa chỉ văn phòng của chúng tôi</p>
                  <ul>
                    <li>CN HN 1: Số 4 Chính Kinh, Thanh Xuân, Hà Nội.</li>
                    <li>CN HN 2: Vinacomin Tower, Số 3 Dương Đình Nghệ, Phường Yên Hòa, Hà Nội.</li>
                    <li>CN HCM 1: Tòa nhà Dali, 24C Phan Đăng Lưu, Phường Gia Định, TPHCM.</li>
                    <li>CN HCM 2: 261 Nguyễn Trãi, Phường Hòa Hưng, Quận 1, TPHCM.</li>
                  </ul>
                </article>
              </div>
            </div>
            <div class="footer-links-pro">
              <div class="footer-brand-col">
                <div class="footer-brand-mark">AR</div>
                <p><strong>ARTECH</strong> | Chuyên cung cấp giải pháp tự động hóa với robot thông minh cho doanh nghiệp.</p>
                <div class="footer-socials"><span>f</span><span>♫</span><span>▶</span></div>
              </div>
              <div>
                <h4>SẢN PHẨM</h4>
                <a href="#products" data-product-nav="le-tan">Robot Lễ Tân</a>
                <a href="#products" data-product-nav="phuc-vu">Robot Phục Vụ</a>
                <a href="#products" data-product-nav="ve-sinh">Robot Vệ Sinh Công Nghiệp</a>
                <a href="#products" data-product-nav="van-chuyen">Robot Vận Chuyển Công Nghiệp</a>
                <a href="#products" data-product-nav="phu-kien">Phụ Kiện & Phần Mềm</a>
              </div>
              <div>
                <h4>DỊCH VỤ</h4>
                <a href="#rent">Cho thuê Robot</a>
                <a href="#services">Dịch vụ Thiết kế</a>
                <a href="#services">Dịch vụ Chăm sóc kỹ thuật</a>
                <a href="#services">Dịch vụ Sửa chữa Robot</a>
              </div>
              <div>
                <h4>HỢP TÁC KINH DOANH</h4>
                <a href="#partner">Chính sách Đại lý</a>
                <a href="#partner">Chính sách Cộng tác viên</a>
                <h4 class="footer-subhead">THÔNG TIN KHÁC</h4>
                <a href="#services">Chính sách bảo hành</a>
                <a href="#services">Chính sách bảo trì, bảo dưỡng</a>
                <a href="#services">Giao hàng, lắp đặt</a>
                <a href="#services">Hướng dẫn thay thế vật tư tiêu hao</a>
              </div>
              <div>
                <h4>THÔNG TIN LIÊN HỆ</h4>
                <p>MST công ty: 0318055730</p>
                <p>SĐT: 0981136986</p>
                <p>Email: contact@artechrobotics.vn</p>
                <p>Địa chỉ:</p>
                <ul>
                  <li>CN HN 1: Số 4 Chính Kinh, Thanh Xuân, Hà Nội</li>
                  <li>CN HN 2: Vinacomin Tower, Số 3 Dương Đình Nghệ, Hà Nội</li>
                  <li>CN HCM 1: Tòa nhà Dali, 24C Phan Đăng Lưu, TPHCM</li>
                  <li>CN HCM 2: 261 Nguyễn Trãi, Quận 1, TPHCM</li>
                </ul>
              </div>
            </div>
          </section>
        </main>
        <div class="floating-contact" aria-label="Liên hệ nhanh">
          <a href="#contact" class="float-zalo" aria-label="Liên hệ Zalo">
            <span class="float-icon zalo-text">Zalo</span>
          </a>
          <a href="#contact" class="float-messenger" aria-label="Liên hệ Messenger">
            <span class="float-icon messenger-icon">
              <svg viewBox="0 0 64 64" aria-hidden="true">
                <defs>
                  <linearGradient id="msgGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#8b5cf6"/>
                    <stop offset="100%" stop-color="#ec4899"/>
                  </linearGradient>
                </defs>
                <path d="M32 8c-13.3 0-24 9.6-24 21.4 0 6.8 3.5 12.8 9 16.7v9.8l9.2-5.1c1.9.3 3.8.5 5.8.5 13.3 0 24-9.6 24-21.4S45.3 8 32 8Z" fill="url(#msgGrad)"/>
                <path d="M18 38.2l10-11.3 7.8 6 10.2-11.3-11.2 6.4-7.5-6L18 38.2Z" fill="#fff"/>
              </svg>
            </span>
          </a>
          <a href="#contact" class="float-call" aria-label="Gọi điện">
            <span class="float-icon call-icon">
              <svg viewBox="0 0 64 64" aria-hidden="true">
                <circle cx="32" cy="32" r="30" fill="#ff1e1e"/>
                <path d="M41.8 43.7c-1.7 1.7-6.5 1-12.5-4.9-6-6-6.7-10.8-5-12.5l2.9-2.9c.7-.7.8-1.9.2-2.7l-4.5-6.4c-.7-.9-2-1.1-2.9-.3l-3.2 2.8c-3.5 3.1-3.1 9 1 15 3.6 5.4 9 10.8 14.4 14.4 6 4.1 11.9 4.5 15 1l2.8-3.2c.8-.9.7-2.2-.3-2.9l-6.4-4.5c-.8-.6-2-.5-2.7.2l-2.8 2.9Z" fill="#fff"/>
              </svg>
            </span>
          </a>
        </div>
      </div>
      <div id="authMount"></div>
      <div id="productMount"></div>
    `;
    bindLandingEvents();
  }

  function bindLandingEvents() {
    document.querySelectorAll('[data-open-auth]').forEach(btn => {
      btn.addEventListener('click', () => openAuth(btn.dataset.openAuth || 'login'));
    });
    document.querySelectorAll('[data-product-more]').forEach(btn => {
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        openProductInfo(btn.dataset.productMore);
      });
    });
    document.querySelectorAll('[data-product-filter]').forEach(btn => {
      btn.addEventListener('click', () => setLandingCategory(btn.dataset.productFilter || 'all'));
    });
    document.querySelectorAll('[data-product-nav]').forEach(link => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const key = link.dataset.productNav || 'all';
        setLandingCategory(key);
        document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    const explore = document.querySelector('[data-scroll-products]');
    if (explore) explore.addEventListener('click', () => {
      setLandingCategory('all');
      document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
      contactForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const data = formData(contactForm);
        setMsg('contactFormMsg', `Cảm ơn ${data.fullName || 'bạn'} đã để lại lời nhắn. Đội ngũ ARTECH sẽ liên hệ trong thời gian sớm nhất.`, 'success');
        contactForm.reset();
      });
    }
  }

  function openProductInfo(productId) {
    const product = landingProductData().find(item => item.id === productId);
    if (!product) return;
    const mount = document.getElementById('productMount');
    mount.innerHTML = `
      <div class="modal-backdrop">
        <section class="modal product-info-modal">
          <div class="modal-head">
            <div><h2>${escapeHtml(product.name)}</h2><p class="small">${escapeHtml(product.category)} · Giải pháp robot ARTECH</p></div>
            <button class="btn ghost square" data-close-product>${icon.close}</button>
          </div>
          <div class="modal-body">
            <div class="product-info-layout">
              <img src="${product.image}" alt="${escapeHtml(product.name)}" />
              <div>
                <div class="eyebrow">Giới thiệu sản phẩm</div>
                <h3>${escapeHtml(product.name)}</h3>
                <p>${escapeHtml(product.detail)}</p>
                <div class="chip-list">${product.specs.map(item => `<span class="chip">${escapeHtml(item)}</span>`).join('')}</div>
                <div class="form-actions"><button class="btn primary" type="button" data-open-auth="login">Vào hệ thống quản lý robot</button><a class="btn ghost" href="#contact" data-close-product-link>Liên hệ tư vấn</a></div>
              </div>
            </div>
          </div>
        </section>
      </div>`;
    mount.querySelector('[data-close-product]').addEventListener('click', () => mount.innerHTML = '');
    mount.querySelector('[data-open-auth]').addEventListener('click', () => { mount.innerHTML = ''; openAuth('login'); });
    mount.querySelector('[data-close-product-link]').addEventListener('click', () => { mount.innerHTML = ''; });
    mount.querySelector('.modal-backdrop').addEventListener('click', (event) => { if (event.target.classList.contains('modal-backdrop')) mount.innerHTML = ''; });
  }


  function authTitle() {
    if (authView === 'forgot') return 'Khôi phục mật khẩu hệ thống';
    if (authView === 'register') return 'Tạo tài khoản quản lý robot';
    if (authView === 'otp') return 'Xác thực OTP đăng nhập';
    return 'Đăng nhập hệ thống quản lý robot';
  }

  function renderAuthPage() {
    app.innerHTML = `
      <div class="auth-page-shell">
        <div class="auth-page-bg"></div>
        <section class="auth-page-card">
          <a class="logo v14-logo auth-page-logo" href="./index.html" aria-label="ARTECH Robotics">
            <img src="./assets/artech-logo.png" alt="ARTECH Robotics" />
          </a>
          <div class="auth-page-copy">
            <div class="eyebrow">ARTECH ROBOTICS</div>
            <h1>${authTitle()}</h1>
            <p>Truy cập dashboard để quản lý robot, tri thức AI, album ảnh, dữ liệu học được, tài khoản và thanh toán.</p>
          </div>
          <div id="authContent" class="auth-page-form">
            ${authView === 'register' ? registerForm() : authView === 'forgot' ? forgotForm() : authView === 'otp' ? loginOtpForm() : loginForm()}
          </div>
          <div class="auth-page-bottom"><a href="./index.html">← Quay lại trang chủ giới thiệu công ty</a></div>
        </section>
      </div>
      <div id="authMount"></div>
      <div id="productMount"></div>
      <div id="modalMount"></div>
    `;
    if (authView === 'login') bindLoginForm();
    if (authView === 'register') bindRegisterForm();
    if (authView === 'forgot') bindForgotForm();
    if (authView === 'otp') bindLoginOtpForm();
  }

  function openAuth(view = 'login') {
    authView = view;
    renderAuthPage();
  }

  function closeAuth() {
    const mount = document.getElementById('authMount');
    if (mount) mount.innerHTML = '';
  }

  function renderAuthModal() {
    renderAuthPage();
  }

  function loginForm() {
    return `
      <form id="loginForm">
        <div class="form-grid">
          <div class="field wide"><label>Email hoặc Tên đăng nhập <span class="required">*</span></label><input name="email" autocomplete="username" placeholder="user@gmail.com hoặc admin" required /></div>
          <div class="field wide"><label>Mật khẩu <span class="required">*</span></label><input name="password" type="password" autocomplete="current-password" placeholder="Nhập mật khẩu" required /></div>
        </div>
        <div class="form-actions auth-login-actions"><button class="btn primary" type="submit">Đăng nhập</button><button class="btn ghost" type="button" data-auth-tab-jump="register">Đăng ký</button></div>
        <div class="auth-quick-actions one-action">
          <button class="btn ghost" type="button" data-auth-tab-jump="forgot">Quên mật khẩu?</button>
        </div>  
        <div id="loginMsg"></div>
      </form>
    `;
  }

  function loginOtpForm() {
    const maskedEmail = pendingLoginOtp?.emailMasked || 'email tài khoản của bạn';
    const expires = pendingLoginOtp?.expiresMinutes || 5;
    return `
      <form id="loginOtpForm">
        <div class="otp-login-panel">
          <div class="otp-icon">OTP</div>
          <div>
            <h3>Nhập mã xác thực</h3>
            <p>Mã OTP đã được gửi tới <b>${escapeHtml(maskedEmail)}</b>. Mã có hiệu lực trong ${escapeHtml(expires)} phút.</p>
          </div>
        </div>
        <div class="form-grid">
          <div class="field wide"><label>Mã OTP <span class="required">*</span></label><input name="otp" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" autocomplete="one-time-code" placeholder="Nhập 6 số OTP" required /></div>
        </div>
        <div class="form-actions auth-login-actions">
          <button class="btn primary" type="submit">Xác thực & Đăng nhập</button>
          <button class="btn secondary" type="button" id="resendLoginOtp">Gửi lại OTP</button>
          <button class="btn ghost" type="button" data-auth-tab-jump="login">Quay lại</button>
        </div>
        <div id="loginOtpMsg"></div>
      </form>
    `;
  }

  function registerForm() {
    return `
      <form id="registerForm">
        <div class="form-grid">
          <div class="field"><label>Họ và tên <span class="required">*</span></label><input name="fullName" placeholder="Nguyễn Văn A" required /></div>
          <div class="field"><label>Tên đăng nhập <span class="required">*</span></label><input name="username" placeholder="nguyenvana" required /></div>
          <div class="field"><label>Email/Gmail <span class="required">*</span></label><input name="email" type="email" autocomplete="email" placeholder="nguyenvana@gmail.com" required /></div>
          <div class="field"><label>Số điện thoại <span class="required">*</span></label><input name="phoneNumber" inputmode="tel" placeholder="0123456789" required /></div>
          <div class="field"><label>Ngày thành lập / ngày sinh</label><input name="establishedDate" type="date" /></div>
          <div class="field"><label>Địa chỉ</label><input name="address" placeholder="Hà Nội" /></div>
          <div class="field"><label>Mật khẩu <span class="required">*</span></label><input name="password" type="password" autocomplete="new-password" placeholder="Tối thiểu 6 ký tự" required /></div>
          <div class="field"><label>Xác thực mật khẩu <span class="required">*</span></label><input name="confirmPassword" type="password" autocomplete="new-password" placeholder="Nhập lại mật khẩu" required /></div>
          <div class="field"><label>Xác nhận mã OTP <span class="required">*</span></label><input name="otp" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" autocomplete="one-time-code" placeholder="Nhập OTP từ Gmail" required /></div>
          <div class="field"><label>&nbsp;</label><button class="btn secondary" type="button" id="sendRegisterOtp">Xác thực Gmail</button></div>
          <div class="wide check-row"><input name="acceptTerms" type="checkbox" id="acceptTerms" required /><label for="acceptTerms">Tôi chấp nhận điều khoản <span class="required">*</span> và đồng ý lưu dữ liệu khi upload cho robot. Dữ liệu cá nhân sẽ được backend mã hóa trước khi lưu vào database.</label></div>
        </div>
        <div class="form-actions"><button class="btn primary" type="submit">Lưu & Tạo tài khoản</button><button class="btn ghost" type="button" data-auth-tab-jump="login">Đã có tài khoản</button></div>
        <div id="registerMsg"></div>
      </form>
    `;
  }

  function forgotForm() {
    return `
      <form id="forgotForm">
        <div class="form-grid">
          <div class="field wide"><label>Email hoặc Tên đăng nhập</label><input name="identifier" placeholder="user@gmail.com hoặc username" required /></div>
          <div class="field"><label>Mã OTP</label><input name="otp" inputmode="numeric" placeholder="OTP đã gửi về Gmail" /></div>
          <div class="field"><label>Mật khẩu mới</label><input name="password" type="password" autocomplete="new-password" placeholder="Nhập mật khẩu mới" /></div>
          <div class="field"><label>Xác nhận mật khẩu mới</label><input name="confirmPassword" type="password" autocomplete="new-password" placeholder="Nhập lại mật khẩu mới" /></div>
        </div>
        <div class="form-actions"><button class="btn secondary" type="button" id="sendForgotOtp">Gửi OTP</button><button class="btn primary" type="submit">Đổi mật khẩu</button><button class="btn ghost" type="button" data-auth-tab-jump="login">Quay lại đăng nhập</button></div>
        <div id="forgotMsg"></div>
      </form>
    `;
  }

  function setMsg(id, message, type = 'info') {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<div class="message-box ${type}">${escapeHtml(message)}</div>`;
  }

  function formData(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function bindLoginForm() {
    document.querySelectorAll('[data-auth-tab-jump]').forEach(btn => btn.addEventListener('click', () => { authView = btn.dataset.authTabJump; renderAuthModal(); }));
    document.getElementById('loginForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const body = formData(event.currentTarget);
      setMsg('loginMsg', 'Đang kiểm tra tài khoản...', 'info');
      const res = await api('/api/auth/login', { method: 'POST', body });
      if (!res.success) return setMsg('loginMsg', res.message || 'Đăng nhập thất bại', 'error');

      if (res.requiresOtp && !res.token) {
        return setMsg(
          'loginMsg',
          'Backend hiện vẫn đang bật OTP khi đăng nhập. Hãy thay auth.routes.js bằng bản v0.39 để đăng nhập không cần OTP.',
          'error'
        );
      }

      if (!res.token) return setMsg('loginMsg', 'Backend chưa trả token đăng nhập.', 'error');
      await completeLogin(res, body);
    });
  }

  function bindLoginOtpForm() {
    document.querySelectorAll('[data-auth-tab-jump]').forEach(btn => btn.addEventListener('click', () => {
      authView = btn.dataset.authTabJump;
      if (authView === 'login') savePendingLoginOtp(null);
      renderAuthModal();
    }));

    const form = document.getElementById('loginOtpForm');
    const resendBtn = document.getElementById('resendLoginOtp');

    if (!pendingLoginOtp?.otpId) {
      setMsg('loginOtpMsg', 'Phiên xác thực OTP không hợp lệ. Vui lòng quay lại đăng nhập.', 'error');
    }

    resendBtn?.addEventListener('click', async () => {
      if (!pendingLoginCredentials) {
        return setMsg('loginOtpMsg', 'Vì lý do bảo mật, vui lòng quay lại màn hình đăng nhập để gửi lại OTP.', 'error');
      }

      setMsg('loginOtpMsg', 'Đang gửi lại OTP...', 'info');
      const res = await api('/api/auth/login', { method: 'POST', body: pendingLoginCredentials });
      if (!res.success || !res.requiresOtp) return setMsg('loginOtpMsg', res.message || 'Không gửi lại được OTP', 'error');

      savePendingLoginOtp({
        otpId: res.otpId,
        emailMasked: res.emailMasked || pendingLoginOtp?.emailMasked || 'email tài khoản của bạn',
        expiresMinutes: res.expiresMinutes || 5,
        requestedAt: Date.now()
      });
      const demoOtp = res.devOtp || res.demoOtp;
      setMsg('loginOtpMsg', demoOtp ? `Đã gửi lại OTP. Mã demo local: ${demoOtp}` : 'Đã gửi lại OTP về email.', demoOtp ? 'info' : 'success');
    });

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const body = formData(form);

      if (!pendingLoginOtp?.otpId) {
        return setMsg('loginOtpMsg', 'Phiên xác thực OTP không hợp lệ. Vui lòng đăng nhập lại.', 'error');
      }

      setMsg('loginOtpMsg', 'Đang xác thực OTP...', 'info');
      const res = await api('/api/auth/verify-login-otp', {
        method: 'POST',
        body: {
          otpId: pendingLoginOtp.otpId,
          otp: body.otp
        }
      });

      if (!res.success) return setMsg('loginOtpMsg', res.message || 'Xác thực OTP thất bại', 'error');
      if (!res.token) return setMsg('loginOtpMsg', 'Backend xác thực OTP nhưng chưa trả token.', 'error');

      await completeLogin(res, pendingLoginCredentials || {});
    });
  }

  function bindRegisterForm() {
    document.querySelectorAll('[data-auth-tab-jump]').forEach(btn => btn.addEventListener('click', () => { authView = btn.dataset.authTabJump; renderAuthModal(); }));
    const form = document.getElementById('registerForm');
    document.getElementById('sendRegisterOtp').addEventListener('click', async () => {
      const email = form.email.value.trim();
      if (!email) return setMsg('registerMsg', 'Vui lòng nhập Email/Gmail trước khi xác thực.', 'error');
      if (!/^\S+@\S+\.\S+$/.test(email)) return setMsg('registerMsg', 'Email/Gmail chưa đúng định dạng.', 'error');

      setMsg('registerMsg', 'Đang gửi OTP về Gmail...', 'info');
      const res = await api('/api/auth/send-register-otp', {
        method: 'POST',
        body: { email }
      });

      if (!res.success) return setMsg('registerMsg', res.message || 'Không gửi được OTP xác thực Gmail', 'error');

      const demoOtp = res.devOtp || res.demoOtp;
      const emailText = res.emailMasked ? ` tới ${res.emailMasked}` : '';
      setMsg(
        'registerMsg',
        demoOtp
          ? `Đã tạo OTP xác thực Gmail${emailText}. Mã demo local: ${demoOtp}`
          : (res.message || `Đã gửi OTP xác thực Gmail${emailText}. Vui lòng kiểm tra hộp thư.`),
        demoOtp ? 'info' : 'success'
      );
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const body = formData(form);
      if (body.password !== body.confirmPassword) return setMsg('registerMsg', 'Mật khẩu xác nhận không khớp', 'error');
      if (!form.acceptTerms.checked) return setMsg('registerMsg', 'Vui lòng chấp nhận điều khoản trước khi tạo tài khoản.', 'error');
      if (!body.otp || !/^\d{6}$/.test(String(body.otp).trim())) return setMsg('registerMsg', 'Vui lòng nhập mã OTP Gmail gồm 6 số trước khi tạo tài khoản.', 'error');
      body.isAgreedToTerms = form.acceptTerms.checked;
      delete body.confirmPassword;
      setMsg('registerMsg', 'Đang xác thực OTP Gmail và tạo tài khoản...', 'info');
      const res = await api('/api/auth/register', { method: 'POST', body });
      if (!res.success) return setMsg('registerMsg', res.message || 'Tạo tài khoản thất bại', 'error');
      setMsg('registerMsg', `${res.message || 'Đăng ký thành công'}. Bạn có thể đăng nhập ngay.`, 'success');
      toast('Tạo tài khoản thành công', 'success');
      setTimeout(() => { authView = 'login'; renderAuthModal(); }, 1200);
    });
  }

  function bindForgotForm() {
    document.querySelectorAll('[data-auth-tab-jump]').forEach(btn => btn.addEventListener('click', () => { authView = btn.dataset.authTabJump; renderAuthModal(); }));
    const form = document.getElementById('forgotForm');
    document.getElementById('sendForgotOtp').addEventListener('click', async () => {
      const identifier = form.identifier.value.trim();
      if (!identifier) return setMsg('forgotMsg', 'Vui lòng nhập Email hoặc Tên đăng nhập.', 'error');
      setMsg('forgotMsg', 'Đang gửi OTP khôi phục mật khẩu...', 'info');
      const key = identifier.includes('@') ? 'email' : 'username';
      const res = await api('/api/auth/forgot-password', { method: 'POST', body: { [key]: identifier } });
      if (!res.success) return setMsg('forgotMsg', res.message || 'Không gửi được OTP', 'error');
      const demo = (res.demoOtp || res.devOtp) ? ` Mã demo local: ${res.demoOtp || res.devOtp}` : '';
      setMsg('forgotMsg', `${res.message}.${demo}`, 'success');
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const body = formData(form);
      const key = body.identifier.includes('@') ? 'email' : 'username';
      const payload = { [key]: body.identifier, otpCode: body.otp, otp: body.otp, newPassword: body.password, password: body.password, confirmPassword: body.confirmPassword };
      setMsg('forgotMsg', 'Đang đổi mật khẩu...', 'info');
      const res = await api('/api/auth/reset-password', { method: 'POST', body: payload });
      if (!res.success) return setMsg('forgotMsg', res.message || 'Đổi mật khẩu thất bại', 'error');
      setMsg('forgotMsg', res.message || 'Đổi mật khẩu thành công', 'success');
      toast('Đổi mật khẩu thành công', 'success');
      setTimeout(() => { authView = 'login'; renderAuthModal(); }, 1200);
    });
  }

  function renderDashboard() {
    const tabs = [
      ['robots', 'Quản lý Robot', icon.robot],
      ['areas', 'Khu vực hoạt động', icon.area],
      ['knowledge', 'Quản lý Tri thức', icon.database],
      ['albums', 'Quản lý Ảnh', icon.image],
      ['learned', 'Dữ liệu học được', icon.brain],
      ['billing', 'Tài khoản & Thanh toán', icon.card],
      ['help', 'Hướng dẫn & Hỗ trợ', icon.help]
    ];
    app.innerHTML = `
      <div class="dashboard-shell">
        <aside class="sidebar">
          <div class="sidebar-brand"><span class="logo-mark">AR</span><div><b>ARTECH Robot</b><div class="small mono">ARTECH CONTROL</div></div></div>
          <nav class="sidebar-nav">${tabs.map(([key, label, svg]) => `<button class="nav-item ${currentTab === key ? 'active' : ''}" data-tab="${key}">${svg}<span>${label}</span></button>`).join('')}</nav>
          <div class="sidebar-footer">
            <div class="user-mini"><div class="avatar">${escapeHtml((currentUser.fullName || currentUser.username || 'U').slice(0, 1).toUpperCase())}</div><div><b>${escapeHtml(currentUser.fullName || currentUser.username || 'User')}</b><div class="small">${escapeHtml(currentUser.role || 'User')}</div></div></div>
            <button class="nav-item" id="logoutBtn">${icon.logout}<span>Logout</span></button>
          </div>
        </aside>
        <main class="dashboard-main">
          <div class="dash-top">
            <div><h1 class="dash-title">Bảng điều khiển ARTECH Robot</h1><p class="dash-subtitle">Quản lý robot, tri thức, ảnh, dữ liệu học được, tài khoản và thanh toán trên hệ thống ARTECH.</p></div>
            <div class="company-panel"><span class="company-dot"></span><div><b>ARTECH System Online</b><div class="small">${dashboardData.robots.length} robot · ${(dashboardData.activityAreas || []).length} khu vực · ${dashboardData.knowledge.length} tài liệu</div></div></div>
          </div>
          <div id="tabContent">${renderTabContent()}</div>
        </main>
      </div>
      <div id="modalMount"></div>
    `;
    document.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => { currentTab = btn.dataset.tab; if (currentTab !== 'albums') selectedAlbumId = null; renderDashboard(); }));
    document.getElementById('logoutBtn').addEventListener('click', logout);
    bindCurrentTab();
  }

  function renderTabContent() {
    if (currentTab === 'areas') return renderActivityAreas();
    if (currentTab === 'knowledge') return renderKnowledge();
    if (currentTab === 'albums') return renderAlbums();
    if (currentTab === 'learned') return renderLearned();
    if (currentTab === 'billing') return renderBilling();
    if (currentTab === 'help') return renderHelp();
    return renderRobots();
  }

  function bindCurrentTab() {
    if (currentTab === 'robots') bindRobots();
    if (currentTab === 'areas') bindActivityAreas();
    if (currentTab === 'knowledge') bindKnowledge();
    if (currentTab === 'albums') bindAlbums();
    if (currentTab === 'learned') bindLearned();
    if (currentTab === 'billing') bindBilling();
  }

  async function logout() {
    localStorage.removeItem(TOKEN_KEY);
    currentUser = null;
    currentTab = 'robots';
    selectedAlbumId = null;
    selectedKnowledgeId = null;
    window.location.href = './index.html';
  }

  function renderRobots() {
    const options = Object.entries(statuses).map(([key, item]) => `<option value="${key}">${item.label}</option>`).join('');
    return `
      <div class="toolbar">
        <div class="search-box">${icon.search}<input id="robotSearch" placeholder="Tìm robot theo tên hoặc Device ID" /></div>
        <select id="robotStatusFilter" class="field-select"><option value="">Tất cả trạng thái</option>${options}</select>
        <button class="btn primary" id="addRobotBtn">${icon.plus} Thêm robot</button>
      </div>
      <div class="robot-grid" id="robotGrid">${robotCards(dashboardData.robots)}</div>
    `;
  }

  function robotCards(robots) {
    if (!robots.length) return '<div class="empty-state">Chưa có robot nào.</div>';
    return robots.map(robot => {
      const st = statuses[robot.status] || statuses.offline;
      return `
        <article class="robot-card robot-card-pro" data-robot-id="${robot.id}">
          <div class="robot-photo">${robotImageMarkup(robot)}</div>
          <div class="robot-top"><div><h3 class="robot-name">${escapeHtml(robot.name)}</h3><div class="robot-id">${escapeHtml(robot.deviceId)}</div></div><span class="status-pill ${st.cls}">${st.label}</span></div>
          <div class="battery"><b>${Number(robot.battery || 0)}% pin</b><div class="battery-line"><span style="width:${Math.max(0, Math.min(100, Number(robot.battery || 0)))}%"></span></div></div>
          <div class="robot-meta"><div class="meta-box"><span class="small">Token input</span><b>${Number(robot.tokenInput || 0).toLocaleString('vi-VN')}</b></div><div class="meta-box"><span class="small">Token output</span><b>${Number(robot.tokenOutput || 0).toLocaleString('vi-VN')}</b></div></div>
        </article>`;
    }).join('');
  }


  function robotImagePlaceholderMarkup(extraClass = '') {
    return `<div class="robot-photo-placeholder ${extraClass}"><span>AR</span><small>Robot Image</small></div>`;
  }

  function robotImageMarkup(robot) {
    const placeholder = robotImagePlaceholderMarkup('robot-photo-fallback');
    if (robot && robot.imageSrc) {
      return `<img class="fit-uploaded-media" src="${escapeHtml(robot.imageSrc)}" alt="${escapeHtml(robot.name || 'Robot ARTECH')}" loading="lazy" onerror="this.nextElementSibling.style.display='grid';this.remove();" />${placeholder}`;
    }
    return robotImagePlaceholderMarkup();
  }

  function robotUploadPreviewMarkup(src, name = 'ảnh robot') {
    if (!src) return '<div class="empty-state">Chưa có ảnh robot. Hãy upload ảnh để hiển thị trên bảng điều khiển.</div>';
    return `<div class="upload-preview-frame robot-upload-preview"><img alt="${escapeHtml(name)}" src="${escapeHtml(src)}" onerror="this.closest('.upload-preview-frame').classList.add('is-broken')" /></div>`;
  }

  function facePreviewMarkup(src) {
    if (!src) return '<div class="empty-state">Chưa có icon mặt. Có thể upload GIF/ảnh mới hoặc chọn file đã upload bên dưới.</div>';
    return `<div class="upload-preview-frame face-upload-preview"><img alt="icon mặt" src="${escapeHtml(src)}" onerror="this.closest('.upload-preview-frame').classList.add('is-broken')" /></div>`;
  }

  function faceLibraryMarkup(list = [], selectedId = '') {
    if (!list.length) return '<div class="empty-state face-library-empty">Chưa có file icon nào đã upload cho robot này.</div>';
    return list.map(item => `
      <button class="face-file-tile ${String(item.id) === String(selectedId) ? 'active' : ''}" type="button" data-select-face-icon="${escapeHtml(item.id)}">
        <span class="face-file-thumb"><img src="${escapeHtml(item.src || '')}" alt="${escapeHtml(item.name || 'Icon mặt')}" onerror="this.closest('.face-file-tile').classList.add('broken')" /></span>
        <span class="face-file-name">${escapeHtml(item.name || 'Icon mặt')}</span>
        ${item.isActive ? '<span class="face-file-active">Đang dùng</span>' : ''}
      </button>`).join('');
  }

  function getActivityAreaById(id) {
    return (dashboardData.activityAreas || []).find(area => area.id === id) || null;
  }

  function getRobotActivityAreaId(robot = {}) {
    if (robot.activityAreaId && getActivityAreaById(robot.activityAreaId)) return robot.activityAreaId;
    const legacy = String(robot.mapLocation || '').trim().toLowerCase();
    if (!legacy) return '';
    const found = (dashboardData.activityAreas || []).find(area => [area.id, area.name, area.code, area.floor].some(value => String(value || '').trim().toLowerCase() === legacy));
    return found ? found.id : '';
  }

  function getRobotActivityAreaLabel(robot = {}) {
    const area = getActivityAreaById(getRobotActivityAreaId(robot));
    if (area) return `${area.name}${area.floor && area.floor !== area.name ? ` · ${area.floor}` : ''}`;
    return robot.mapLocation || 'Chưa chọn khu vực hoạt động';
  }

  function activityAreaOptions(selectedId = '') {
    const areas = dashboardData.activityAreas || [];
    const optionRows = areas.map(area => {
      const st = areaStatuses[normalizeAreaStatus(area.status)] || areaStatuses.active;
      const label = `${area.name}${area.floor && area.floor !== area.name ? ` - ${area.floor}` : ''} (${st.label})`;
      return `<option value="${escapeHtml(area.id)}" ${selectedId === area.id ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    }).join('');
    const emptyLabel = areas.length ? 'Chưa chọn khu vực hoạt động' : 'Chưa có khu vực - hãy tạo ở mục Khu vực hoạt động';
    return `<option value="" ${selectedId ? '' : 'selected'}>${emptyLabel}</option>${optionRows}`;
  }

  function bindRobots() {
    const search = document.getElementById('robotSearch');
    const status = document.getElementById('robotStatusFilter');
    function update() {
      const q = search.value.trim().toLowerCase();
      const s = status.value;
      const list = dashboardData.robots.filter(r => (!q || `${r.name} ${r.deviceId}`.toLowerCase().includes(q)) && (!s || r.status === s));
      document.getElementById('robotGrid').innerHTML = robotCards(list);
      bindRobotCards();
    }
    search.addEventListener('input', update);
    status.addEventListener('change', update);
    document.getElementById('addRobotBtn').addEventListener('click', () => openRobotEditor(null));
    bindRobotCards();
  }

  function bindRobotCards() {
    document.querySelectorAll('[data-robot-id]').forEach(card => card.addEventListener('click', () => openRobotDetail(card.dataset.robotId)));
  }

  function openRobotDetail(id) {
    const robot = dashboardData.robots.find(r => r.id === id);
    if (!robot) return;
    const st = statuses[robot.status] || statuses.offline;
    const mount = document.getElementById('modalMount');
    mount.innerHTML = `
      <div class="modal-backdrop"><section class="modal">
        <div class="modal-head"><div><h2>${escapeHtml(robot.name)}</h2><p class="small mono">${escapeHtml(robot.deviceId)}</p></div><button class="btn ghost square" data-close-modal>${icon.close}</button></div>
        <div class="modal-body">
          <div class="grid-2">
            <div class="panel robot-detail-image-panel"><h3>Hình ảnh Robot</h3><div class="robot-detail-photo">${robotImageMarkup(robot)}</div></div>
            <div class="panel"><h3>Thông tin Robot</h3><p><b>Tên robot:</b> ${escapeHtml(robot.name)}</p><p><b>ID robot:</b> ${escapeHtml(robot.deviceId)}</p><p><b>Trạng thái robot:</b> <span class="status-pill ${st.cls}">${st.label}</span></p><p><b>Khu vực hoạt động:</b> ${escapeHtml(getRobotActivityAreaLabel(robot))}</p><p><b>Pin:</b> ${Number(robot.battery || 0)}%</p><div class="battery-line"><span style="width:${Number(robot.battery || 0)}%"></span></div><div class="hr"></div><p><b>Token input:</b> ${Number(robot.tokenInput || 0).toLocaleString('vi-VN')}</p><p><b>Token output:</b> ${Number(robot.tokenOutput || 0).toLocaleString('vi-VN')}</p><p><b>Tri thức chung:</b> ${robot.linkedKnowledge ? 'Đã liên kết' : 'Chưa liên kết'}</p></div>
          </div>
          <div class="panel"><h3>System Prompt</h3><p>${escapeHtml(robot.systemPrompt || 'Chưa cấu hình')}</p></div>
          <div class="form-actions"><button class="btn primary" id="editRobotBtn">Sửa cấu hình</button><button class="btn danger" id="deleteRobotBtn">Xóa robot</button></div>
        </div>
      </section></div>`;
    mount.querySelector('[data-close-modal]').addEventListener('click', () => mount.innerHTML = '');
    document.getElementById('editRobotBtn').addEventListener('click', () => openRobotEditor(robot.id));
    document.getElementById('deleteRobotBtn').addEventListener('click', async () => {
      if (!confirm('Bạn có chắc muốn xóa robot này?')) return;
      const res = await deleteRobotFromBackend(robot.id);
      if (!res.success) return toast(res.message || 'Không xóa được robot trên backend', 'error');
      dashboardData.robots = dashboardData.robots.filter(r => r.id !== robot.id);
      saveDashboardData();
      mount.innerHTML = '';
      toast('Đã xóa robot trong MySQL', 'success');
      renderDashboard();
    });
  }

  function openRobotEditor(id) {
    const old = dashboardData.robots.find(r => r.id === id) || {};
    const isNew = !id;
    const iconLibraryInitial = Array.isArray(old.faceIconLibrary) && old.faceIconLibrary.length ? old.faceIconLibrary : (old.faceIcons || []);
    const firstIcon = (old.faceIcons || [])[0] || iconLibraryInitial.find(item => item.isActive) || iconLibraryInitial[0] || {};
    const selectedIconInitial = firstIcon.id || '';
    const selectedAreaId = getRobotActivityAreaId(old);
    const mount = document.getElementById('modalMount');
    mount.innerHTML = `
      <div class="modal-backdrop"><section class="modal">
        <div class="modal-head"><div><h2>${isNew ? 'Tạo cấu hình Robot' : 'Quản lý cấu hình Robot'}</h2><p class="small">Có thể sửa và update data cho từng robot.</p></div><button class="btn ghost square" data-close-modal>${icon.close}</button></div>
        <div class="modal-body">
          <form id="robotForm">
            <div class="panel"><h3>Thông tin chức năng</h3><div class="form-grid">
              <div class="field"><label>Tên robot</label><input name="name" value="${escapeHtml(old.name || '')}" required /></div>
              <div class="field"><label>Device ID</label><input name="deviceId" value="${escapeHtml(old.deviceId || '')}" required /></div>
              <div class="field wide"><label>System Prompt</label><textarea name="systemPrompt">${escapeHtml(old.systemPrompt || '')}</textarea></div>
              <div class="field"><label>Trạng thái chức năng</label><input name="featureStatus" value="${escapeHtml(old.featureStatus || '')}" /></div>
              <div class="field"><label>% Pin</label><input name="battery" type="number" min="0" max="100" value="${Number(old.battery || 80)}" /></div>
              <div class="field robot-status-field"><label>Trạng thái</label><select name="status">${Object.entries(statuses).map(([k, v]) => `<option value="${k}" ${old.status === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></div>
              <div class="field robot-area-field"><label>Khu vực hoạt động</label><select name="activityAreaId">${activityAreaOptions(selectedAreaId)}</select></div>
            </div></div>
            <div class="panel"><h3>Cấu hình kết nối</h3><div class="form-grid">
              <div class="field"><label>Link Server</label><input name="serverLink" value="${escapeHtml(old.serverLink || '')}" /></div>
              <div class="field"><label>OpenAI API Key</label><input name="openaiKey" value="${escapeHtml(old.openaiKey || '')}" /></div>
              <div class="field"><label>Gemini API Key</label><input name="geminiKey" value="${escapeHtml(old.geminiKey || '')}" /></div>
              <div class="field"><label>GPT Model</label><input name="gptModel" value="${escapeHtml(old.gptModel || 'gpt-4.1-mini')}" /></div>
              <div class="field"><label>Gemini Model</label><input name="geminiModel" value="${escapeHtml(old.geminiModel || 'gemini-2.0-flash')}" /></div>
            </div></div>
            <div class="panel"><h3>Hình ảnh đại diện Robot</h3><div class="form-grid">
              <div class="field"><label>Upload ảnh robot</label><input name="robotImageFile" type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml,image/bmp" /></div>
              <div class="field"><label>Ghi chú ảnh</label><input name="robotImageNote" value="${escapeHtml(old.robotImageNote || '')}" placeholder="Ảnh đại diện trên bảng điều khiển" /></div>
              <div class="wide" id="robotImagePreview">${robotUploadPreviewMarkup(old.imageSrc || '', 'ảnh robot')}</div>
              <div class="wide form-actions"><button class="btn danger" type="button" id="clearRobotImage">Xóa ảnh robot và up lại</button></div>
            </div></div>
            <div class="panel"><h3>Cấu hình icon mặt</h3><div class="form-grid">
              <div class="field"><label>Đặt tên icon mặt</label><input name="faceName" value="${escapeHtml(firstIcon.name || '')}" placeholder="VD: Mặt chào khách" /></div>
              <div class="field"><label>Upload file icon/GIF</label><input name="faceFile" type="file" accept="image/gif,image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/bmp" /></div>
              <div class="wide" id="facePreview">${facePreviewMarkup(firstIcon.src || '')}</div>
              <div class="wide face-library-wrap">
                <div class="face-library-head"><b>File icon đã upload</b><span>Chọn 1 file, đặt tên rồi bấm Up / lưu icon mặt.</span></div>
                <div class="face-library-grid" id="faceLibraryGrid">${faceLibraryMarkup(iconLibraryInitial, selectedIconInitial)}</div>
              </div>
              <div class="wide form-actions"><button class="btn primary" type="button" id="uploadFaceIconBtn">${icon.upload} Up / lưu icon mặt</button><button class="btn danger" type="button" id="clearFaceIcon">Xóa chọn và up lại</button></div>
            </div></div>
            <div class="panel"><h3>Tri thức & Token</h3><div class="form-grid">
              <div class="wide check-row"><input type="checkbox" name="linkedKnowledge" id="linkedKnowledge" ${old.linkedKnowledge ? 'checked' : ''} /><label for="linkedKnowledge">Liên kết dữ liệu tri thức chung</label></div>
              <div class="field"><label>Token input</label><input name="tokenInput" type="number" value="${Number(old.tokenInput || 0)}" /></div>
              <div class="field"><label>Token output</label><input name="tokenOutput" type="number" value="${Number(old.tokenOutput || 0)}" /></div>
            </div></div>
            <div class="form-actions"><button class="btn primary" type="submit">${icon.save} Update data</button></div>
          </form>
        </div>
      </section></div>`;
    mount.querySelector('[data-close-modal]').addEventListener('click', () => mount.innerHTML = '');
    let iconLibraryState = [...iconLibraryInitial];
    let selectedFaceIconId = selectedIconInitial;
    let faceSrc = firstIcon.src || '';
    let robotImageSrc = old.imageSrc || '';
    let faceFileForUpload = null;
    let robotImageFileForUpload = null;

    function updateFacePreview(src) {
      document.getElementById('facePreview').innerHTML = facePreviewMarkup(src);
    }

    function renderFaceLibraryState() {
      const grid = document.getElementById('faceLibraryGrid');
      if (!grid) return;
      grid.innerHTML = faceLibraryMarkup(iconLibraryState, selectedFaceIconId);
      grid.querySelectorAll('[data-select-face-icon]').forEach(btn => btn.addEventListener('click', () => {
        const selected = iconLibraryState.find(item => String(item.id) === String(btn.dataset.selectFaceIcon));
        if (!selected) return;
        selectedFaceIconId = String(selected.id);
        faceFileForUpload = null;
        faceSrc = selected.src || '';
        const faceInput = mount.querySelector('input[name="faceFile"]');
        if (faceInput) faceInput.value = '';
        const nameInput = mount.querySelector('input[name="faceName"]');
        if (nameInput) nameInput.value = selected.name || '';
        updateFacePreview(faceSrc);
        renderFaceLibraryState();
      }));
    }

    async function saveFaceIconOnly() {
      if (isNew || !old.id) {
        return toast('Robot mới chưa có ID. Hãy bấm Update data để tạo robot, hệ thống sẽ lưu icon mặt cùng lúc.', 'info');
      }
      const faceName = (mount.querySelector('input[name="faceName"]')?.value || '').trim() || 'Icon mặt';
      let res = null;
      if (faceFileForUpload) {
        const fd = new FormData();
        fd.append('iconName', faceName);
        fd.append('icon', faceFileForUpload);
        res = await apiForm(`/api/robots/${old.id}/icons`, fd, 'POST');
        if (!res.success) return toast(res.message || 'Không upload được icon mặt', 'error');
        if (res.icon?.iconId) await api(`/api/robots/${old.id}/icons/${res.icon.iconId}/active`, { method: 'PUT', body: {} });
      } else if (selectedFaceIconId) {
        res = await api(`/api/robots/${old.id}/icons/${selectedFaceIconId}`, {
          method: 'PUT',
          body: { iconName: faceName, isActive: true }
        });
        if (!res.success) return toast(res.message || 'Không lưu được icon mặt đã chọn', 'error');
      } else {
        return toast('Hãy chọn file icon đã upload hoặc chọn file GIF/ảnh mới', 'error');
      }

      const iconsRes = await api(`/api/robots/${old.id}/icons`);
      if (iconsRes.success) {
        iconLibraryState = (iconsRes.icons || []).map(item => ({
          id: String(item.iconId || item.IconID || uid('face')),
          robotId: String(item.robotId || item.RobotID || old.id),
          name: fixMojibakeText(item.iconName || item.IconName || 'Icon mặt'),
          src: apiUrl(item.iconUrl || item.IconURL || ''),
          isActive: Boolean(item.isActive || item.IsActive),
          createdAt: item.createdAt || item.CreatedAt || new Date().toISOString()
        }));
        const active = iconLibraryState.find(item => item.isActive) || iconLibraryState[0];
        selectedFaceIconId = active?.id || '';
        faceSrc = active?.src || faceSrc;
        faceFileForUpload = null;
        const faceInput = mount.querySelector('input[name="faceFile"]');
        if (faceInput) faceInput.value = '';
        renderFaceLibraryState();
        updateFacePreview(faceSrc);
      }
      await refreshDashboardFromBackend({ quiet: true });
      toast('Đã lưu cấu hình khuôn mặt robot', 'success');
    }

    mount.querySelector('input[name="robotImageFile"]').addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      robotImageFileForUpload = file;
      robotImageSrc = await fileToDataUrl(file);
      document.getElementById('robotImagePreview').innerHTML = robotUploadPreviewMarkup(robotImageSrc, 'ảnh robot');
    });
    document.getElementById('clearRobotImage').addEventListener('click', async () => {
      if (!confirm('Bạn có chắc muốn xóa ảnh đại diện robot trong database và file upload trên máy không?')) return;
      const btn = document.getElementById('clearRobotImage');
      if (btn) btn.disabled = true;
      try {
        if (!isNew && old.id && !DEMO_DATA) {
          const res = await api(`/api/robots/${old.id}/image`, { method: 'DELETE', body: {} });
          if (!res.success) {
            if (btn) btn.disabled = false;
            return toast(res.message || 'Không xóa được ảnh robot trên backend', 'error');
          }
        }
        robotImageSrc = '';
        robotImageFileForUpload = null;
        old.imageSrc = '';
        const input = mount.querySelector('input[name="robotImageFile"]');
        if (input) input.value = '';
        document.getElementById('robotImagePreview').innerHTML = '<div class="empty-state">Đã xóa ảnh robot trong database và thư mục uploads. Hãy upload ảnh mới.</div>';
        dashboardData.robots = dashboardData.robots.map(r => r.id === old.id ? { ...r, imageSrc: '', robotImageNote: '' } : r);
        saveDashboardData();
        await refreshDashboardFromBackend({ quiet: true });
        toast('Đã xóa ảnh robot trong MySQL và file upload trên server', 'success');
      } finally {
        if (btn) btn.disabled = false;
      }
    });
    mount.querySelector('input[name="faceFile"]').addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      faceFileForUpload = file;
      selectedFaceIconId = '';
      faceSrc = await fileToDataUrl(file);
      updateFacePreview(faceSrc);
      renderFaceLibraryState();
    });
    renderFaceLibraryState();
    document.getElementById('uploadFaceIconBtn').addEventListener('click', saveFaceIconOnly);
    async function reloadFaceIconsAfterDelete() {
      const iconsRes = old.id ? await api(`/api/robots/${old.id}/icons`) : { success: true, icons: [] };
      if (iconsRes.success) {
        iconLibraryState = (iconsRes.icons || []).map(item => ({
          id: String(item.iconId || item.IconID || uid('face')),
          robotId: String(item.robotId || item.RobotID || old.id),
          name: fixMojibakeText(item.iconName || item.IconName || 'Icon mặt'),
          src: apiUrl(item.iconUrl || item.IconURL || ''),
          isActive: Boolean(item.isActive || item.IsActive),
          createdAt: item.createdAt || item.CreatedAt || new Date().toISOString()
        }));
      }
      const active = iconLibraryState.find(item => item.isActive) || iconLibraryState[0] || null;
      selectedFaceIconId = active?.id || '';
      faceSrc = active?.src || '';
      faceFileForUpload = null;
      const faceInput = mount.querySelector('input[name="faceFile"]');
      if (faceInput) faceInput.value = '';
      const nameInput = mount.querySelector('input[name="faceName"]');
      if (nameInput) nameInput.value = active?.name || '';
      updateFacePreview(faceSrc);
      renderFaceLibraryState();
      await refreshDashboardFromBackend({ quiet: true });
    }

    document.getElementById('clearFaceIcon').addEventListener('click', async () => {
      if (isNew || !old.id) {
        faceSrc = '';
        selectedFaceIconId = '';
        faceFileForUpload = null;
        const faceInput = mount.querySelector('input[name="faceFile"]');
        if (faceInput) faceInput.value = '';
        updateFacePreview('');
        renderFaceLibraryState();
        return toast('Đã xóa chọn icon tạm thời. Robot mới chưa lưu nên chưa có file trong MySQL.', 'info');
      }

      if (!selectedFaceIconId && !iconLibraryState.length) {
        faceSrc = '';
        faceFileForUpload = null;
        updateFacePreview('');
        return toast('Robot này chưa có icon mặt để xóa', 'info');
      }

      const deletingAll = !selectedFaceIconId;
      const message = deletingAll
        ? 'Bạn có chắc muốn xóa toàn bộ icon mặt của robot này khỏi MySQL và thư mục uploads không?'
        : 'Bạn có chắc muốn xóa icon mặt đang chọn khỏi MySQL và thư mục uploads không?';
      if (!confirm(message)) return;

      const endpoint = deletingAll
        ? `/api/robots/${old.id}/icons`
        : `/api/robots/${old.id}/icons/${selectedFaceIconId}`;

      const res = await api(endpoint, { method: 'DELETE', body: {} });
      if (!res.success) return toast(res.message || 'Không xóa được icon mặt', 'error');

      await reloadFaceIconsAfterDelete();
      toast(res.message || 'Đã xóa icon mặt trong MySQL và file upload', 'success');
    });
    document.getElementById('robotForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const submitBtn = event.currentTarget.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      const data = formData(event.currentTarget);
      const next = {
        ...old,
        id: old.id || uid('robot'),
        name: data.name.trim(), deviceId: data.deviceId.trim(), systemPrompt: data.systemPrompt.trim(), featureStatus: data.featureStatus.trim(), activityAreaId: (data.activityAreaId || '').trim(), mapLocation: getRobotActivityAreaLabel({ activityAreaId: (data.activityAreaId || '').trim(), mapLocation: '' }), robotImageNote: (data.robotImageNote || '').trim(), imageSrc: robotImageSrc,
        battery: Number(data.battery || 0), status: data.status, serverLink: data.serverLink.trim(), openaiKey: data.openaiKey.trim(), geminiKey: data.geminiKey.trim(), gptModel: data.gptModel.trim(), geminiModel: data.geminiModel.trim(),
        linkedKnowledge: Boolean(event.currentTarget.linkedKnowledge.checked), tokenInput: Number(data.tokenInput || 0), tokenOutput: Number(data.tokenOutput || 0),
        faceIcons: faceSrc ? [{ id: selectedFaceIconId || firstIcon.id || uid('face'), name: data.faceName || 'Icon mặt', src: faceSrc }] : []
      };
      const serverRes = await saveRobotToBackend(old, next, { robotImageFile: robotImageFileForUpload, faceFile: faceFileForUpload, faceIconId: selectedFaceIconId });
      if (!serverRes.success) {
        if (submitBtn) submitBtn.disabled = false;
        return toast(serverRes.message || 'Backend chưa lưu được cấu hình robot', 'error');
      }
      next.id = String(serverRes.robotId || next.id);
      if (serverRes.imageUrl) next.imageSrc = apiUrl(serverRes.imageUrl);
      if (isNew) dashboardData.robots.unshift(next);
      else dashboardData.robots = dashboardData.robots.map(r => r.id === old.id ? next : r);
      saveDashboardData();
      await refreshDashboardFromBackend({ quiet: true });
      toast(isNew ? 'Đã thêm robot vào MySQL' : 'Đã cập nhật cấu hình robot vào MySQL', 'success');
      mount.innerHTML = '';
      renderDashboard();
    });
  }


  function renderActivityAreas() {
    const areas = dashboardData.activityAreas || [];
    const areaCount = areas.length;
    const activeAreaCount = areas.filter(area => normalizeAreaStatus(area.status) === 'active').length;
    return `
      <section class="panel activity-board-panel">
        <div class="section-title-row activity-title-row">
          <div>
            <div class="eyebrow">Khu vực hoạt động</div>
            <h2>Quản lý khu vực hoạt động của Robot</h2>
            <p>Thiết lập bản đồ hoạt động, phân tầng khu vực và trạng thái sử dụng để robot chọn đúng khu vực vận hành.</p>
          </div>
          <div class="section-summary-chips">
            <span class="summary-chip"><b>${areaCount}</b> Khu vực</span>
            <span class="summary-chip"><b>${activeAreaCount}</b> Được sử dụng</span>
          </div>
        </div>
        <div class="toolbar activity-toolbar">
          <div class="search-box">${icon.search}<input id="activitySearch" placeholder="Tìm kiếm khu vực" /></div>
          <button class="btn primary" id="addAreaBtn">${icon.plus} Thêm khu vực</button>
        </div>
        <div class="activity-grid" id="activityGrid">${activityAreaCards(areas)}</div>
      </section>
    `;
  }

  function activityAreaCards(areas) {
    if (!areas.length) return '<div class="empty-state">Chưa có khu vực hoạt động nào. Hãy thêm khu vực đầu tiên cho robot.</div>';
    return areas.map(area => {
      const st = areaStatuses[normalizeAreaStatus(area.status)] || areaStatuses.active;
      return `
        <article class="activity-card" data-area-id="${area.id}">
          <div class="activity-map-wrap">
            <img src="${area.imageSrc || demoAreaMapImage(area.name, 0)}" alt="${escapeHtml(area.name)}" class="activity-map-image" />
            <span class="activity-status-pill ${st.cls}">${st.label}</span>
          </div>
          <div class="activity-card-body">
            <div class="activity-card-top">
              <div>
                <h3>${escapeHtml(area.name)}</h3>
                <p>${escapeHtml(area.code || '')} · ${escapeHtml(area.floor || '')}</p>
              </div>
              <div class="activity-state-box ${st.cls}"><span>Trạng thái</span><b>${st.label}</b></div>
            </div>
            <p class="activity-card-desc">${escapeHtml(area.description || 'Khu vực hoạt động chưa có mô tả.')}</p>
            <div class="activity-card-meta">
              <span>Ghi chú: ${escapeHtml(area.note || 'Chưa cập nhật')}</span>
              <span>Cập nhật: ${formatDateDisplay(area.updatedAt)}</span>
            </div>
            <div class="activity-card-actions">
              <button class="btn ghost" type="button" data-edit-area="${area.id}">Sửa</button>
              <button class="btn danger" type="button" data-delete-area="${area.id}">Xóa</button>
            </div>
          </div>
        </article>`;
    }).join('');
  }

  function bindActivityAreas() {
    const areaSearch = document.getElementById('activitySearch');
    const addAreaBtn = document.getElementById('addAreaBtn');
    function updateAreas() {
      const q = areaSearch.value.trim().toLowerCase();
      const list = (dashboardData.activityAreas || []).filter(area => {
        const bag = `${area.name || ''} ${area.code || ''} ${area.floor || ''} ${area.description || ''} ${area.note || ''}`.toLowerCase();
        return !q || bag.includes(q);
      });
      document.getElementById('activityGrid').innerHTML = activityAreaCards(list);
      bindActivityAreaCards();
    }
    if (areaSearch) areaSearch.addEventListener('input', updateAreas);
    if (addAreaBtn) addAreaBtn.addEventListener('click', () => openActivityAreaEditor(null));
    bindActivityAreaCards();
  }

  function bindActivityAreaCards() {
    document.querySelectorAll('[data-area-id]').forEach(card => card.addEventListener('click', () => openActivityAreaDetail(card.dataset.areaId)));
    document.querySelectorAll('[data-edit-area]').forEach(btn => btn.addEventListener('click', (event) => {
      event.stopPropagation();
      openActivityAreaEditor(btn.dataset.editArea);
    }));
    document.querySelectorAll('[data-delete-area]').forEach(btn => btn.addEventListener('click', async (event) => {
      event.stopPropagation();
      const area = (dashboardData.activityAreas || []).find(item => item.id === btn.dataset.deleteArea);
      if (!area) return;
      if (!confirm(`Bạn có chắc muốn xóa khu vực "${area.name}"?`)) return;
      const res = await deleteActivityAreaFromBackend(area.id);
      if (!res.success) return toast(res.message || 'Backend chưa xóa được khu vực khỏi MySQL', 'error');
      dashboardData.activityAreas = (dashboardData.activityAreas || []).filter(item => item.id !== area.id);
      saveDashboardData();
      toast('Đã xóa khu vực hoạt động khỏi MySQL', 'success');
      renderDashboard();
    }));
  }

  function openActivityAreaDetail(id) {
    const area = (dashboardData.activityAreas || []).find(item => item.id === id);
    if (!area) return;
    const st = areaStatuses[normalizeAreaStatus(area.status)] || areaStatuses.active;
    const mount = document.getElementById('modalMount');
    mount.innerHTML = `
      <div class="modal-backdrop"><section class="modal">
        <div class="modal-head"><div><h2>${escapeHtml(area.name)}</h2><p class="small mono">${escapeHtml(area.code || 'Khu vực hoạt động')}</p></div><button class="btn ghost square" data-close-modal>${icon.close}</button></div>
        <div class="modal-body">
          <div class="grid-2 activity-detail-grid">
            <div class="panel">
              <h3>Bản đồ khu vực</h3>
              <div class="activity-detail-map"><img src="${area.imageSrc || demoAreaMapImage(area.name, 0)}" alt="${escapeHtml(area.name)}" /></div>
            </div>
            <div class="panel">
              <h3>Thông tin khu vực</h3>
              <p><b>Tên khu vực:</b> ${escapeHtml(area.name)}</p>
              <p><b>Mã khu vực:</b> ${escapeHtml(area.code || 'Chưa cập nhật')}</p>
              <p><b>Tầng / Vị trí:</b> ${escapeHtml(area.floor || 'Chưa cập nhật')}</p>
              <p><b>Trạng thái:</b> <span class="activity-status-pill ${st.cls}">${st.label}</span></p>
              <p><b>Ghi chú:</b> ${escapeHtml(area.note || 'Chưa có ghi chú')}</p>
              <p><b>Cập nhật gần nhất:</b> ${formatDateDisplay(area.updatedAt)}</p>
            </div>
          </div>
          <div class="panel"><h3>Mô tả vận hành</h3><p>${escapeHtml(area.description || 'Chưa có mô tả chi tiết cho khu vực này.')}</p></div>
          <div class="form-actions"><button class="btn primary" id="editAreaBtn">Sửa khu vực</button><button class="btn danger" id="deleteAreaBtn">Xóa khu vực</button></div>
        </div>
      </section></div>`;
    mount.querySelector('[data-close-modal]').addEventListener('click', () => mount.innerHTML = '');
    document.getElementById('editAreaBtn').addEventListener('click', () => openActivityAreaEditor(area.id));
    document.getElementById('deleteAreaBtn').addEventListener('click', async () => {
      if (!confirm(`Bạn có chắc muốn xóa khu vực "${area.name}"?`)) return;
      const res = await deleteActivityAreaFromBackend(area.id);
      if (!res.success) return toast(res.message || 'Backend chưa xóa được khu vực khỏi MySQL', 'error');
      dashboardData.activityAreas = (dashboardData.activityAreas || []).filter(item => item.id !== area.id);
      saveDashboardData();
      mount.innerHTML = '';
      toast('Đã xóa khu vực hoạt động khỏi MySQL', 'success');
      renderDashboard();
    });
  }

  function openActivityAreaEditor(id) {
    const old = (dashboardData.activityAreas || []).find(item => item.id === id) || {};
    const isNew = !id;
    const mount = document.getElementById('modalMount');
    mount.innerHTML = `
      <div class="modal-backdrop"><section class="modal">
        <div class="modal-head"><div><h2>${isNew ? 'Thêm khu vực hoạt động' : 'Chỉnh sửa khu vực hoạt động'}</h2><p class="small">Quản lý bản đồ, khu vực triển khai và trạng thái sử dụng của từng khu vực.</p></div><button class="btn ghost square" data-close-modal>${icon.close}</button></div>
        <div class="modal-body">
          <form id="activityAreaForm">
            <div class="panel"><h3>Thông tin chính</h3><div class="form-grid">
              <div class="field"><label>Tên khu vực</label><input name="name" value="${escapeHtml(old.name || '')}" placeholder="Ví dụ: Tầng 1" required /></div>
              <div class="field"><label>Mã khu vực</label><input name="code" value="${escapeHtml(old.code || '')}" placeholder="Ví dụ: KV-T1" required /></div>
              <div class="field"><label>Tầng / Vị trí</label><input name="floor" value="${escapeHtml(old.floor || '')}" placeholder="Ví dụ: Tầng 1 - Sảnh chính" required /></div>
              <div class="field"><label>Trạng thái</label><select name="status">${Object.entries(areaStatuses).map(([key, item]) => `<option value="${key}" ${normalizeAreaStatus(old.status) === key ? 'selected' : ''}>${item.label}</option>`).join('')}</select></div>
              <div class="field"><label>Tiến trình ROS quét map (%)</label><input name="rosProgress" type="number" min="0" max="100" value="${Number(old.rosProgress || 0)}" placeholder="0-100" /></div>
              <div class="field wide"><label>Mô tả khu vực</label><textarea name="description" placeholder="Mô tả vai trò và cách robot vận hành trong khu vực">${escapeHtml(old.description || '')}</textarea></div>
              <div class="field wide"><label>Ghi chú vận hành</label><input name="note" value="${escapeHtml(old.note || '')}" placeholder="Ví dụ: Ưu tiên robot lễ tân / khu vực đang hiệu chuẩn" /></div>
            </div></div>
            <div class="panel"><h3>Bản đồ khu vực</h3><div class="form-grid">
              <div class="field"><label>Upload hình bản đồ</label><input name="areaImageFile" type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml,image/bmp" /></div>
              <div class="wide" id="activityAreaPreview">${(old.imageSrc || '').trim() ? `<img alt="map khu vực" src="${old.imageSrc}" style="width:100%;max-height:260px;border-radius:20px;border:1px solid var(--line);object-fit:cover;" />` : `<img alt="map khu vực" src="${demoAreaMapImage(old.name || 'Khu vực mới', (dashboardData.activityAreas || []).length)}" style="width:100%;max-height:260px;border-radius:20px;border:1px solid var(--line);object-fit:cover;" />`}</div>
              <div class="wide form-actions"><button class="btn danger" type="button" id="clearAreaImage">Xóa ảnh khu vực</button></div>
            </div></div>
            <div class="form-actions"><button class="btn primary" type="submit">${icon.save} Lưu khu vực hoạt động</button></div>
          </form>
        </div>
      </section></div>`;
    mount.querySelector('[data-close-modal]').addEventListener('click', () => mount.innerHTML = '');
    let areaImageSrc = old.imageSrc || demoAreaMapImage(old.name || 'Khu vực mới', (dashboardData.activityAreas || []).length);
    let areaImageFileForUpload = null;
    const preview = document.getElementById('activityAreaPreview');
    mount.querySelector('input[name="areaImageFile"]').addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      areaImageFileForUpload = file;
      areaImageSrc = await fileToDataUrl(file);
      preview.innerHTML = `<img alt="map khu vực" src="${areaImageSrc}" style="width:100%;max-height:260px;border-radius:20px;border:1px solid var(--line);object-fit:cover;" />`;
    });
    document.getElementById('clearAreaImage').addEventListener('click', () => {
      areaImageSrc = demoAreaMapImage(old.name || 'Khu vực mới', (dashboardData.activityAreas || []).length);
      areaImageFileForUpload = null;
      preview.innerHTML = `<img alt="map khu vực" src="${areaImageSrc}" style="width:100%;max-height:260px;border-radius:20px;border:1px solid var(--line);object-fit:cover;" />`;
    });
    document.getElementById('activityAreaForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(event.currentTarget);
      const next = {
        ...old,
        id: old.id || uid('area'),
        name: (data.name || '').trim(),
        code: (data.code || '').trim(),
        floor: (data.floor || '').trim(),
        status: normalizeAreaStatus(data.status || 'active'),
        description: (data.description || '').trim(),
        note: (data.note || '').trim(),
        rosProgress: Number(data.rosProgress || old.rosProgress || 0),
        imageSrc: areaImageSrc || demoAreaMapImage((data.name || 'Khu vực mới').trim(), (dashboardData.activityAreas || []).length),
        updatedAt: new Date().toISOString()
      };
      const serverRes = await saveActivityAreaToBackend(old, next, areaImageFileForUpload);
      if (serverRes.success) {
        if (serverRes.area) Object.assign(next, serverRes.area);
        toast(isNew ? 'Đã thêm khu vực hoạt động vào MySQL' : 'Đã cập nhật khu vực hoạt động vào MySQL', 'success');
        if (isNew) dashboardData.activityAreas = [next, ...(dashboardData.activityAreas || [])];
        else dashboardData.activityAreas = (dashboardData.activityAreas || []).map(item => item.id === next.id ? next : item);
        saveDashboardData();
        mount.innerHTML = '';
        renderDashboard();
        return;
      }

      toast(serverRes.message || 'Backend chưa có /api/activity-areas nên chưa thể lưu khu vực vào MySQL. Hãy chạy backend patch v0.27 rồi thử lại.', 'error');
    });
  }

  function renderKnowledge() {
    const docs = Array.isArray(dashboardData.knowledge) ? dashboardData.knowledge : [];
    const normalizedFilter = knowledgeFilter || 'all';
    const filteredDocs = docs.filter(doc => {
      if (normalizedFilter === 'all') return true;
      const type = String(doc.type || '').toLowerCase();
      if (normalizedFilter === 'word') return type === 'doc' || type === 'docx' || type === 'word';
      if (normalizedFilter === 'image') return isImageType(type);
      return type === normalizedFilter;
    });
    if (!selectedKnowledgeId || !docs.some(doc => doc.id === selectedKnowledgeId)) selectedKnowledgeId = docs[0]?.id || null;
    const selectedDoc = docs.find(doc => doc.id === selectedKnowledgeId) || null;
    const selectedText = knowledgeTextDraft || selectedDoc?.extractedText || '';
    const hasKnowledgeFiles = docs.some(doc => doc.serverSource === 'knowledge');
    const filterBtn = (key, label) => `<button class="mini-filter ${normalizedFilter === key ? 'active' : ''}" data-doc-filter="${key}">${label}</button>`;

    return `
      <section class="knowledge-board">
        <div class="knowledge-header">
          <div>
            <h2>Tri thức & Tài nguyên Hình ảnh</h2>
            <p>Quản lý cơ sở dữ liệu huấn luyện và tài nguyên hình ảnh. Tải lên tài liệu văn bản hoặc tổ chức hình ảnh thành album để phục vụ quá trình học máy của hệ thống.</p>
          </div>
          <div class="knowledge-actions">
            <button class="btn primary" id="triggerKnowledgeUpload">${icon.upload} Tải lên Tài liệu</button>
            <button class="btn ghost" id="goCreateAlbum">${icon.plus} Tạo Album Ảnh</button>
          </div>
        </div>

        <input id="knowledgeInput" class="hidden" type="file" multiple accept=".pdf,.doc,.docx,.txt,.md,.csv,.json,.log,.png,.jpg,.jpeg,.webp,.gif,.bmp,.svg,.heic,.heif,.tif,.tiff" />

        <div class="knowledge-title-row">
          <h3>${icon.database} Tài liệu Tri thức</h3>
          <div class="mini-filter-group">
            ${filterBtn('all', 'Tất cả')}
            ${filterBtn('pdf', 'PDF')}
            ${filterBtn('word', 'Word')}
            ${filterBtn('txt', 'Text')}
            ${filterBtn('image', 'Ảnh')}
          </div>
        </div>

        <label class="upload-zone" id="knowledgeDropZone" for="knowledgeInput">
          <span class="upload-cloud">${icon.upload}</span>
          <b>Kéo thả file vào đây hoặc nhấp để duyệt</b>
          <small>Hỗ trợ PDF, DOCX, TXT, MD, CSV, JSON, LOG và ảnh PNG, JPG, JPEG, WEBP, GIF, BMP, SVG, HEIC, TIFF.</small>
        </label>

        <div class="extract-panel">
          <div class="extract-head">
            <h3>${icon.save} Dữ liệu văn bản trích xuất</h3>
            <button class="btn ghost" id="copyExtractedText" ${selectedDoc ? '' : 'disabled'}>Sao chép</button>
          </div>
          ${selectedDoc && selectedDoc.previewSrc ? `<div class="image-resource-preview"><img src="${selectedDoc.previewSrc}" alt="${escapeHtml(selectedDoc.name)}" /><div><b>Tài nguyên hình ảnh</b><span>${escapeHtml(selectedDoc.name)}</span></div></div>` : ''}
          <textarea id="extractedTextArea" placeholder="Văn bản trích xuất từ tài liệu sẽ hiển thị ở đây, hoặc bạn có thể nhập thủ công..." ${selectedDoc ? '' : 'disabled'}>${escapeHtml(selectedText)}</textarea>
          <div class="extract-foot">
            <div class="small">${selectedDoc ? `Đang chọn: <b>${escapeHtml(selectedDoc.name)}</b>` : 'Chưa chọn tài liệu nào.'}</div>
            <div class="form-actions compact">
              <button class="btn secondary" id="extractPendingKnowledge" ${hasKnowledgeFiles ? '' : 'disabled'}>${icon.upload} Trích xuất</button>
              <button class="btn ghost" id="cancelExtractEdit" ${selectedDoc ? '' : 'disabled'}>Hủy</button>
              <button class="btn primary" id="saveExtractedText" ${selectedDoc ? '' : 'disabled'}>Lưu file</button>
            </div>
          </div>
        </div>

        <div class="table-wrap knowledge-table">
          <table>
            <thead><tr><th>Tên tài liệu</th><th>Loại</th><th>Trạng thái</th><th>Ngày upload</th><th>Thao tác</th></tr></thead>
            <tbody>
              ${filteredDocs.map(doc => knowledgeRow(doc)).join('') || '<tr><td colspan="5">Chưa có tài liệu phù hợp.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function knowledgeRow(doc) {
    const iconByType = documentFileIcon(doc.type);
    const selected = doc.id === selectedKnowledgeId ? 'selected-row' : '';
    return `
      <tr class="${selected}">
        <td><div class="doc-name">${iconByType}<span>${escapeHtml(doc.name)}</span></div></td>
        <td>${escapeHtml(doc.type || 'FILE')}</td>
        <td>${knowledgeStatusBadge(doc)}</td>
        <td>${doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString('vi-VN') : '-'}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" title="Xem dữ liệu đọc được" data-view-doc="${doc.id}">👁</button>
            <button class="icon-btn danger" title="Xóa tài liệu" data-delete-doc="${doc.id}">${icon.trash}</button>
          </div>
        </td>
      </tr>`;
  }

  function knowledgeStatusBadge(doc) {
    const status = String(doc?.extractionStatus || '').toLowerCase() === 'extracted' ? 'extracted' : 'pending';
    if (status === 'extracted') return '<span class="knowledge-status extracted">Đã trích xuất</span>';
    return '<span class="knowledge-status pending">Chưa trích xuất</span>';
  }

  function documentFileIcon(type) {
    const t = String(type || '').toLowerCase();
    if (t === 'pdf') return '<span class="file-badge pdf">PDF</span>';
    if (t === 'doc' || t === 'docx' || t === 'word') return '<span class="file-badge word">W</span>';
    if (isImageType(t)) return '<span class="file-badge image">IMG</span>';
    return '<span class="file-badge text">TXT</span>';
  }

  function isImageType(type) {
    return ['png','jpg','jpeg','webp','gif','bmp','svg','heic','heif','tif','tiff','image'].includes(String(type || '').toLowerCase());
  }

  function bindKnowledge() {
    const input = document.getElementById('knowledgeInput');
    const dropZone = document.getElementById('knowledgeDropZone');
    document.getElementById('triggerKnowledgeUpload').addEventListener('click', () => input.click());
    input.addEventListener('change', () => handleKnowledgeFiles(Array.from(input.files || [])));

    dropZone.addEventListener('dragover', (event) => {
      event.preventDefault();
      dropZone.classList.add('dragging');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'));
    dropZone.addEventListener('drop', (event) => {
      event.preventDefault();
      dropZone.classList.remove('dragging');
      handleKnowledgeFiles(Array.from(event.dataTransfer.files || []));
    });

    document.getElementById('goCreateAlbum').addEventListener('click', () => {
      currentTab = 'albums';
      renderDashboard();
    });

    document.querySelectorAll('[data-doc-filter]').forEach(btn => btn.addEventListener('click', () => {
      knowledgeFilter = btn.dataset.docFilter || 'all';
      renderDashboard();
    }));

    document.querySelectorAll('[data-view-doc]').forEach(btn => btn.addEventListener('click', () => {
      selectedKnowledgeId = btn.dataset.viewDoc;
      knowledgeTextDraft = '';
      renderDashboard();
    }));

    document.querySelectorAll('[data-delete-doc]').forEach(btn => btn.addEventListener('click', async () => {
      if (!confirm('Xóa tài liệu này?')) return;
      const doc = dashboardData.knowledge.find(d => d.id === btn.dataset.deleteDoc);
      let res = { success: true };
      if (doc?.serverSource === 'knowledge') res = await api(`/api/knowledge/${doc.id}`, { method: 'DELETE' });
      else if (doc?.serverSource === 'asset') res = await api(`/api/assets/${doc.id}`, { method: 'DELETE' });
      if (!res.success) return toast(res.message || 'Không xóa được tài liệu trên backend', 'error');
      dashboardData.knowledge = dashboardData.knowledge.filter(d => d.id !== btn.dataset.deleteDoc);
      if (selectedKnowledgeId === btn.dataset.deleteDoc) {
        selectedKnowledgeId = dashboardData.knowledge[0]?.id || null;
        knowledgeTextDraft = '';
      }
      saveDashboardData();
      toast('Đã xóa tài liệu khỏi MySQL và xóa file upload trên server', 'info');
      renderDashboard();
    }));

    const textArea = document.getElementById('extractedTextArea');
    const selectedDoc = dashboardData.knowledge.find(doc => doc.id === selectedKnowledgeId);
    if (textArea) textArea.addEventListener('input', () => { knowledgeTextDraft = textArea.value; });

    document.getElementById('extractPendingKnowledge').addEventListener('click', async (event) => {
      const knowledgeDocs = dashboardData.knowledge.filter(doc => doc.serverSource === 'knowledge');
      if (!knowledgeDocs.length) return toast('Chưa có file tri thức nào để trích xuất', 'info');
      event.currentTarget.disabled = true;
      event.currentTarget.textContent = 'Đang trích xuất...';
      const res = await api('/api/knowledge/extract', { method: 'POST', body: {} });
      if (!res.success) {
        toast(res.message || 'Backend chưa trích xuất được tài liệu', 'error');
        return renderDashboard();
      }
      const failedCount = Number(res.failedCount || 0);
      const combinedText = fixMojibakeText(res.combinedText || (Array.isArray(res.extracted) ? res.extracted.map(item => item.extractedText || '').filter(Boolean).join('\n\n') : ''));
      if (combinedText) {
        knowledgeTextDraft = combinedText;
        textArea.value = combinedText;
      }
      toast(failedCount ? `${res.message}. Có ${failedCount} file lỗi, kiểm tra lại định dạng.` : (res.message || 'Đã trích xuất tài liệu'), failedCount ? 'info' : 'success');
      await refreshDashboardFromBackend({ quiet: true });
      renderDashboard();
    });

    document.getElementById('cancelExtractEdit').addEventListener('click', () => {
      if (!selectedDoc) return;
      knowledgeTextDraft = selectedDoc.extractedText || '';
      textArea.value = knowledgeTextDraft;
      toast('Đã hoàn tác nội dung chỉnh sửa', 'info');
    });
    document.getElementById('saveExtractedText').addEventListener('click', async () => {
      if (!selectedDoc) return;
      const content = textArea.value.trim();
      if (!content) return toast('Nội dung lưu không được để trống', 'error');
      const res = await api('/api/knowledge/text-store/append', {
        method: 'POST',
        body: {
          title: selectedDoc.name || 'Dữ liệu tri thức',
          content
        }
      });
      if (!res.success) return toast(res.message || 'Không lưu được văn bản vào bảng robotknowledge_text_store', 'error');
      knowledgeTextDraft = content;
      toast('Đã lưu nối tiếp văn bản vào cột Content của bảng robotknowledge_text_store', 'success');
    });
    document.getElementById('copyExtractedText').addEventListener('click', async () => {
      if (!selectedDoc) return;
      const text = textArea.value || '';
      try {
        await navigator.clipboard.writeText(text);
        toast('Đã sao chép dữ liệu văn bản', 'success');
      } catch {
        textArea.select();
        document.execCommand('copy');
        toast('Đã sao chép dữ liệu văn bản', 'success');
      }
    });
  }

  async function handleKnowledgeFiles(files) {
    if (!files.length) return toast('Hãy chọn file tài liệu hoặc hình ảnh', 'error');
    const allowed = ['pdf', 'doc', 'docx', 'txt', 'md', 'csv', 'json', 'log', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg', 'heic', 'heif', 'tif', 'tiff'];
    let firstNewId = null;
    const targetRobot = dashboardData.robots[0] || null;
    for (const file of files) {
      const ext = (file.name.split('.').pop() || 'file').toLowerCase();
      if (!allowed.includes(ext)) {
        toast(`File ${file.name} chưa được hỗ trợ`, 'error');
        continue;
      }
      const canSaveAsKnowledgeFile = Boolean(targetRobot && ['pdf', 'doc', 'docx', 'txt', 'md', 'csv', 'json', 'log'].includes(ext));
      const extractedText = canSaveAsKnowledgeFile ? '' : await extractKnowledgeText(file, ext);
      let doc = {
        id: uid('doc'),
        name: file.name,
        type: ext.toUpperCase(),
        size: formatBytes(file.size),
        uploadedAt: new Date().toISOString(),
        linkedRobots: targetRobot ? [targetRobot.deviceId] : [],
        extractedText,
        extractionStatus: canSaveAsKnowledgeFile ? 'pending' : 'extracted',
        previewSrc: isImageType(ext) ? await fileToDataUrl(file) : ''
      };

      if (canSaveAsKnowledgeFile) {
        const fd = new FormData();
        fd.append('robotId', targetRobot.id);
        fd.append('title', file.name);
        fd.append('description', `Upload từ frontend ARTECH cho robot ${targetRobot.deviceId || targetRobot.name}`);
        fd.append('dataType', ext.toUpperCase());
        fd.append('status', 'active');
        fd.append('file', file);
        const res = await apiForm('/api/knowledge', fd, 'POST');
        if (res.success) {
          doc.id = String(res.knowledgeId || doc.id);
          doc.robotId = targetRobot.id;
          doc.robotName = targetRobot.name;
          doc.serverSource = 'knowledge';
          doc.extractionStatus = res.extractionStatus || 'pending';
        } else {
          toast(res.message || `Backend chưa lưu được ${file.name} vào MySQL`, 'error');
          continue;
        }
      } else {
        const asset = await uploadGeneralAsset(file, isImageType(ext) ? 'KNOWLEDGE_RESOURCE_IMAGE' : 'KNOWLEDGE_RESOURCE', { title: file.name, description: extractedText.slice(0, 500), category: 'knowledge' });
        if (asset?.assetId) {
          doc.id = String(asset.assetId);
          doc.fileUrl = apiUrl(asset.fileUrl);
          doc.previewSrc = isImageType(ext) ? apiUrl(asset.fileUrl) : doc.previewSrc;
          doc.serverSource = 'asset';
        } else {
          toast(`Backend chưa lưu được ${file.name} vào MySQL`, 'error');
          continue;
        }
      }

      dashboardData.knowledge.unshift(doc);
      if (!firstNewId) firstNewId = doc.id;
    }
    if (!firstNewId) return;
    selectedKnowledgeId = firstNewId;
    knowledgeTextDraft = '';
    saveDashboardData();
    await refreshDashboardFromBackend({ quiet: true });
    toast('Đã tải lên tài liệu/tài nguyên ảnh và đồng bộ backend', 'success');
    renderDashboard();
  }

  async function extractKnowledgeText(file, ext) {
    const textTypes = ['txt', 'md', 'csv', 'json', 'log'];
    if (textTypes.includes(ext)) {
      try {
        const text = await file.text();
        return text.trim();
      } catch {
        return '';
      }
    }
    if (isImageType(ext)) {
      return `Tài nguyên hình ảnh: ${file.name}\n\nFile ảnh đã được thêm vào kho tài nguyên. Bạn có thể nhập mô tả, nhãn nhận diện, thông tin sản phẩm/khu vực hoặc ghi chú huấn luyện tại đây để robot sử dụng khi tra cứu hình ảnh.`;
    }
    if (ext === 'pdf') {
      return `File PDF: ${file.name}\n\nFrontend đã nhận file thành công. Để đọc nội dung PDF thật, backend cần tích hợp bộ parser PDF/OCR. Tạm thời bạn có thể copy nội dung văn bản đã trích xuất và dán vào vùng này, sau đó bấm Lưu AI file.`;
    }
    return `File Word: ${file.name}\n\nFrontend đã nhận file thành công. Để đọc nội dung DOC/DOCX thật, backend cần tích hợp bộ parser Word. Tạm thời bạn có thể copy nội dung văn bản đã trích xuất và dán vào vùng này, sau đó bấm Lưu AI file.`;
  }

  function coverClass(index) {
    return `cover-${(index % 5) + 1}`;
  }

  function renderAlbumCover(album, index) {
    const images = album.images || [];
    const label = escapeHtml(album.name || 'Album');
    const fallback = `<div class="album-cover-art ${coverClass(index)} album-cover-fallback"><div class="album-cover-lines"></div><span>${label}</span></div>`;
    if (images[0] && images[0].src) {
      return `<img src="${escapeHtml(images[0].src)}" alt="${label}" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';" />${fallback.replace('album-cover-fallback', 'album-cover-fallback hidden-cover')}`;
    }
    return fallback;
  }

  function renderAlbums() {
    if (selectedAlbumId) {
      const selectedAlbum = dashboardData.albums.find(a => a.id === selectedAlbumId);
      if (selectedAlbum) return renderAlbumDetailPage(selectedAlbum);
      selectedAlbumId = null;
    }
    const totalImages = dashboardData.albums.reduce((sum, album) => sum + ((album.images || []).length), 0);
    return `
      <section class="album-console">
        <div class="album-status-card">
          <div>
            <div class="eyebrow">Bảng điều khiển trung tâm</div>
            <div class="sync-line"><span class="company-dot"></span><b>Đồng bộ dữ liệu ảnh ARTECH</b><span>· ${dashboardData.albums.length} album · ${totalImages} hình ảnh</span></div>
          </div>
          <span class="latency-badge">Server Latency: 12ms</span>
        </div>
        <div class="album-heading">
          <div>
            <h2>Quản lý Ảnh sản phẩm & khu vực</h2>
            <p>Sắp xếp dữ liệu hình ảnh thành phẩm, bản đồ vật cản và mẫu lỗi chất lượng theo từng album chuyên biệt để quản lý camera robots.</p>
          </div>
          <button class="btn primary" id="createAlbumBtn">${icon.plus} Tạo Album mới</button>
        </div>
        <div class="album-pro-grid">
          ${dashboardData.albums.map((album, index) => `
            <article class="album-pro-card ${album.isVirtual ? 'album-system-card' : ''}" data-open-album="${album.id}">
              <div class="album-pro-cover">
                ${renderAlbumCover(album, index)}
                <div class="album-pro-overlay">
                  ${album.isVirtual ? '<span class="album-system-badge">Nhóm hệ thống</span>' : ''}
                  <h3>${escapeHtml(album.name)}</h3>
                  <p>${(album.images || []).length} Hình ảnh</p>
                </div>
              </div>
            </article>
          `).join('')}
          <button class="album-create-card" id="createAlbumCard" type="button">
            <span>${icon.plus}</span>
            <b>Tạo Album chủ đề</b>
            <small>Tạo thư mục lưu ảnh camera kiểm định robots</small>
          </button>
        </div>
      </section>`;
  }

  function bindAlbums() {
    if (selectedAlbumId) return bindAlbumDetailPage();
    const createBtn = document.getElementById('createAlbumBtn');
    const createCard = document.getElementById('createAlbumCard');
    if (createBtn) createBtn.addEventListener('click', openCreateAlbumModal);
    if (createCard) createCard.addEventListener('click', openCreateAlbumModal);
    document.querySelectorAll('[data-open-album]').forEach(card => {
      card.addEventListener('click', () => { selectedAlbumId = card.dataset.openAlbum; renderDashboard(); });
    });
  }

  function openCreateAlbumModal() {
    const mount = document.getElementById('modalMount');
    mount.innerHTML = `
      <div class="modal-backdrop">
        <section class="modal album-form-modal">
          <div class="modal-head album-form-head">
            <div>
              <span class="album-modal-kicker">ARTECH MEDIA CENTER</span>
              <h2>Tạo Album ảnh mới</h2>
              <p class="small">Tạo thư mục ảnh riêng trong MySQL để quản lý ảnh robot, khu vực, bản đồ và mẫu lỗi.</p>
            </div>
            <button class="btn ghost square" data-close-modal>${icon.close}</button>
          </div>
          <div class="modal-body">
            <form id="albumCreateForm" class="album-create-form">
              <div class="album-form-hero">
                <div class="album-form-icon">${icon.image}</div>
                <div>
                  <b>Album sẽ được lưu qua API <span class="mono">/api/albums</span></b>
                  <p>Không dùng popup mặc định của trình duyệt. Sau khi lưu, album xuất hiện ngay ở danh sách và có thể xóa/sửa ảnh từ backend.</p>
                </div>
              </div>
              <div class="form-grid">
                <div class="field wide">
                  <label>Tên album <span class="required">*</span></label>
                  <input name="name" placeholder="Ví dụ: Ảnh sản phẩm Robot A" required autofocus />
                </div>
                <div class="field">
                  <label>Loại album</label>
                  <select name="category">
                    <option value="PRODUCT_IMAGE">Ảnh sản phẩm robot</option>
                    <option value="AREA_MAP">Bản đồ / khu vực hoạt động</option>
                    <option value="QUALITY_ISSUE">Mẫu lỗi kỹ thuật</option>
                    <option value="ROBOT_AVATAR">Ảnh đại diện robot</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
                <div class="field">
                  <label>Mã ghi chú</label>
                  <input name="code" placeholder="VD: ALB-ROBOT-A" />
                </div>
                <div class="field wide">
                  <label>Mô tả album</label>
                  <textarea name="description" placeholder="Mô tả mục đích album, loại ảnh sẽ lưu, robot/khu vực liên quan..."></textarea>
                </div>
              </div>
              <div class="form-actions">
                <button class="btn ghost" type="button" data-close-modal>Hủy</button>
                <button class="btn primary" type="submit">${icon.save} Lưu album vào MySQL</button>
              </div>
            </form>
          </div>
        </section>
      </div>`;

    mount.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', () => mount.innerHTML = ''));
    mount.querySelector('#albumCreateForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const cleanName = String(form.get('name') || '').trim();
      if (!cleanName) return toast('Vui lòng nhập tên album', 'error');

      const description = String(form.get('description') || '').trim() || `Album chủ đề ${cleanName}`;
      const category = String(form.get('category') || 'PRODUCT_IMAGE').trim();
      const code = String(form.get('code') || '').trim();

      const submitBtn = event.currentTarget.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Đang lưu...';

      const res = await api('/api/albums', { method: 'POST', body: { name: cleanName, description, category, code } });
      submitBtn.disabled = false;
      submitBtn.innerHTML = `${icon.save} Lưu album vào MySQL`;

      if (!res.success) return toast(res.message || 'Backend chưa tạo được album trong MySQL', 'error');
      const album = res.album || {};
      dashboardData.albums = dashboardData.albums.filter(item => String(item.id) !== 'unassigned_product_images');
      dashboardData.albums.unshift({
        id: String(album.albumId || album.AlbumID || album.id || uid('album')),
        name: fixMojibakeText(album.name || album.Name || cleanName),
        description: fixMojibakeText(album.description || album.Description || description),
        category: album.category || album.Category || category,
        isVirtual: false,
        images: []
      });
      saveDashboardData();
      mount.innerHTML = '';
      toast('Đã tạo album mới trong MySQL', 'success');
      refreshDashboardFromBackend(true).finally(renderDashboard);
    });
  }

  function renderAlbumDetailPage(album) {
    const images = album.images || [];
    const isVirtualAlbum = Boolean(album.isVirtual);
    return `
      <section class="album-console album-detail-page">
        <div class="album-status-card">
          <div>
            <div class="eyebrow">Bảng điều khiển trung tâm</div>
            <div class="sync-line"><span class="company-dot"></span><b>Đồng bộ dữ liệu ảnh ARTECH</b><span>· ${dashboardData.albums.length} album · ${images.length} hình ảnh trong danh mục</span></div>
          </div>
          <span class="latency-badge">Server Latency: 12ms</span>
        </div>
        <div class="album-heading">
          <div>
            <h2>Quản lý Ảnh sản phẩm & khu vực</h2>
            <p>Sắp xếp dữ liệu hình ảnh thành phẩm, bản đồ vật cản và mẫu lỗi chất lượng theo từng album chuyên biệt.</p>
          </div>
          <button class="btn ghost" id="backToAlbums">‹ Quay lại Album khác</button>
        </div>
        <div class="album-detail-card">
          <div class="album-current-box">
            <div>
              <div class="eyebrow">${isVirtualAlbum ? 'Nhóm hệ thống chưa phân loại' : 'Danh mục chủ đề hiện hành'}</div>
              <h3>▣ ${escapeHtml(album.name)}</h3>
              <p>${images.length} hình ảnh đã xác minh</p>
              ${isVirtualAlbum ? '<div class="album-system-note">Nhóm này sinh ra từ ảnh có <b>AlbumID = NULL</b> trong bảng <b>generalassets</b>, không phải album thật trong bảng <b>assetalbums</b>.</div>' : ''}
            </div>
            <div class="album-detail-actions">
              <input id="albumDetailImageInput" class="hidden" type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml,image/bmp,image/heic,image/heif,image/tiff" multiple />
              <button class="btn primary" id="addDetailImagesBtn">${icon.plus} Thêm ảnh mới</button>
              <button class="btn danger" id="deleteDetailAlbum">${icon.trash} ${isVirtualAlbum ? 'Xóa toàn bộ ảnh này' : 'Xóa Album này'}</button>
            </div>
          </div>
          <div class="album-showcase-grid">
            ${images.length ? images.map((img, index) => `
              <figure class="album-showcase-item">
                <img src="${escapeHtml(img.src || '')}" alt="${escapeHtml(img.name || `Ảnh #${index + 1}`)}" onerror="this.closest('figure').classList.add('image-load-error');" />
                <figcaption>
                  <span>${escapeHtml(img.name || `Ảnh #${index + 1}`)}</span>
                  <div>
                    <button class="icon-btn light" title="Xem ảnh" data-view-image="${img.id}">👁</button>
                    <button class="icon-btn light danger" title="Xóa ảnh" data-delete-image="${img.id}">${icon.trash}</button>
                  </div>
                </figcaption>
              </figure>
            `).join('') : '<div class="empty-state album-empty-wide">Album chưa có ảnh. Bấm “Thêm ảnh mới” để upload ảnh cho danh mục này.</div>'}
          </div>
        </div>
      </section>`;
  }

  function bindAlbumDetailPage() {
    const album = dashboardData.albums.find(a => a.id === selectedAlbumId);
    if (!album) { selectedAlbumId = null; return renderDashboard(); }
    document.getElementById('backToAlbums').addEventListener('click', () => { selectedAlbumId = null; renderDashboard(); });
    document.getElementById('addDetailImagesBtn').addEventListener('click', () => document.getElementById('albumDetailImageInput').click());
    document.getElementById('albumDetailImageInput').addEventListener('change', async (event) => {
      const files = Array.from(event.target.files || []);
      if (!files.length) return;
      album.images = album.images || [];
      let syncedCount = 0;
      for (const file of files) {
        try {
          const asset = await uploadGeneralAsset(file, 'PRODUCT_IMAGE', { albumId: album.id, title: file.name, category: album.category || album.name });
          if (!asset?.assetId) throw new Error('Backend không trả assetId');
          album.images.push({
            id: String(asset.assetId),
            name: fixMojibakeText(asset.fileName || asset.title || file.name),
            src: apiUrl(asset.fileUrl || ''),
            serverSource: 'asset',
            assetType: asset.assetType || 'PRODUCT_IMAGE'
          });
          syncedCount += 1;
        } catch (error) {
          console.warn('Không upload được ảnh sản phẩm lên backend:', error);
          toast(`Không upload được ${file.name} vào MySQL/backend`, 'error');
        }
      }
      saveDashboardData();
      if (syncedCount) toast('Đã upload ảnh album lên backend/SQL', 'success');
      renderDashboard();
    });
    document.getElementById('deleteDetailAlbum').addEventListener('click', async () => {
      if (album.isVirtual) {
        if (!confirm('Đây là nhóm ảnh chưa gắn album. Bạn muốn xóa toàn bộ ảnh trong nhóm này khỏi backend/SQL?')) return;
        for (const img of (album.images || [])) {
          if (img.serverSource === 'asset') {
            const res = await api(`/api/assets/${encodeURIComponent(img.id)}`, { method: 'DELETE' });
            if (!res.success) return toast(res.message || `Không xóa được ảnh ${img.name || img.id}`, 'error');
          }
        }
        dashboardData.albums = dashboardData.albums.filter(a => a.id !== album.id);
        selectedAlbumId = null;
        saveDashboardData();
        toast('Đã xóa nhóm ảnh chưa gắn album khỏi MySQL', 'success');
        refreshDashboardFromBackend(true).finally(renderDashboard);
        return;
      }

      if (!confirm('Xóa album này? Toàn bộ ảnh trong album sẽ bị xóa khỏi MySQL và file upload trên server.')) return;
      const res = await api(`/api/albums/${encodeURIComponent(album.id)}`, { method: 'DELETE' });
      if (!res.success) return toast(res.message || 'Backend chưa xóa được album khỏi MySQL', 'error');
      dashboardData.albums = dashboardData.albums.filter(a => a.id !== album.id);
      selectedAlbumId = null;
      saveDashboardData();
      toast('Đã xóa album khỏi MySQL và xóa toàn bộ file ảnh', 'success');
      refreshDashboardFromBackend(true).finally(renderDashboard);
    });
    document.querySelectorAll('[data-delete-image]').forEach(btn => btn.addEventListener('click', async (event) => {
      event.stopPropagation();
      const img = (album.images || []).find(item => item.id === btn.dataset.deleteImage);
      if (img && img.serverSource === 'asset') {
        const res = await api(`/api/assets/${encodeURIComponent(img.id)}`, { method: 'DELETE' });
        if (!res.success) return toast(res.message || 'Xóa ảnh trên backend thất bại', 'error');
      }
      album.images = (album.images || []).filter(item => item.id !== btn.dataset.deleteImage);
      saveDashboardData();
      toast('Đã xóa ảnh khỏi MySQL và file upload', 'info');
      renderDashboard();
    }));
    document.querySelectorAll('[data-view-image]').forEach(btn => btn.addEventListener('click', () => {
      const img = (album.images || []).find(item => item.id === btn.dataset.viewImage);
      if (!img) return;
      const mount = document.getElementById('modalMount');
      mount.innerHTML = `<div class="modal-backdrop"><section class="modal image-viewer-modal"><div class="modal-head"><div><h2>${escapeHtml(img.name || 'Ảnh Album')}</h2><p class="small">${escapeHtml(album.name)}</p></div><button class="btn ghost square" data-close-modal>${icon.close}</button></div><div class="modal-body"><img class="image-viewer" src="${escapeHtml(img.src || '')}" alt="${escapeHtml(img.name || 'Ảnh')}" /></div></section></div>`;
      mount.querySelector('[data-close-modal]').addEventListener('click', () => mount.innerHTML = '');
    }));
  }

  function renderLearned() {
    const robotOptions = dashboardData.robots.map(r => `<option value="${escapeHtml(r.deviceId)}">${escapeHtml(r.name)} - ${escapeHtml(r.deviceId)}</option>`).join('');
    return `
      <div class="toolbar"><select id="learnRobot"><option value="">Tất cả robot</option>${robotOptions}</select><input id="learnDate" type="date" style="padding:12px 14px;border:1px solid var(--line);border-radius:999px" /><button class="btn secondary" id="clearLearnFilter">Xóa lọc</button></div>
      <div class="table-wrap"><table><thead><tr><th>Ngày giờ</th><th>Robot</th><th>Câu hỏi text</th><th>Ghi chú học được</th></tr></thead><tbody id="learnRows">${learnRows(dashboardData.learned)}</tbody></table></div>
    `;
  }

  function learnRows(rows) {
    return rows.map(row => `<tr><td>${new Date(row.createdAt).toLocaleString('vi-VN')}</td><td class="mono">${escapeHtml(row.robotId)}</td><td>${escapeHtml(row.question)}</td><td>${escapeHtml(row.answer || '')}</td></tr>`).join('') || '<tr><td colspan="4">Chưa có dữ liệu học được.</td></tr>';
  }

  function bindLearned() {
    const robot = document.getElementById('learnRobot');
    const date = document.getElementById('learnDate');
    function update() {
      const list = dashboardData.learned.filter(row => (!robot.value || row.robotId === robot.value) && (!date.value || row.createdAt.slice(0, 10) === date.value));
      document.getElementById('learnRows').innerHTML = learnRows(list);
    }
    robot.addEventListener('change', update); date.addEventListener('change', update);
    document.getElementById('clearLearnFilter').addEventListener('click', () => { robot.value = ''; date.value = ''; update(); });
  }

  function formatMoney(value) {
    const n = Number(value || 0);
    return `${n.toLocaleString('vi-VN')} VNĐ`;
  }

  function walletSummary() {
    const w = dashboardData.wallet || defaultWalletData();
    return {
      balance: Number(w.balance || 0),
      availableBalance: Number(w.availableBalance || 0),
      lockedBalance: Number(w.lockedBalance || 0),
      tokenInput: Number(w.tokenInput || 0),
      tokenOutput: Number(w.tokenOutput || 0),
      tokenPrice: Number(w.tokenPrice || 0),
      monthlyUsage: Number(w.monthlyUsage || 0),
      plan: w.plan || 'Business Robot',
      bankAccount: w.bankAccount || 'ARTECH-0981136986'
    };
  }

  function transactionRows() {
    const rows = [...dashboardData.payments].sort((a, b) => new Date(b.time) - new Date(a.time));
    return rows.map(tx => {
      const amount = Number(tx.amount || 0);
      const amountClass = amount >= 0 ? 'money-plus' : 'money-minus';
      const statusLabel = tx.status === 'cancelled' ? 'Đã hủy' : 'Thành công';
      const statusClass = tx.status === 'cancelled' ? 'txn-cancelled' : 'txn-success';
      return `<tr>
        <td class="mono txn-id">${escapeHtml(tx.id)}</td>
        <td>${new Date(tx.time).toLocaleDateString('vi-VN')}</td>
        <td><span class="txn-desc">${escapeHtml(tx.description || tx.packageName || 'Giao dịch ví ARTECH')}</span></td>
        <td class="mono ${amountClass}">${amount >= 0 ? '+' : ''}${formatMoney(amount)}</td>
        <td><span class="txn-status ${statusClass}">● ${statusLabel}</span></td>
      </tr>`;
    }).join('') || '<tr><td colspan="5">Chưa có giao dịch.</td></tr>';
  }

  function renderBilling() {
    const w = walletSummary();
    const estimatedTokenCost = (w.tokenInput + w.tokenOutput) * w.tokenPrice;
    const packageList = (dashboardData.wallet.packages || []).length
      ? dashboardData.wallet.packages
      : [
          { packageId: 'starter-1m', name: 'Gói 1M Token', price: 1000000, tokenAmount: 1000000, description: 'Phù hợp robot demo, tư vấn cơ bản.' },
          { packageId: 'business-5m', name: 'Gói 5M Token', price: 4500000, tokenAmount: 5000000, description: 'Dành cho doanh nghiệp vận hành nhiều robot.' },
          { packageId: 'enterprise-10m', name: 'Gói 10M Token', price: 8500000, tokenAmount: 10000000, description: 'Tối ưu chi phí cho hệ thống lớn.' }
        ];
    const packageOptions = packageList.map(pkg => {
      const price = Number(pkg.price || pkg.Amount || 0);
      const id = pkg.packageId || pkg.id || pkg.name || pkg.packageName;
      const name = pkg.name || pkg.packageName || 'Gói token';
      return `<option value="${escapeHtml(id)}" data-amount="${price}">${escapeHtml(name)} - ${formatMoney(price)}</option>`;
    }).join('');
    const packageCards = packageList.slice(0, 3).map((pkg, index) => {
      const price = Number(pkg.price || pkg.Amount || 0);
      const tokens = Number(pkg.tokenAmount || pkg.TokenAmount || pkg.tokens || 0);
      const name = pkg.name || pkg.packageName || 'Gói token';
      const desc = pkg.description || pkg.Description || 'Bổ sung tài nguyên AI cho robot.';
      return `<article class="billing-plan-card ${index === 1 ? 'is-featured' : ''}">
        <span>${index === 1 ? 'Khuyên dùng' : 'Gói dịch vụ'}</span>
        <h4>${escapeHtml(name)}</h4>
        <strong>${formatMoney(price)}</strong>
        <p>${escapeHtml(desc)}</p>
        <small>${tokens ? tokens.toLocaleString('vi-VN') + ' token' : 'Theo cấu hình backend'}</small>
      </article>`;
    }).join('');
    const robotOptions = dashboardData.robots.length
      ? dashboardData.robots.map(r => `<option value="${escapeHtml(r.id || r.deviceId)}">${escapeHtml(r.name)} - ${escapeHtml(r.deviceId || r.id)}</option>`).join('')
      : '<option value="">Chưa có robot</option>';
    return `
      <div class="billing-page billing-page-v50">
        <section class="billing-hero-v50 panel">
          <div class="billing-hero-content">
            <span class="eyebrow">TÀI KHOẢN & THANH TOÁN</span>
            <h2>Quản lý ví, token AI và thông tin tài khoản</h2>
            <p>Theo dõi số dư, nạp/rút tiền, thanh toán gói token cho robot và lưu thông tin doanh nghiệp trong cùng một màn hình.</p>
            <div class="billing-quick-stats">
              <span><b>${formatMoney(w.availableBalance)}</b><small>Số dư khả dụng</small></span>
              <span><b>${w.monthlyUsage.toLocaleString('vi-VN')}</b><small>Token tháng này</small></span>
              <span><b>${formatMoney(estimatedTokenCost)}</b><small>Ước tính chi phí</small></span>
            </div>
          </div>
          <div class="wallet-card-v50">
            <div class="wallet-card-v50-top"><span>ARTECH WALLET</span><strong>${escapeHtml(w.plan)}</strong></div>
            <h3>${formatMoney(w.balance)}</h3>
            <p>Mã ví / STK: <b>${escapeHtml(w.bankAccount)}</b></p>
            <div class="wallet-card-v50-row"><span>Khả dụng <b>${formatMoney(w.availableBalance)}</b></span><span>Tạm giữ <b>${formatMoney(w.lockedBalance)}</b></span></div>
          </div>
        </section>

        <section class="billing-stat-grid-v50">
          <article class="billing-stat-card"><span>Token input</span><h3>${w.tokenInput.toLocaleString('vi-VN')}</h3><p>Câu hỏi, lệnh điều khiển và dữ liệu người dùng gửi vào AI.</p></article>
          <article class="billing-stat-card"><span>Token output</span><h3>${w.tokenOutput.toLocaleString('vi-VN')}</h3><p>Nội dung AI phản hồi, tư vấn và sinh hội thoại cho robot.</p></article>
          <article class="billing-stat-card"><span>Đơn giá demo</span><h3>${formatMoney(w.tokenPrice)}</h3><p>Đơn giá tạm tính cho mỗi token trong hệ thống quản trị.</p></article>
          <article class="billing-stat-card"><span>Trạng thái</span><h3>Online</h3><p>Giao dịch được lưu vào MySQL và đồng bộ với dashboard.</p></article>
        </section>

        <section class="billing-two-col-v50">
          <article class="panel billing-form-panel-v50">
            <div class="panel-title-row"><div><h3>Nạp tiền vào ví</h3><p class="small">Tạo giao dịch nạp tiền và lưu lịch sử thanh toán.</p></div><span class="chip">Manual</span></div>
            <form id="depositForm" class="form-grid">
              <div class="field wide"><label>Số tiền nạp</label><input name="amount" type="number" min="10000" step="10000" placeholder="Ví dụ: 1000000" required /></div>
              <div class="field wide"><label>Nội dung chuyển khoản</label><input name="note" value="NAPTIEN ARTECH WALLET" /></div>
              <div class="form-actions wide"><button class="btn primary" type="submit">Nạp tiền vào ví</button></div>
            </form>
          </article>
          <article class="panel billing-form-panel-v50">
            <div class="panel-title-row"><div><h3>Rút tiền về ngân hàng</h3><p class="small">Gửi yêu cầu rút tiền từ số dư khả dụng.</p></div><span class="chip">Bank</span></div>
            <form id="withdrawForm" class="form-grid">
              <div class="field"><label>Số tiền rút</label><input name="amount" type="number" min="10000" step="10000" placeholder="Ví dụ: 500000" required /></div>
              <div class="field"><label>Tài khoản nhận</label><input name="bank" placeholder="Tên ngân hàng / STK" required /></div>
              <div class="form-actions wide"><button class="btn ghost" type="submit">Yêu cầu rút tiền</button></div>
            </form>
          </article>
        </section>

        <section class="panel token-payment-panel-v50">
          <div class="panel-title-row"><div><h3>Thanh toán token cho robot</h3><p class="small">Chọn robot và gói token để gia hạn tài nguyên vận hành AI.</p></div><span class="chip">Token tháng này: ${w.monthlyUsage.toLocaleString('vi-VN')}</span></div>
          <div class="billing-plan-grid-v50">${packageCards}</div>
          <form id="tokenPayForm" class="form-grid billing-token-form-v50">
            <div class="field"><label>Robot</label><select name="robotId">${robotOptions}</select></div>
            <div class="field"><label>Gói token</label><select name="packageId">${packageOptions}</select></div>
            <div class="field"><label>Số tiền</label><input name="amount" type="number" value="1000000" min="10000" step="10000" /></div>
            <div class="form-actions"><button class="btn primary" type="submit">Thanh toán token</button></div>
          </form>
        </section>

        <section class="billing-two-col-v50">
          <article class="panel account-panel-v50">
            <div class="panel-title-row"><div><h3>Thông tin tài khoản</h3><p class="small">Cập nhật hồ sơ người dùng/doanh nghiệp đang đăng nhập.</p></div><span class="avatar-mini">${escapeHtml((currentUser.fullName || currentUser.email || 'A').charAt(0).toUpperCase())}</span></div>
            <form id="profileForm" class="form-grid">
              <div class="field"><label>Họ tên</label><input name="fullName" value="${escapeHtml(currentUser.fullName || '')}" /></div>
              <div class="field"><label>Gmail</label><input name="email" type="email" value="${escapeHtml(currentUser.email || '')}" disabled /></div>
              <div class="field"><label>Số điện thoại</label><input name="phoneNumber" value="${escapeHtml(currentUser.phoneNumber || currentUser.phone || '')}" /></div>
              <div class="field"><label>Ngày sinh / ngày thành lập</label><input name="establishedDate" type="date" value="${escapeHtml(currentUser.establishedDate || currentUser.dob || '')}" /></div>
              <div class="field wide"><label>Địa chỉ</label><input name="address" value="${escapeHtml(currentUser.address || '')}" /></div>
              <div class="field"><label>Số dư</label><input value="${formatMoney(w.balance)}" disabled /></div>
              <div class="field"><label>Mật khẩu</label><input value="Dùng chức năng Quên mật khẩu để đổi" disabled /></div>
              <div class="form-actions wide"><button class="btn primary" type="submit">Lưu thay đổi tài khoản</button></div>
            </form>
          </article>
          <article class="panel company-package-panel-v50">
            <h3>Các gói công ty cung cấp</h3>
            <div class="company-package-list-v50">
              <div><b>Starter AI</b><span>1 robot · 1GB tri thức · báo cáo cơ bản</span><strong>990K</strong></div>
              <div class="active"><b>Business Robot</b><span>5 robot · album ảnh · token · hỗ trợ kỹ thuật</span><strong>2.5M</strong></div>
              <div><b>Enterprise</b><span>Không giới hạn robot · triển khai riêng</span><strong>Liên hệ</strong></div>
            </div>
          </article>
        </section>

        <section class="panel transaction-panel transaction-panel-v50">
          <div class="panel-title-row"><div><h3>↻ Lịch sử thanh toán & giao dịch</h3><p class="small">Theo dõi toàn bộ giao dịch nạp tiền, rút tiền và mua gói token.</p></div></div>
          <div class="table-wrap"><table class="transaction-table"><thead><tr><th>Mã GD</th><th>Ngày và tháng</th><th>Mô tả giao dịch</th><th>Giá trị (VND)</th><th>Trạng thái</th></tr></thead><tbody>${transactionRows()}</tbody></table></div>
        </section>
      </div>
    `;
  }

  function addWalletTransaction({ type, amount, description, status = 'success' }) {
    const tx = { id: `TRX-${Math.floor(1000 + Math.random() * 9000)}`, time: new Date().toISOString().slice(0, 10), type, amount, description, status };
    dashboardData.payments = [tx, ...dashboardData.payments];
    return tx;
  }

  function bindBilling() {
    const packageSelect = document.querySelector('#tokenPayForm select[name="packageId"]');
    const amountInput = document.querySelector('#tokenPayForm input[name="amount"]');
    if (packageSelect && amountInput) {
      packageSelect.addEventListener('change', () => {
        const selected = packageSelect.selectedOptions[0];
        const amount = Number(selected?.dataset.amount || 0);
        if (amount > 0) amountInput.value = String(amount);
      });
      packageSelect.dispatchEvent(new Event('change'));
    }

    document.getElementById('profileForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(event.currentTarget);
      const body = {
        fullName: data.fullName || '',
        username: currentUser.username || currentUser.email || '',
        phoneNumber: data.phoneNumber || '',
        establishedDate: data.establishedDate || null,
        address: data.address || ''
      };
      const res = await api('/api/users/me', { method: 'PUT', body });
      if (!res.success) return toast(res.message || 'Cập nhật tài khoản thất bại', 'error');
      currentUser = { ...currentUser, ...(res.user || body) };
      toast('Cập nhật tài khoản thành công', 'success');
      renderDashboard();
    });

    document.getElementById('depositForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const amount = Math.max(0, Number(formData(event.currentTarget).amount || 0));
      if (!amount) return toast('Vui lòng nhập số tiền nạp hợp lệ', 'error');
      const res = await api('/api/billing/deposit', { method: 'POST', body: { amount, paymentMethod: 'MANUAL' } });
      if (!res.success) return toast(res.message || 'Backend chưa lưu được giao dịch nạp tiền', 'error');
      await refreshDashboardFromBackend({ quiet: true });
      toast('Nạp tiền thành công và đã lưu SQL', 'success');
      renderDashboard();
    });

    document.getElementById('withdrawForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(event.currentTarget);
      const amount = Math.max(0, Number(data.amount || 0));
      if (!amount) return toast('Vui lòng nhập số tiền rút hợp lệ', 'error');
      if (amount > dashboardData.wallet.availableBalance) return toast('Số dư khả dụng không đủ để rút tiền', 'error');
      const res = await api('/api/billing/withdraw', { method: 'POST', body: { amount, bank: data.bank || 'BANK_TRANSFER' } });
      if (!res.success) return toast(res.message || 'Backend chưa lưu được yêu cầu rút tiền', 'error');
      await refreshDashboardFromBackend({ quiet: true });
      toast('Đã tạo yêu cầu rút tiền và lưu SQL', 'success');
      renderDashboard();
    });

    document.getElementById('tokenPayForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(event.currentTarget);
      const amount = Math.max(0, Number(data.amount || 0));
      if (!amount) return toast('Vui lòng nhập số tiền thanh toán token hợp lệ', 'error');
      const selected = event.currentTarget.querySelector('select[name="packageId"]')?.selectedOptions[0];
      const packageName = selected?.textContent?.replace(/\s+-\s+[0-9.,]+\s*VNĐ.*$/i, '') || data.packageId || 'gói token';
      const pkg = (dashboardData.wallet.packages || []).find(item => String(item.packageId || item.id || item.name || item.packageName) === String(data.packageId));
      if (pkg && (pkg.packageId || pkg.id)) {
        const res = await api('/api/billing/purchase', {
          method: 'POST',
          body: { packageId: pkg.packageId || pkg.id, robotId: data.robotId || null }
        });
        if (!res.success) return toast(res.message || 'Thanh toán token qua backend thất bại', 'error');
        await refreshDashboardFromBackend({ quiet: true });
        toast('Thanh toán token thành công và đã lưu SQL', 'success');
        renderDashboard();
        return;
      }
      toast('Hãy chọn gói token hợp lệ từ backend để thanh toán và lưu SQL', 'error');
    });
  }

  function renderHelp() {
    return `
      <div class="help-grid">
        <article class="panel"><h3>1. Kết nối robot</h3><p>Vào Quản lý Robot, chọn robot, nhập Link Server, Device ID, GPT Model/Gemini Model và API Key tương ứng. Sau đó bấm Update data để robot nhận cấu hình mới.</p></article>
        <article class="panel"><h3>2. Nạp tri thức</h3><p>Vào Quản lý Tri thức, upload file PDF, Word hoặc Text. Sau đó bật nút Liên kết dữ liệu tri thức chung trong cấu hình robot để robot sử dụng chung kho dữ liệu.</p></article>
        <article class="panel"><h3>3. Quản lý icon mặt</h3><p>Trong cấu hình robot, upload icon mặt, đặt tên icon và lưu. Khi cần thay đổi, bấm Xóa icon và up lại ảnh mới.</p></article>
        <article class="panel"><h3>4. Theo dõi dữ liệu học được</h3><p>Tab Dữ liệu học được cho phép lọc theo ngày giờ và từng robot để xem các câu hỏi người dùng đã hỏi, từ đó bổ sung thêm tri thức.</p></article>
        <article class="panel"><h3>5. Bảo mật tài khoản</h3><p>Tài khoản sử dụng mật khẩu được băm, thông tin cá nhân được mã hóa ở backend trước khi lưu database và có luồng khôi phục mật khẩu bằng xác thực email.</p></article>
        <article class="panel"><h3>6. Hỗ trợ kỹ thuật</h3><p>Khi robot mất kết nối, kiểm tra nguồn, mạng Wi-Fi/LAN, Link Server, Device ID và trạng thái API Key. Nếu vẫn lỗi, liên hệ bộ phận ARTECH Support.</p></article>
      </div>
    `;
  }

  function featureIcon(name) {
    return `<div class="feature-icon">${(icon[name] || icon.robot).replace('nav-icon', 'nav-icon')}</div>`;
  }

  function robotSvg() {
    return `
      <svg class="robot-figure" viewBox="0 0 360 320" fill="none" aria-hidden="true">
        <rect x="108" y="74" width="144" height="116" rx="30" fill="#003366"/>
        <rect x="138" y="104" width="84" height="36" rx="18" fill="#dbeafe"/>
        <circle cx="161" cy="122" r="6" fill="#001e40"/><circle cx="199" cy="122" r="6" fill="#001e40"/>
        <path d="M154 158h52" stroke="#dbeafe" stroke-width="10" stroke-linecap="round"/>
        <path d="M180 74V36" stroke="#003366" stroke-width="14" stroke-linecap="round"/><circle cx="180" cy="30" r="17" fill="#00a6e5"/>
        <path d="M108 130H62c-18 0-32 14-32 32v48" stroke="#8ea4bf" stroke-width="18" stroke-linecap="round"/>
        <path d="M252 130h46c18 0 32 14 32 32v48" stroke="#8ea4bf" stroke-width="18" stroke-linecap="round"/>
        <rect x="84" y="190" width="192" height="72" rx="28" fill="#ffffff" stroke="#cbd5e1" stroke-width="4"/>
        <path d="M136 262v30M224 262v30" stroke="#003366" stroke-width="16" stroke-linecap="round"/>
        <circle cx="136" cy="298" r="14" fill="#00a6e5"/><circle cx="224" cy="298" r="14" fill="#00a6e5"/>
      </svg>`;
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function formatDateDisplay(value) {
    if (!value) return 'Chưa cập nhật';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'Chưa cập nhật';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = Number(bytes || 0);
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
    return `${value.toFixed(unit ? 1 : 0)} ${units[unit]}`;
  }


  /* === v.0.14 ARTECH Robotics website content rebuild from uploaded guide === */
  function siteAsset(fileName) {
    return `./assets/${fileName}`;
  }

  function landingProductCards(category = 'all') {
    return landingProductData()
      .filter(product => category === 'all' || product.categoryKey === category)
      .map(product => `
        <article class="product-folder-card v14-product-card" data-category="${product.categoryKey}">
          <div class="product-folder-top">
            <div class="folder-tab"></div>
            <div class="folder-body">
              <img src="${product.image}" alt="${escapeHtml(product.name)}" />
              <div class="folder-overlay">
                <span>${escapeHtml(product.category)}</span>
                <h3>${escapeHtml(product.name)}</h3>
                <p>${escapeHtml(product.short)}</p>
                <button class="btn secondary product-more-btn" type="button" data-product-more="${product.id}">Xem chi tiết</button>
              </div>
            </div>
          </div>
        </article>
      `).join('');
  }

  function partnerCaseData() {
    return [
      {
        id: 'robotminh',
        title: 'Robot Mascot cho thương hiệu RoboMinh',
        tag: 'Triển lãm Robot 8/05',
        desc: 'ARTECH Robotics đồng hành cùng RoboMinh trong hoạt động trình diễn robot mascot tại sự kiện công nghệ. Dự án tập trung vào trải nghiệm tương tác trực tiếp, nhận diện thương hiệu tại gian hàng và tạo điểm nhấn truyền thông cho khách tham quan.',
        result: 'Kết quả ghi nhận: tăng khả năng thu hút khách dừng chân tại gian hàng, tạo hình ảnh thương hiệu trẻ trung, công nghệ và dễ ghi nhớ.',
        images: [siteAsset('robominh.jpg'), siteAsset('partnership-signing.jpg')]
      },
      {
        id: 'telemedicine',
        title: 'Robot Telemedicine cho mô hình chăm sóc từ xa',
        tag: 'Giải pháp y tế thông minh',
        desc: 'Dự án mô phỏng robot hỗ trợ tư vấn và kết nối thông tin trong môi trường y tế. Robot được định hướng trở thành điểm tương tác thân thiện, giúp người dùng tiếp cận thông tin nhanh và giảm tải cho bộ phận tiếp nhận.',
        result: 'Giải pháp giúp chuẩn hóa quy trình tư vấn, hỗ trợ điều phối thông tin và tạo trải nghiệm hiện đại tại điểm tiếp xúc khách hàng.',
        images: [siteAsset('partnership-signing.jpg'), siteAsset('robominh.jpg')]
      },
      {
        id: 'hospitality',
        title: 'Robot Hospitality cho khách sạn và sự kiện',
        tag: 'Tối ưu trải nghiệm khách hàng',
        desc: 'ARTECH xây dựng kịch bản robot lễ tân, giới thiệu dịch vụ và hỗ trợ truyền thông thương hiệu cho khách sạn, hội nghị và khu trải nghiệm. Nội dung có thể tùy biến theo từng chiến dịch.',
        result: 'Robot giúp tăng tính chuyên nghiệp tại sảnh đón khách, hỗ trợ truyền tải thông tin nhất quán và tạo điểm check-in nổi bật.',
        images: [siteAsset('robominh.jpg'), siteAsset('partnership-signing.jpg')]
      }
    ];
  }

  function newsData() {
    return [
      {
        id: 'artech-trend',
        title: 'ARTECH Robotics và hướng đi robot mascot AI tại Việt Nam',
        date: '12/06/2026',
        body: `ARTECH Robotics đang theo đuổi hướng phát triển robot mascot AI dành cho doanh nghiệp Việt, tập trung vào khả năng cá nhân hóa hình ảnh thương hiệu và tối ưu trải nghiệm tại các điểm tiếp xúc khách hàng. Thay vì chỉ xem robot là thiết bị trình diễn công nghệ, ARTECH định vị robot như một tài sản truyền thông có thể vận hành lâu dài.

Trong bối cảnh doanh nghiệp ngày càng cần tạo dấu ấn khác biệt tại sự kiện, showroom, trường học và khu dịch vụ, robot mascot AI có thể đảm nhiệm vai trò chào hỏi, giới thiệu sản phẩm, giải đáp câu hỏi thường gặp và thu thập dữ liệu tương tác. Đây là nhóm ứng dụng có tính thực tế cao, phù hợp với đặc thù thị trường Việt Nam.

Điểm mạnh của ARTECH nằm ở việc kết hợp thiết kế mascot, hệ thống AI hội thoại, quản trị nội dung và nền tảng quản lý robot tập trung. Mỗi robot có thể được gắn với kho tri thức riêng, album hình ảnh, kịch bản vận hành và dữ liệu báo cáo để doanh nghiệp liên tục cải thiện chất lượng trải nghiệm.

Trong thời gian tới, ARTECH Robotics sẽ tiếp tục mở rộng các dòng robot phục vụ, robot lễ tân và robot cho thuê sự kiện. Mục tiêu là giúp doanh nghiệp triển khai công nghệ dễ hơn, chi phí phù hợp hơn và có khả năng tùy biến sâu theo bản sắc thương hiệu.`
      },
      {
        id: 'rental-event',
        title: 'Robot cho thuê sự kiện: giải pháp tạo điểm nhấn tại gian hàng',
        date: '05/06/2026',
        body: `Dịch vụ thuê robot đang trở thành lựa chọn phù hợp cho triển lãm, hội nghị và các hoạt động ra mắt sản phẩm. Doanh nghiệp có thể sử dụng robot trong thời gian ngắn để chào khách, dẫn dắt thông tin, trình chiếu nội dung và tạo hiệu ứng truyền thông.

ARTECH Robotics xây dựng gói thuê robot theo hướng trọn gói: chuẩn bị hình ảnh robot, cấu hình nội dung chào hỏi, cài đặt kịch bản giới thiệu và hỗ trợ kỹ thuật trong suốt thời gian sự kiện. Điều này giúp doanh nghiệp không cần đầu tư thiết bị ngay từ đầu nhưng vẫn có trải nghiệm công nghệ chuyên nghiệp.

Robot có thể được cá nhân hóa lời thoại, màn hình hiển thị, nội dung sản phẩm và thông tin thương hiệu. Với mỗi sự kiện, dữ liệu tương tác có thể được ghi nhận để doanh nghiệp hiểu hơn về mối quan tâm của khách tham quan.`
      },
      {
        id: 'mascot-design',
        title: 'Thiết kế mascot thương hiệu kết hợp robot: xu hướng mới cho trải nghiệm khách hàng',
        date: '28/05/2026',
        body: `Mascot thương hiệu từ lâu đã được sử dụng trong truyền thông, nhưng khi kết hợp với robot và AI, mascot không còn chỉ là hình ảnh nhận diện mà trở thành một điểm tương tác sống động. Đây là hướng đi ARTECH Robotics đang tập trung phát triển.

Một robot mascot có thể mang dáng vẻ riêng của thương hiệu, nói bằng giọng điệu phù hợp, trả lời câu hỏi theo bộ tri thức doanh nghiệp và xuất hiện trong các bối cảnh khác nhau như sự kiện, showroom, trường học hoặc khu dịch vụ.

Giá trị lớn nhất nằm ở khả năng tạo cảm xúc và ghi nhớ thương hiệu. Khi khách hàng được tương tác trực tiếp với một đại diện thương hiệu có hình dáng riêng, trải nghiệm sẽ trở nên khác biệt hơn so với màn hình thông tin hoặc booth truyền thống.`
      }
    ];
  }

  function productGallery(product) {
    return [
      product.image,
      siteAsset('robot-red.png'),
      siteAsset('robominh.jpg'),
      siteAsset('partnership-signing.jpg')
    ];
  }

  function productApplications(product) {
    const base = {
      'phuc-vu': ['Nhà hàng, khách sạn, trung tâm hội nghị', 'Khu trải nghiệm dịch vụ cao cấp', 'Sự kiện ra mắt sản phẩm'],
      'le-tan': ['Sảnh doanh nghiệp, showroom, trường học', 'Gian hàng triển lãm và hội chợ', 'Điểm tư vấn thông tin khách hàng'],
      'van-chuyen': ['Nhà máy, kho nội bộ, văn phòng lớn', 'Khu vực cần vận chuyển vật phẩm nhẹ', 'Mô hình điều phối nội bộ thông minh'],
      've-sinh': ['Trung tâm thương mại, sảnh lớn, văn phòng', 'Khu vực công cộng cần vệ sinh định kỳ', 'Nhà xưởng và hành lang vận hành'],
      'phu-kien': ['Nâng cấp robot hiện có', 'Quản lý dữ liệu hình ảnh và tri thức', 'Tích hợp phần mềm vào hệ thống doanh nghiệp']
    };
    return base[product.categoryKey] || ['Sự kiện', 'Showroom', 'Doanh nghiệp'];
  }

  function renderLanding() {
    app.innerHTML = `
      <div class="landing v14-landing">
        <div class="top-strip"></div>
        <header class="landing-nav landing-nav-pro v14-nav">
          <a class="logo v14-logo" href="#home" aria-label="ARTECH Robotics">
            <img src="${siteAsset('artech-logo.png')}" alt="ARTECH Robotics" />
          </a>
          <nav class="nav-center nav-menu-pro" aria-label="Danh mục chính">
            <div class="nav-item has-dropdown"><a href="#about">Về chúng tôi <span class="chev">⌄</span></a><div class="nav-dropdown"><a href="#about">Về ARTECH Robotics</a><a href="#vision">Tầm nhìn - Sứ mệnh</a><a href="#capabilities">Năng lực công ty</a></div></div>
            <div class="nav-item has-dropdown"><a href="#products">Sản phẩm <span class="chev">⌄</span></a><div class="nav-dropdown"><a href="#products" data-product-nav="le-tan">Robot mascot AI</a><a href="#products" data-product-nav="phuc-vu">Robot phục vụ nhà hàng/khách sạn</a><a href="#products" data-product-nav="phu-kien">Trợ lý ảo AI cá nhân hóa</a></div></div>
            <div class="nav-item has-dropdown"><a href="#rent">Thuê Robot <span class="chev">⌄</span></a><div class="nav-dropdown"><a href="#rent">Robot sự kiện</a><a href="#rent">Robot triển lãm</a><a href="#rent">Robot gian hàng</a></div></div>
            <div class="nav-item has-dropdown"><a href="#services">Dịch vụ <span class="chev">⌄</span></a><div class="nav-dropdown"><a href="#services">Thiết kế mascot thương hiệu</a><a href="#services">Bảo hành</a><a href="#services">Bảo trì & nâng cấp</a></div></div>
            <div class="nav-item has-dropdown"><a href="#partner">Đối tác <span class="chev">⌄</span></a><div class="nav-dropdown"><a href="#partner">Khách hàng tiêu biểu</a><a href="#partner">Dự án đã triển khai</a><a href="#partner">Case Study</a></div></div>
            <div class="nav-item has-dropdown"><a href="#news">Tin tức <span class="chev">⌄</span></a><div class="nav-dropdown"><a href="#news">Tin ARTECH Robotics</a><a href="#news">Tuyển dụng</a><a href="#news">Công nghệ robot AI</a></div></div>
            <a class="nav-search" href="#products" aria-label="Tìm kiếm">${icon.search}</a>
          </nav>
          <div class="nav-actions"><button class="btn ghost nav-login-btn" data-open-auth="login">Đăng nhập</button></div>
        </header>
        <main>
          <section id="home" class="hero hero-pro hero-robot-bg v14-hero">
            <div class="v14-hero-copy reveal-left">
              <div class="eyebrow">ARTECH ROBOTICS</div>
              <h1>Hiện thực hóa bản sắc doanh nghiệp bằng robot AI.</h1>
              <p>ARTECH Robotics phát triển robot mascot AI, robot phục vụ và trợ lý ảo cá nhân hóa cho doanh nghiệp Việt, tập trung vào trải nghiệm thương hiệu, tính tùy biến và hiệu quả vận hành thực tế.</p>
              <p class="hero-note">Chúng tôi kết hợp thiết kế mascot thương hiệu, công nghệ robot, AI hội thoại và nền tảng quản trị nội dung để biến robot thành tài sản chiến lược trong truyền thông, bán hàng và chăm sóc khách hàng.</p>
              <div class="hero-actions"><button class="btn primary explore-products-btn" type="button" data-scroll-products>Khám phá sản phẩm</button><button class="btn secondary" type="button" data-open-auth="login">Truy cập hệ thống</button></div>
            </div>
            <div class="hero-visual reveal-right"><div class="visual-card robot-visual-bg v14-robot-card"><img class="hero-red-robot" src="${siteAsset('robot-red.png')}" alt="Robot ARTECH Robotics" /><div class="float-chip one">Mascot AI</div><div class="float-chip two">Voice · Screen · Data</div><div class="float-chip three">Event Ready</div></div></div>
          </section>

          <section id="about" class="section alt section-bg-robot v14-about-section">
            <div class="about-letter-layout">
              <div class="about-letter reveal-left">
                <div class="eyebrow">Về ARTECH Robotics</div>
                <h2>Tại ARTECH Robotics, chúng tôi dùng công nghệ để hiện thực hóa bản sắc doanh nghiệp.</h2>
                <p><strong>Kính gửi Quý Đối tác,</strong></p>
                <p>Trước hết, thay mặt ARTECH Robotics, tôi xin gửi lời chào trân trọng và lời cảm ơn chân thành đến Quý Đối tác đã quan tâm đến các giải pháp mà chúng tôi đang phát triển.</p>
                <p>Khác biệt lớn nhất của ARTECH Robotics không nằm ở việc chúng tôi làm robot, mà nằm ở cách chúng tôi lựa chọn thị trường và cách chúng tôi tạo ra giá trị. Thay vì cạnh tranh trực diện với các tập đoàn công nghệ lớn trên thế giới, chúng tôi lựa chọn một hướng đi riêng, tập trung vào những thị trường ngách có nhu cầu chuyển đổi cao, nơi các giải pháp đại trà chưa thể đáp ứng hiệu quả.</p>
                <p>ARTECH Robotics theo đuổi chiến lược cá nhân hóa, địa phương hóa và doanh nghiệp hóa, lấy bản sắc riêng của từng thương hiệu, từng tổ chức và văn hóa Việt Nam làm nền tảng phát triển sản phẩm. Nếu các sản phẩm quốc tế có lợi thế về quy mô và tiêu chuẩn hóa, thì chúng tôi tập trung vào sự linh hoạt, tốc độ triển khai, khả năng tùy biến sâu và chi phí phù hợp với doanh nghiệp Việt.</p>
                <p>Chúng tôi cũng là đơn vị tiên phong tại Việt Nam trong việc kết hợp hai yếu tố tưởng chừng tách biệt: Thiết kế mascot thương hiệu và phát triển robot trong cùng một hệ sản phẩm. Chúng tôi tin rằng, trong bối cảnh trải nghiệm khách hàng ngày càng trở thành yếu tố cốt lõi, việc sở hữu một giải pháp vừa mang tính công nghệ, vừa mang tính thương hiệu sẽ giúp doanh nghiệp tạo ra lợi thế cạnh tranh rõ rệt và bền vững.</p>
                <p>ARTECH Robotics mong muốn được đồng hành cùng Quý Đối tác trong hành trình đổi mới và phát triển, thông qua những giải pháp phù hợp, hiệu quả và mang lại giá trị thực tiễn.</p>
                <p><em>Trân trọng,</em></p>
              </div>
              <aside class="director-card reveal-right"><img src="${siteAsset('director-vu-ba-trung.png')}" alt="Chân dung giám đốc công ty ARTECH" /><div><b>Giám đốc công ty ARTECH</b><span>Vũ Bá Trung</span></div></aside>
            </div>
          </section>

          <section id="vision" class="section vision-section">
            <div class="section-head product-head-center">
              <div>
                <div class="eyebrow">Định hướng phát triển</div>
                <h2 class="vision-title">TẦM NHÌN, SỨ MỆNH,<br/>GIÁ TRỊ CỐT LÕI</h2>
                <p class="vision-subtitle">Ba nền tảng định hướng cho chiến lược phát triển, chất lượng triển khai và cam kết đồng hành lâu dài của ARTECH Robotics.</p>
              </div>
            </div>
            <div class="vision-stack">
              <article class="vision-card vision-card-vision reveal-left">
                <div class="vision-card-head"><span>Tầm nhìn</span><i>01</i></div>
                <p>ARTECH Robotics hướng tới vị thế tiên phong tại Việt Nam trong việc ứng dụng robot tích hợp trí tuệ nhân tạo để nâng tầm trải nghiệm thương hiệu và tối ưu vận hành doanh nghiệp. Chúng tôi tạo ra các giải pháp tương tác thông minh, thúc đẩy hiệu quả kinh doanh và đưa bản sắc Việt vươn ra thị trường quốc tế. Trong dài hạn, ARTECH định hình chuẩn mực mới cho việc sử dụng robot trong truyền thông và bán hàng, biến trải nghiệm thương hiệu thành công cụ chiến lược bền vững.</p>
              </article>
              <article class="vision-card vision-card-mission reveal-right">
                <div class="vision-card-head"><span>Sứ mệnh</span><i>02</i></div>
                <p>Sứ mệnh của ARTECH Robotics là kiến tạo những trải nghiệm thương hiệu sống động thông qua robot mascot AI, kết hợp sáng tạo và công nghệ để doanh nghiệp kết nối sâu sắc với khách hàng. Chúng tôi mang đến giải pháp tương tác thông minh, giúp thương hiệu lan tỏa mạnh mẽ tại các sự kiện, gian hàng và điểm tiếp xúc, đồng thời biến robot trở thành tài sản chiến lược, vừa truyền cảm hứng, vừa tạo giá trị lâu dài cho doanh nghiệp.</p>
              </article>
              <article class="vision-card vision-card-values reveal-left">
                <div class="vision-card-head"><span>Giá trị cốt lõi</span><i>03</i></div>
                <ul>
                  <li>Tập trung vào giá trị thực tế</li>
                  <li>Định vị bản sắc thương hiệu</li>
                  <li>Đổi mới công nghệ</li>
                  <li>Lan tỏa và tối ưu trải nghiệm</li>
                  <li>Minh bạch và cam kết chất lượng</li>
                </ul>
              </article>
            </div>
          </section>

          <section id="capabilities" class="section alt section-bg-soft capabilities-section">
            <div class="section-head"><div class="eyebrow">Năng lực công ty</div><h2>Nền tảng năng lực để triển khai robot mascot AI thực tế.</h2></div>
            <div class="capability-grid">
              <article class="capability-card reveal-left"><h3>Nghiên cứu và phát triển sản phẩm</h3><p>ARTECH Robotics tập trung phát triển các giải pháp robot mascot ứng dụng trí tuệ nhân tạo dành cho doanh nghiệp, với khả năng tùy biến linh hoạt theo từng ngành nghề, mục tiêu vận hành và định hướng thương hiệu.</p></article>
              <article class="capability-card reveal-right"><h3>Thiết kế và hiện thực hóa mascot thương hiệu</h3><p>Khác với các giải pháp robot vận hành trên thị trường, ARTECH Robotics có khả năng kết hợp giữa thiết kế mascot độc quyền và công nghệ robot, giúp doanh nghiệp sở hữu những sản phẩm mang dấu ấn thương hiệu riêng, gia tăng khả năng nhận diện và tạo trải nghiệm khác biệt cho khách hàng.</p></article>
              <article class="capability-card reveal-left"><h3>Tích hợp AI và quản trị nội dung</h3><p>Hệ thống được phát triển theo hướng mở, cho phép doanh nghiệp chủ động cập nhật, đào tạo và quản lý nội dung tương tác của robot, tăng tính linh hoạt trong vận hành và giảm sự phụ thuộc vào nhà cung cấp.</p></article>
              <article class="capability-card reveal-right"><h3>Triển khai giải pháp thực tiễn</h3><p>Mỗi giải pháp được thiết kế dựa trên bài toán kinh doanh cụ thể của doanh nghiệp, hướng tới việc nâng cao trải nghiệm khách hàng, gia tăng hiệu quả truyền thông thương hiệu và hỗ trợ tối ưu hoạt động vận hành.</p></article>
              <article class="capability-card wide reveal-left"><h3>Đồng hành dài hạn</h3><p>ARTECH Robotics cung cấp dịch vụ tư vấn, triển khai, bảo trì và nâng cấp xuyên suốt vòng đời sản phẩm, giúp doanh nghiệp khai thác hiệu quả giá trị của robot và công nghệ AI trong dài hạn.</p></article>
            </div>
          </section>

          <section id="products" class="section product-section product-showcase-pro section-bg-soft">
            <div class="section-head product-head product-head-center"><div><div class="eyebrow">Sản phẩm</div><h2 class="product-title-large">CÁC SẢN PHẨM ROBOT ARTECH NỔI BẬT</h2><p class="product-subtitle">Giải pháp tối ưu vận hành và trải nghiệm thương hiệu</p></div></div>
            <div class="product-filter-row">${landingProductFilters()}</div>
            <div class="product-show-grid product-show-grid-cards" id="landingProductGrid">${landingProductCards(landingCategory || 'all')}</div>
          </section>

          <section id="rent" class="section alt rent-section"><div class="section-head"><div class="eyebrow">Thuê Robot</div><h2>ARTECH EventBot – robot cho thuê cho sự kiện, triển lãm và gian hàng.</h2><p class="muted">Dòng robot cho thuê của ARTECH phù hợp với các sự kiện ngắn hạn, hội chợ, showroom, lễ ra mắt sản phẩm và hoạt động truyền thông thương hiệu. Robot có thể chào hỏi, trình chiếu nội dung, trả lời câu hỏi cơ bản và tạo điểm nhấn tương tác tại không gian sự kiện.</p></div><div class="grid-3"><article class="card feature-card"><h3>Sẵn sàng sự kiện</h3><p>Cấu hình nhanh theo nội dung chương trình, thương hiệu và kịch bản tương tác.</p></article><article class="card feature-card"><h3>Hình ảnh nổi bật</h3><p>Robot đỏ ARTECH tạo điểm check-in và tăng khả năng thu hút khách tham quan.</p></article><article class="card feature-card"><h3>Liên hệ báo giá</h3><p>Gói thuê linh hoạt theo ngày, theo tuần hoặc theo chiến dịch truyền thông.</p></article></div></section>

          <section id="services" class="section services-section"><div class="section-head"><div class="eyebrow">Dịch vụ</div><h2>Thiết kế mascot thương hiệu, bảo trì và nâng cấp robot.</h2></div><div class="grid-2"><article class="panel"><h3>Thiết kế Mascot Thương hiệu</h3><p>Tư vấn ý tưởng, thiết kế 2D, thiết kế 3D và chế tác robot theo nhận diện riêng của doanh nghiệp.</p></article><article class="panel"><h3>Bảo trì & Nâng cấp</h3><p>Bảo trì định kỳ, nâng cấp AI, hỗ trợ kỹ thuật, cập nhật nội dung và tối ưu trải nghiệm vận hành dài hạn.</p></article></div></section>

          <section id="partner" class="section alt partner-section"><div class="section-head"><div class="eyebrow">Đối tác</div><h2>Khách hàng tiêu biểu & dự án đã triển khai.</h2><p class="muted">Bấm vào từng khách hàng tiêu biểu để xem mô tả dự án và hình ảnh thực tế.</p></div><div class="partner-layout"><div class="partner-list">${partnerCaseData().map((item, index) => `<button class="partner-card ${index === 0 ? 'active' : ''}" type="button" data-case-id="${item.id}"><b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.tag)}</span></button>`).join('')}</div><div id="partnerCaseBox" class="partner-case-box"></div></div></section>

          <section id="news" class="section news-section"><div class="section-head"><div class="eyebrow">Tin tức</div><h2>Tin tức về ARTECH Robotics.</h2><p class="muted">Bấm vào tin bên cạnh để nội dung chuyển vào khung chính và tự nhảy lên đầu mục tin tức.</p></div><div class="news-layout"><article id="newsMain" class="news-main-scroll"></article><aside class="news-side-list">${newsData().map((item, index) => `<button class="news-side-card ${index === 0 ? 'active' : ''}" type="button" data-news-id="${item.id}"><span>${item.date}</span><b>${escapeHtml(item.title)}</b></button>`).join('')}</aside></div></section>

          ${landingContactSection()}
        </main>
        ${landingFloatingContact()}
      </div><div id="authMount"></div><div id="productMount"></div>`;
    bindLandingEvents();
    renderPartnerCase('robotminh');
    renderNewsArticle(newsData()[0].id);
    bindScrollReveal();
  }

  function landingContactSection() {
    return `
      <section id="contact" class="section contact-section-pro">
        <div class="message-contact-layout"><div class="message-card"><div class="section-head compact-head"><h2>Để lại lời nhắn cho chúng tôi</h2><p>Chúng tôi rất vui khi được lắng nghe ý kiến của bạn.</p></div><form id="contactForm" class="message-form-grid"><div class="field wide"><label>Họ và tên <span class="req">*</span></label><input name="fullName" placeholder="Họ tên của bạn" required /></div><div class="field wide"><label>Số điện thoại <span class="req">*</span></label><input name="phone" placeholder="Nhập số điện thoại" required /></div><div class="field wide"><label>Gmail <span class="req">*</span></label><input name="email" type="email" autocomplete="email" placeholder="Nhập Gmail của bạn" required /></div><div class="field wide"><label>Tên doanh nghiệp <span class="req">*</span></label><input name="company" placeholder="Nhập tên doanh nghiệp của bạn" required /></div><div class="field wide"><label>Địa chỉ (Tỉnh/Thành phố) <span class="req">*</span></label><select name="city" required><option value="">Tìm nhanh tỉnh/thành...</option><option>Hà Nội</option><option>TP. Hồ Chí Minh</option><option>Đà Nẵng</option><option>Hải Phòng</option><option>Bắc Ninh</option></select></div><div class="field wide"><label>Hạng mục bạn quan tâm <span class="req">*</span></label><select name="interest" required><option value="">Chọn hạng mục</option><option>Mua Robot</option><option>Thuê Robot</option><option>Thiết kế mascot thương hiệu</option><option>Bảo trì & nâng cấp</option></select></div><div class="field wide"><label>Nội dung câu hỏi</label><textarea name="message" placeholder="Nhập nội dung ..."></textarea></div><div class="form-actions"><button class="btn contact-submit-btn" type="submit">Gửi thông tin ↗</button></div><div id="contactFormMsg" class="wide"></div></form></div><div class="contact-info-panel"><div class="contact-info-grid-top"><article class="contact-info-box"><div class="contact-info-icon">✉</div><h3>Email</h3><p>Đội ngũ thân thiện của chúng tôi sẽ hỗ trợ bạn</p><a href="mailto:contact@artechrobotics.vn">contact@artechrobotics.vn</a></article><article class="contact-info-box"><div class="contact-info-icon">■</div><h3>Số điện thoại</h3><p>Thứ 2 - thứ 7, 9am - 5pm</p><a href="tel:0981136986">098 113 6986</a></article></div><article class="contact-office-box"><div class="contact-info-icon">⌖</div><h3>Văn phòng</h3><p>Ghé thăm địa chỉ văn phòng của chúng tôi</p><ul><li>CN HN 1: Số 4 Chính Kinh, Thanh Xuân, Hà Nội.</li><li>CN HN 2: Vinacomin Tower, Số 3 Dương Đình Nghệ, Phường Yên Hòa, Hà Nội.</li><li>CN HCM 1: Tòa nhà Dali, 24C Phan Đăng Lưu, Phường Gia Định, TPHCM.</li><li>CN HCM 2: 261 Nguyễn Trãi, Phường Hòa Hưng, Quận 1, TPHCM.</li></ul></article></div></div>
        <div class="footer-links-pro"><div class="footer-brand-col"><img class="footer-logo-img" src="${siteAsset('artech-logo.png')}" alt="ARTECH Robotics" /><p><strong>ARTECH Robotics</strong> | Chuyên cung cấp giải pháp tự động hóa với robot tự hành thông minh.</p><div class="footer-socials"><span>f</span><span>♫</span><span>▶</span></div></div><div><h4>SẢN PHẨM</h4><a href="#products" data-product-nav="le-tan">Robot Mascot AI</a><a href="#products" data-product-nav="phuc-vu">Robot Phục Vụ</a><a href="#products" data-product-nav="phu-kien">Trợ lý ảo AI cá nhân hóa</a></div><div><h4>DỊCH VỤ</h4><a href="#rent">Cho thuê Robot</a><a href="#services">Dịch vụ Thiết kế Mascot</a><a href="#services">Bảo trì & Nâng cấp</a><a href="#services">Hỗ trợ kỹ thuật</a></div><div><h4>HỢP TÁC KINH DOANH</h4><a href="#partner">Chính sách Đại lý</a><a href="#partner">Chính sách Cộng tác viên</a><h4 class="footer-subhead">THÔNG TIN KHÁC</h4><a href="#services">Chính sách bảo hành</a><a href="#services">Giao hàng, lắp đặt</a><a href="#services">Hướng dẫn thay thế vật tư tiêu hao</a></div><div><h4>THÔNG TIN LIÊN HỆ</h4><p>MST công ty: 0318055730</p><p>SĐT: 0981136986</p><p>Email: contact@artechrobotics.vn</p><p>Địa chỉ:</p><ul><li>CN HN 1: Số 4 Chính Kinh, Thanh Xuân, Hà Nội</li><li>CN HN 2: Vinacomin Tower, Số 3 Dương Đình Nghệ, Hà Nội</li><li>CN HCM 1: Tòa nhà Dali, 24C Phan Đăng Lưu, TPHCM</li><li>CN HCM 2: 261 Nguyễn Trãi, Quận 1, TPHCM</li></ul></div></div>
      </section>`;
  }

  function landingFloatingContact() {
    return `<div class="floating-contact" aria-label="Liên hệ nhanh"><a href="#contact" class="float-zalo" aria-label="Liên hệ Zalo"><span class="float-icon zalo-text">Zalo</span></a><a href="#contact" class="float-messenger" aria-label="Liên hệ Messenger"><span class="float-icon messenger-icon"><svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="msgGradV14" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#ec4899"/></linearGradient></defs><path d="M32 8c-13.3 0-24 9.6-24 21.4 0 6.8 3.5 12.8 9 16.7v9.8l9.2-5.1c1.9.3 3.8.5 5.8.5 13.3 0 24-9.6 24-21.4S45.3 8 32 8Z" fill="url(#msgGradV14)"/><path d="M18 38.2l10-11.3 7.8 6 10.2-11.3-11.2 6.4-7.5-6L18 38.2Z" fill="#fff"/></svg></span></a><a href="#contact" class="float-call" aria-label="Gọi điện"><span class="float-icon call-icon"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#003194"/><path d="M41.8 43.7c-1.7 1.7-6.5 1-12.5-4.9-6-6-6.7-10.8-5-12.5l2.9-2.9c.7-.7.8-1.9.2-2.7l-4.5-6.4c-.7-.9-2-1.1-2.9-.3l-3.2 2.8c-3.5 3.1-3.1 9 1 15 3.6 5.4 9 10.8 14.4 14.4 6 4.1 11.9 4.5 15 1l2.8-3.2c.8-.9.7-2.2-.3-2.9l-6.4-4.5c-.8-.6-2-.5-2.7.2l-2.8 2.9Z" fill="#fff"/></svg></span></a></div>`;
  }

  function bindLandingEvents() {
    document.querySelectorAll('[data-open-auth]').forEach(btn => btn.addEventListener('click', () => openAuth(btn.dataset.openAuth || 'login')));
    document.querySelectorAll('[data-product-more]').forEach(btn => btn.addEventListener('click', (event) => { event.stopPropagation(); openProductInfo(btn.dataset.productMore); }));
    document.querySelectorAll('[data-product-filter]').forEach(btn => btn.addEventListener('click', () => setLandingCategory(btn.dataset.productFilter || 'all')));
    document.querySelectorAll('[data-product-nav]').forEach(link => link.addEventListener('click', (event) => { event.preventDefault(); const key = link.dataset.productNav || 'all'; setLandingCategory(key); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    const explore = document.querySelector('[data-scroll-products]');
    if (explore) explore.addEventListener('click', () => { setLandingCategory('all'); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    const contactForm = document.getElementById('contactForm');
    if (contactForm) contactForm.addEventListener('submit', (event) => { event.preventDefault(); const data = formData(contactForm); setMsg('contactFormMsg', `Cảm ơn ${data.fullName || 'bạn'} đã để lại lời nhắn. Đội ngũ ARTECH sẽ liên hệ trong thời gian sớm nhất.`, 'success'); contactForm.reset(); });
    document.querySelectorAll('[data-case-id]').forEach(btn => btn.addEventListener('click', () => renderPartnerCase(btn.dataset.caseId)));
    document.querySelectorAll('[data-news-id]').forEach(btn => btn.addEventListener('click', () => { renderNewsArticle(btn.dataset.newsId); document.getElementById('news')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
  }

  function renderPartnerCase(caseId) {
    const item = partnerCaseData().find(c => c.id === caseId) || partnerCaseData()[0];
    document.querySelectorAll('[data-case-id]').forEach(btn => btn.classList.toggle('active', btn.dataset.caseId === item.id));
    const box = document.getElementById('partnerCaseBox');
    if (!box) return;
    box.innerHTML = `<div class="partner-case-content"><div><span class="eyebrow">Case Study</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.desc)}</p><p><strong>${escapeHtml(item.result)}</strong></p></div><div class="partner-case-images">${item.images.map(src => `<img src="${src}" alt="${escapeHtml(item.title)}" />`).join('')}</div></div>`;
  }

  function renderNewsArticle(newsId) {
    const item = newsData().find(n => n.id === newsId) || newsData()[0];
    document.querySelectorAll('[data-news-id]').forEach(btn => btn.classList.toggle('active', btn.dataset.newsId === item.id));
    const main = document.getElementById('newsMain');
    if (!main) return;
    main.scrollTop = 0;
    main.innerHTML = `<div class="news-main-head"><span>${item.date}</span><h3>${escapeHtml(item.title)}</h3></div>${item.body.split('\n\n').map(p => `<p>${escapeHtml(p)}</p>`).join('')}`;
  }

  function openProductInfo(productId) {
    const product = landingProductData().find(item => item.id === productId);
    if (!product) return;
    const gallery = productGallery(product);
    let index = 0;
    const mount = document.getElementById('productMount');
    mount.innerHTML = `
      <div class="modal-backdrop"><section class="modal product-info-modal v14-product-modal"><div class="modal-head"><div><h2>${escapeHtml(product.name)}</h2><p class="small">${escapeHtml(product.category)} · Giải pháp robot ARTECH</p></div><button class="btn ghost square" data-close-product>${icon.close}</button></div><div class="modal-body"><div class="product-detail-grid"><div class="product-detail-copy"><section><div class="eyebrow">Giới thiệu</div><p>${escapeHtml(product.detail)} Đây là giải pháp được thiết kế để giúp doanh nghiệp nâng cao trải nghiệm khách hàng, tạo điểm nhấn thương hiệu và quản lý nội dung tương tác một cách linh hoạt.</p></section><section><div class="eyebrow">Tính năng</div><ul>${product.specs.concat(['Cá nhân hóa nội dung theo thương hiệu', 'Kết nối dashboard quản lý tập trung', 'Theo dõi dữ liệu tương tác và vận hành']).slice(0, 6).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section><section><div class="eyebrow">Ứng dụng</div><ul>${productApplications(product).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section><div class="form-actions"><button class="btn primary" type="button" data-open-auth="login">Vào hệ thống quản lý robot</button></div></div><div class="product-gallery-box"><div class="eyebrow">Hình ảnh thực tế</div><div class="gallery-main"><button class="gallery-arrow left" type="button" data-gallery-prev>&lt;</button><img id="productGalleryMain" src="${gallery[0]}" alt="${escapeHtml(product.name)}" /><button class="gallery-arrow right" type="button" data-gallery-next>&gt;</button></div><div class="gallery-thumbs">${gallery.map((src, i) => `<button type="button" class="gallery-thumb ${i === 0 ? 'active' : ''}" data-gallery-index="${i}"><img src="${src}" alt="Ảnh ${i + 1}" /></button>`).join('')}</div></div></div></div></section></div>`;
    const updateGallery = (nextIndex) => {
      index = (nextIndex + gallery.length) % gallery.length;
      const img = mount.querySelector('#productGalleryMain');
      if (img) img.src = gallery[index];
      mount.querySelectorAll('[data-gallery-index]').forEach(btn => btn.classList.toggle('active', Number(btn.dataset.galleryIndex) === index));
    };
    mount.querySelector('[data-close-product]').addEventListener('click', () => mount.innerHTML = '');
    mount.querySelector('[data-open-auth]').addEventListener('click', () => { mount.innerHTML = ''; openAuth('login'); });
    mount.querySelector('[data-gallery-prev]').addEventListener('click', () => updateGallery(index - 1));
    mount.querySelector('[data-gallery-next]').addEventListener('click', () => updateGallery(index + 1));
    mount.querySelectorAll('[data-gallery-index]').forEach(btn => btn.addEventListener('click', () => updateGallery(Number(btn.dataset.galleryIndex))));
    mount.querySelector('.modal-backdrop').addEventListener('click', (event) => { if (event.target.classList.contains('modal-backdrop')) mount.innerHTML = ''; });
  }

  function bindScrollReveal() {
    const items = document.querySelectorAll('.reveal-left, .reveal-right, .reveal-up');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) { items.forEach(item => item.classList.add('in-view')); return; }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .18 });
    items.forEach(item => observer.observe(item));
  }


  init();
})();
