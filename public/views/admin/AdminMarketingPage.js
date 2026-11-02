import { apiFetch, showToast, confirmDialog } from '../../app.js';

export const AdminMarketingPage = {
  marketingCampaignsData: null,
  marketingFilterPlatform: "all",
  marketingFilterStatus: "all",
  marketingSearchQuery: "",

  async loadMarketingData() {
    try {
      const res = await apiFetch("/admin/marketing-campaigns");
      this.marketingCampaignsData = res;
      return res;
    } catch (err) {
      console.error("Failed to load marketing campaigns:", err);
      showToast("فشل تحميل بيانات الحملات التسويقية", "error");
      return null;
    }
  },

  renderMarketingTab() {
    const data = this.marketingCampaignsData || { campaigns: [], summary: {} };
    const summary = data.summary || {
      totalAdSpend: 0,
      totalAttributedRevenue: 0,
      totalStudentsAcquired: 0,
      overallRoas: 0,
      overallNetProfit: 0,
      overallCac: 0,
      platformBreakdown: {}
    };

    let campaigns = data.campaigns || [];

    // Filter by platform
    if (this.marketingFilterPlatform && this.marketingFilterPlatform !== "all") {
      campaigns = campaigns.filter(c => c.platform === this.marketingFilterPlatform);
    }
    // Filter by status
    if (this.marketingFilterStatus && this.marketingFilterStatus !== "all") {
      campaigns = campaigns.filter(c => c.status === this.marketingFilterStatus);
    }
    // Search query
    if (this.marketingSearchQuery && this.marketingSearchQuery.trim()) {
      const q = this.marketingSearchQuery.toLowerCase().trim();
      campaigns = campaigns.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.targetAudience && c.targetAudience.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q))
      );
    }

    const platformLabels = {
      facebook: { name: "Facebook", emoji: "📘", color: "#1877F2", bg: "rgba(24,119,242,0.12)" },
      instagram: { name: "Instagram", emoji: "📸", color: "#E1306C", bg: "rgba(225,48,108,0.12)" },
      tiktok: { name: "TikTok", emoji: "🎵", color: "#00f2fe", bg: "rgba(0,242,254,0.12)" },
      google_ads: { name: "Google Ads", emoji: "🔍", color: "#4285F4", bg: "rgba(66,133,244,0.12)" },
      snapchat: { name: "Snapchat", emoji: "👻", color: "#FFFC00", bg: "rgba(255,252,0,0.12)" },
      whatsapp: { name: "WhatsApp", emoji: "💬", color: "#25D366", bg: "rgba(37,211,102,0.12)" },
      other: { name: "أخرى", emoji: "📢", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" }
    };

    return `
      <div style="display:flex; flex-direction:column; gap:24px;">
        
        <!-- Top Executive KPI Summary Cards -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px;">
          
          <!-- Card 1: Total Ad Spend -->
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:20px; padding:20px; display:flex; align-items:center; gap:16px; box-shadow:0 4px 16px rgba(0,0,0,0.04);">
            <div style="width:52px; height:52px; border-radius:16px; background:rgba(236,72,153,0.14); color:#ec4899; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i data-lucide="receipt" style="width:26px; height:26px;"></i>
            </div>
            <div>
              <span style="font-size:0.8rem; font-weight:800; color:var(--text-muted); display:block;">إجمالي الإنفاق الإعلاني</span>
              <strong style="font-size:1.4rem; font-weight:900; color:var(--text-main);">${summary.totalAdSpend?.toLocaleString() || 0} <span style="font-size:0.85rem; font-weight:700;">ج.م</span></strong>
              <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">فيسبوك، إنستغرام، تيك توك، إلخ</div>
            </div>
          </div>

          <!-- Card 2: Attributed Revenue -->
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:20px; padding:20px; display:flex; align-items:center; gap:16px; box-shadow:0 4px 16px rgba(0,0,0,0.04);">
            <div style="width:52px; height:52px; border-radius:16px; background:rgba(16,185,129,0.14); color:#10b981; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i data-lucide="banknote" style="width:26px; height:26px;"></i>
            </div>
            <div>
              <span style="font-size:0.8rem; font-weight:800; color:var(--text-muted); display:block;">إجمالي المبيعات المحققة</span>
              <strong style="font-size:1.4rem; font-weight:900; color:#10b981;">${summary.totalAttributedRevenue?.toLocaleString() || 0} <span style="font-size:0.85rem; font-weight:700;">ج.م</span></strong>
              <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">من ${summary.totalStudentsAcquired || 0} طالباً مشتركاً</div>
            </div>
          </div>

          <!-- Card 3: Overall ROAS -->
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:20px; padding:20px; display:flex; align-items:center; gap:16px; box-shadow:0 4px 16px rgba(0,0,0,0.04);">
            <div style="width:52px; height:52px; border-radius:16px; background:rgba(99,102,241,0.14); color:var(--primary); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i data-lucide="trending-up" style="width:26px; height:26px;"></i>
            </div>
            <div>
              <span style="font-size:0.8rem; font-weight:800; color:var(--text-muted); display:block;">متوسط العائد الإعلاني (ROAS)</span>
              <strong style="font-size:1.4rem; font-weight:900; color:var(--primary);">${summary.overallRoas || 0}x</strong>
              <div style="font-size:0.72rem; color:${summary.overallRoas >= 2 ? '#10b981' : '#f59e0b'}; margin-top:2px; font-weight:700;">
                ${summary.overallRoas >= 2 ? '🔥 عائد استثماري ممتاز' : 'معدل عائد إعلاني متوازن'}
              </div>
            </div>
          </div>

          <!-- Card 4: Net Profit -->
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:20px; padding:20px; display:flex; align-items:center; gap:16px; box-shadow:0 4px 16px rgba(0,0,0,0.04);">
            <div style="width:52px; height:52px; border-radius:16px; background:${summary.overallNetProfit >= 0 ? 'rgba(16,185,129,0.14)' : 'rgba(239,68,68,0.14)'}; color:${summary.overallNetProfit >= 0 ? '#10b981' : '#ef4444'}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i data-lucide="badge-dollar-sign" style="width:26px; height:26px;"></i>
            </div>
            <div>
              <span style="font-size:0.8rem; font-weight:800; color:var(--text-muted); display:block;">صافي الأرباح الإعلانية</span>
              <strong style="font-size:1.4rem; font-weight:900; color:${summary.overallNetProfit >= 0 ? '#10b981' : '#ef4444'};">
                ${summary.overallNetProfit >= 0 ? '+' : ''}${summary.overallNetProfit?.toLocaleString() || 0} <span style="font-size:0.85rem; font-weight:700;">ج.م</span>
              </strong>
              <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">
                تكلفة الطالب: ${summary.overallCac || 0} ج.م
              </div>
            </div>
          </div>

        </div>

        <!-- Platform Comparison Pills -->
        <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:18px; padding:16px 20px;">
          <div style="font-size:0.85rem; font-weight:900; color:var(--text-main); margin-bottom:12px; display:flex; align-items:center; gap:8px;">
            <i data-lucide="pie-chart" style="width:16px; height:16px; color:#ec4899;"></i> أداء المنصات الإعلانية (Platform Breakdown):
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(170px, 1fr)); gap:12px;">
            ${Object.keys(platformLabels).map(pKey => {
              const meta = platformLabels[pKey];
              const pData = summary.platformBreakdown?.[pKey] || { spend: 0, revenue: 0, students: 0 };
              const pRoas = pData.spend > 0 ? (pData.revenue / pData.spend).toFixed(1) : (pData.revenue > 0 ? '99' : '0');
              const isSelected = this.marketingFilterPlatform === pKey;

              return `
                <div class="marketing-platform-pill" data-platform="${pKey}" style="cursor:pointer; background:${isSelected ? meta.bg : 'var(--bg-app)'}; border:1.5px solid ${isSelected ? meta.color : 'var(--border-color)'}; border-radius:14px; padding:12px 14px; transition:all 0.2s;">
                  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
                    <span style="font-size:0.85rem; font-weight:800; color:var(--text-main);">${meta.emoji} ${meta.name}</span>
                    <span style="font-size:0.72rem; font-weight:800; padding:2px 6px; border-radius:6px; background:${meta.bg}; color:${meta.color};">${pRoas}x</span>
                  </div>
                  <div style="font-size:0.78rem; color:var(--text-muted); display:flex; justify-content:space-between;">
                    <span>المصروف: <strong>${pData.spend}</strong></span>
                    <span>الإيراد: <strong style="color:#10b981;">${pData.revenue}</strong></span>
                  </div>
                  <div style="font-size:0.72rem; color:var(--text-muted); margin-top:4px;">
                    👥 ${pData.students} طلاب مشتركون
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Controls Bar: Search, Filters & Create Button -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; background:var(--bg-card); padding:16px 20px; border-radius:18px; border:1px solid var(--border-color);">
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; flex:1;">
            
            <!-- Search -->
            <div style="position:relative; min-width:240px; flex:1;">
              <input type="text" id="marketing-search-input" value="${this.marketingSearchQuery || ''}" placeholder="ابحث باسم الحملة أو الملاحظات..." class="form-input" style="width:100%; padding:9px 14px 9px 36px; border-radius:12px; font-size:0.85rem; background:var(--bg-app); border:1px solid var(--border-color);">
              <i data-lucide="search" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); width:16px; height:16px; color:var(--text-muted);"></i>
            </div>

            <!-- Platform Filter -->
            <select id="marketing-filter-platform" class="form-select" style="padding:9px 12px; border-radius:12px; font-size:0.85rem; background:var(--bg-app); border:1px solid var(--border-color);">
              <option value="all" ${this.marketingFilterPlatform === 'all' ? 'selected' : ''}>كل المنصات الإعلانية</option>
              <option value="facebook" ${this.marketingFilterPlatform === 'facebook' ? 'selected' : ''}>📘 Facebook</option>
              <option value="instagram" ${this.marketingFilterPlatform === 'instagram' ? 'selected' : ''}>📸 Instagram</option>
              <option value="tiktok" ${this.marketingFilterPlatform === 'tiktok' ? 'selected' : ''}>🎵 TikTok</option>
              <option value="google_ads" ${this.marketingFilterPlatform === 'google_ads' ? 'selected' : ''}>🔍 Google Ads</option>
              <option value="snapchat" ${this.marketingFilterPlatform === 'snapchat' ? 'selected' : ''}>👻 Snapchat</option>
              <option value="whatsapp" ${this.marketingFilterPlatform === 'whatsapp' ? 'selected' : ''}>💬 WhatsApp</option>
              <option value="other" ${this.marketingFilterPlatform === 'other' ? 'selected' : ''}>📢 أخرى</option>
            </select>

            <!-- Status Filter -->
            <select id="marketing-filter-status" class="form-select" style="padding:9px 12px; border-radius:12px; font-size:0.85rem; background:var(--bg-app); border:1px solid var(--border-color);">
              <option value="all" ${this.marketingFilterStatus === 'all' ? 'selected' : ''}>كل الحالات</option>
              <option value="active" ${this.marketingFilterStatus === 'active' ? 'selected' : ''}>نشطة 🟢</option>
              <option value="completed" ${this.marketingFilterStatus === 'completed' ? 'selected' : ''}>مكتملة 🏁</option>
              <option value="paused" ${this.marketingFilterStatus === 'paused' ? 'selected' : ''}>متوقفة مؤقتاً ⏸️</option>
            </select>

          </div>

          <!-- Create Campaign Button -->
          <button type="button" id="open-create-campaign-modal-btn" class="btn-primary" style="padding:10px 22px; font-size:0.88rem; font-weight:800; border-radius:14px; background:linear-gradient(135deg, #ec4899, #8b5cf6); border:none; color:#fff; display:inline-flex; align-items:center; gap:8px; box-shadow:0 4px 14px rgba(236,72,153,0.3); cursor:pointer;">
            <i data-lucide="plus-circle" style="width:17px; height:17px;"></i>
            <span>إنشاء حملة تسويقية جديدة 🚀</span>
          </button>
        </div>

        <!-- Campaigns List / Cards -->
        ${campaigns.length === 0 ? `
          <div style="text-align:center; padding:60px 20px; background:var(--bg-card); border-radius:20px; border:1px dashed var(--border-color);">
            <div style="width:64px; height:64px; border-radius:20px; background:rgba(236,72,153,0.1); color:#ec4899; display:flex; align-items:center; justify-content:center; margin:0 auto 16px;">
              <i data-lucide="megaphone" style="width:32px; height:32px;"></i>
            </div>
            <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-main); margin:0 0 6px 0;">لا توجد حملات تسويقية مسجلة حالياً</h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin:0 0 16px 0;">ابدأ بإنشاء أول حملة إعلانية لتسجيل ميزانيتها وربط الطلاب المسجلين بها وحساب الأرباح تلقائياً.</p>
            <button type="button" id="open-create-first-campaign-btn" class="btn-primary" style="padding:10px 24px; border-radius:12px; font-size:0.85rem; font-weight:800; background:linear-gradient(135deg, #ec4899, #8b5cf6); border:none; color:#fff; cursor:pointer;">
              ➕ إنشاء أول حملة تسويقية
            </button>
          </div>
        ` : `
          <div style="display:flex; flex-direction:column; gap:12px;">
            ${campaigns.map(c => {
              const meta = platformLabels[c.platform] || platformLabels.other;
              const isProfitable = c.netProfit >= 0;

              return `
                <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:18px; padding:18px 22px; display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; box-shadow:0 2px 10px rgba(0,0,0,0.02);">
                  
                  <!-- Left: Campaign Info & Platform -->
                  <div style="display:flex; align-items:center; gap:14px; min-width:260px; flex:1;">
                    <div style="width:48px; height:48px; border-radius:14px; background:${meta.bg}; color:${meta.color}; display:flex; align-items:center; justify-content:center; font-size:1.4rem; flex-shrink:0;">
                      ${meta.emoji}
                    </div>
                    <div>
                      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        <strong style="font-size:1rem; font-weight:800; color:var(--text-main);">${c.name}</strong>
                        <span style="font-size:0.72rem; font-weight:800; padding:2px 8px; border-radius:8px; background:${meta.bg}; color:${meta.color}; border:1px solid ${meta.color}40;">
                          ${meta.name}
                        </span>
                        <span style="font-size:0.72rem; font-weight:800; padding:2px 8px; border-radius:8px; background:${c.status === 'active' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)'}; color:${c.status === 'active' ? '#10b981' : '#f59e0b'};">
                          ${c.status === 'active' ? 'نشطة 🟢' : (c.status === 'completed' ? 'مكتملة 🏁' : 'متوقفة ⏸️')}
                        </span>
                      </div>
                      <div style="font-size:0.78rem; color:var(--text-muted); margin-top:4px;">
                        ${c.targetAudience ? `🎯 ${c.targetAudience} • ` : ''}
                        أنشئت: ${new Date(c.createdAt).toLocaleDateString('ar-EG')}
                        ${c.notes ? ` • 💡 ${c.notes}` : ''}
                      </div>
                    </div>
                  </div>

                  <!-- Middle: Financial Metrics Grid -->
                  <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
                    
                    <!-- Ad Spend -->
                    <div style="text-align:center; min-width:85px;">
                      <span style="font-size:0.72rem; color:var(--text-muted); display:block; font-weight:700;">المصروف</span>
                      <strong style="font-size:1rem; color:var(--text-main);">${c.adSpend?.toLocaleString()} ${c.currency}</strong>
                    </div>

                    <!-- Students Count -->
                    <div style="text-align:center; min-width:85px;">
                      <span style="font-size:0.72rem; color:var(--text-muted); display:block; font-weight:700;">الطلاب المشتركون</span>
                      <strong style="font-size:1rem; color:var(--primary);">👥 ${c.studentsCount || 0}</strong>
                    </div>

                    <!-- Revenue -->
                    <div style="text-align:center; min-width:95px;">
                      <span style="font-size:0.72rem; color:var(--text-muted); display:block; font-weight:700;">المبيعات الفعلية</span>
                      <strong style="font-size:1rem; color:#10b981;">${c.revenue?.toLocaleString()} ${c.currency}</strong>
                    </div>

                    <!-- ROAS Badge -->
                    <div style="text-align:center; min-width:80px;">
                      <span style="font-size:0.72rem; color:var(--text-muted); display:block; font-weight:700;">العائد (ROAS)</span>
                      <span style="font-size:0.85rem; font-weight:900; padding:2px 8px; border-radius:8px; background:${c.roas >= 2 ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)'}; color:${c.roas >= 2 ? '#10b981' : '#f59e0b'}; border:1px solid ${c.roas >= 2 ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'};">
                        ${c.roas}x
                      </span>
                    </div>

                    <!-- Net Profit -->
                    <div style="text-align:center; min-width:95px;">
                      <span style="font-size:0.72rem; color:var(--text-muted); display:block; font-weight:700;">صافي الربح</span>
                      <strong style="font-size:1rem; color:${isProfitable ? '#10b981' : '#ef4444'};">
                        ${isProfitable ? '+' : ''}${c.netProfit?.toLocaleString()} ${c.currency}
                      </strong>
                    </div>

                  </div>

                  <!-- Right: Actions Buttons -->
                  <div style="display:flex; align-items:center; gap:6px;">
                    <button type="button" class="view-campaign-details-btn btn-secondary" data-id="${c.id}" style="padding:7px 12px; font-size:0.8rem; font-weight:800; border-radius:10px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;" title="عرض الطلاب المسجلين والمدفوعات">
                      <i data-lucide="users" style="width:14px; height:14px; color:var(--primary);"></i>
                      <span>الطلاب (${c.studentsCount || 0})</span>
                    </button>
                    
                    <button type="button" class="quick-add-spend-btn btn-secondary" data-id="${c.id}" data-name="${c.name}" style="padding:7px 12px; font-size:0.8rem; font-weight:800; border-radius:10px; cursor:pointer; color:#ec4899; border-color:rgba(236,72,153,0.3); background:rgba(236,72,153,0.06); display:inline-flex; align-items:center; gap:4px;" title="تسجيل مصروف إعلاني إضافي">
                      <i data-lucide="plus" style="width:14px; height:14px;"></i>
                      <span>إضافة مصروف</span>
                    </button>

                    <button type="button" class="edit-campaign-btn btn-secondary" data-id="${c.id}" style="padding:7px 10px; font-size:0.8rem; border-radius:10px; cursor:pointer;" title="تعديل الحملة">
                      <i data-lucide="edit-3" style="width:14px; height:14px;"></i>
                    </button>

                    <button type="button" class="delete-campaign-btn btn-secondary" data-id="${c.id}" data-name="${c.name}" style="padding:7px 10px; font-size:0.8rem; border-radius:10px; cursor:pointer; color:#ef4444; border-color:rgba(239,68,68,0.3);" title="حذف الحملة">
                      <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                    </button>
                  </div>

                </div>
              `;
            }).join('')}
          </div>
        `}

      </div>
    `;
  },

  bindMarketingEvents() {
    const container = this.container || document;

    // Platform pill quick filter
    container.querySelectorAll(".marketing-platform-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        const plat = pill.getAttribute("data-platform");
        this.marketingFilterPlatform = (this.marketingFilterPlatform === plat) ? "all" : plat;
        this.renderTab("marketing");
      });
    });

    // Search input
    const searchInput = container.querySelector("#marketing-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.marketingSearchQuery = e.target.value;
        this.renderTab("marketing");
      });
    }

    // Platform select filter
    const platSelect = container.querySelector("#marketing-filter-platform");
    if (platSelect) {
      platSelect.addEventListener("change", (e) => {
        this.marketingFilterPlatform = e.target.value;
        this.renderTab("marketing");
      });
    }

    // Status select filter
    const statusSelect = container.querySelector("#marketing-filter-status");
    if (statusSelect) {
      statusSelect.addEventListener("change", (e) => {
        this.marketingFilterStatus = e.target.value;
        this.renderTab("marketing");
      });
    }

    // Open create campaign modal buttons
    container.querySelector("#open-create-campaign-modal-btn")?.addEventListener("click", () => {
      this.openCreateCampaignModal();
    });
    container.querySelector("#open-create-first-campaign-btn")?.addEventListener("click", () => {
      this.openCreateCampaignModal();
    });

    // View campaign details
    container.querySelectorAll(".view-campaign-details-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        this.openCampaignDetailsModal(id);
      });
    });

    // Quick add spend
    container.querySelectorAll(".quick-add-spend-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const name = btn.getAttribute("data-name");
        this.openAddSpendModal(id, name);
      });
    });

    // Edit campaign
    container.querySelectorAll(".edit-campaign-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const camp = (this.marketingCampaignsData?.campaigns || []).find(c => String(c.id) === String(id));
        if (camp) this.openCreateCampaignModal(camp);
      });
    });

    // Delete campaign
    container.querySelectorAll(".delete-campaign-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const name = btn.getAttribute("data-name") || "هذه الحملة";
        const confirmed = await confirmDialog({
          title: "حذف الحملة التسويقية",
          message: `هل أنت متأكد من رغبتك في حذف "${name}"؟ لن يتم حذف الطلاب أو مدفوعاتهم ولكن سيتم فك ارتباطهم بهذه الحملة.`
        });
        if (!confirmed) return;

        try {
          await apiFetch(`/admin/marketing-campaigns/${id}`, { method: "DELETE" });
          showToast("تم حذف الحملة التسويقية بنجاح", "success");
          await this.loadMarketingData();
          this.renderTab("marketing");
        } catch (err) {
          showToast(err.message || "فشل حذف الحملة", "error");
        }
      });
    });
  },

  openCreateCampaignModal(existingCampaign = null) {
    const isEdit = !!existingCampaign;
    const modalId = "campaign-create-edit-modal";
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = modalId;
    overlay.style.cssText = "position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px); z-index:100010; display:flex; align-items:center; justify-content:center; padding:16px;";

    overlay.innerHTML = `
      <div class="modal-content" style="max-width:540px; width:100%; border-radius:24px; padding:28px; background:var(--bg-card); border:1px solid var(--border-color); box-shadow:0 30px 60px rgba(0,0,0,0.5);">
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:14px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:42px; height:42px; border-radius:14px; background:rgba(236,72,153,0.14); color:#ec4899; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="${isEdit ? 'edit-3' : 'megaphone'}" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <h3 style="margin:0; font-size:1.15rem; font-weight:900; color:var(--text-main);">
                ${isEdit ? 'تعديل بيانات الحملة التسويقية' : 'إنشاء حملة تسويقية جديدة 🚀'}
              </h3>
              <p style="margin:2px 0 0 0; font-size:0.78rem; color:var(--text-muted);">
                سجل الميزانية الإعلانية لربط الطلاب وحساب العائد تلقائياً
              </p>
            </div>
          </div>
          <button id="close-camp-modal-btn" style="background:none; border:none; font-size:1.5rem; color:var(--text-muted); cursor:pointer;">&times;</button>
        </div>

        <form id="campaign-form" style="display:flex; flex-direction:column; gap:14px;">
          
          <div>
            <label style="display:block; font-size:0.83rem; font-weight:800; margin-bottom:4px; color:var(--text-main);">
              اسم الحملة: <span style="color:#ef4444;">*</span>
            </label>
            <input type="text" id="camp-input-name" value="${existingCampaign?.name || ''}" placeholder="مثال: مراجعة نهائية - إعلانات إنستغرام ليدز" class="form-input" style="width:100%; border-radius:12px; padding:10px 14px; font-size:0.88rem; box-sizing:border-box;" required>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div>
              <label style="display:block; font-size:0.83rem; font-weight:800; margin-bottom:4px; color:var(--text-main);">المنصة الإعلانية:</label>
              <select id="camp-input-platform" class="form-select" style="width:100%; border-radius:12px; padding:10px 12px; font-size:0.88rem; box-sizing:border-box;">
                <option value="facebook" ${existingCampaign?.platform === 'facebook' ? 'selected' : ''}>📘 Facebook</option>
                <option value="instagram" ${existingCampaign?.platform === 'instagram' ? 'selected' : ''}>📸 Instagram</option>
                <option value="tiktok" ${existingCampaign?.platform === 'tiktok' ? 'selected' : ''}>🎵 TikTok</option>
                <option value="google_ads" ${existingCampaign?.platform === 'google_ads' ? 'selected' : ''}>🔍 Google Ads</option>
                <option value="snapchat" ${existingCampaign?.platform === 'snapchat' ? 'selected' : ''}>👻 Snapchat</option>
                <option value="whatsapp" ${existingCampaign?.platform === 'whatsapp' ? 'selected' : ''}>💬 WhatsApp Campaign</option>
                <option value="other" ${existingCampaign?.platform === 'other' ? 'selected' : ''}>📢 أخرى</option>
              </select>
            </div>

            <div>
              <label style="display:block; font-size:0.83rem; font-weight:800; margin-bottom:4px; color:var(--text-main);">المصروف الإعلاني (ج.م):</label>
              <input type="number" id="camp-input-spend" value="${existingCampaign?.adSpend ?? ''}" placeholder="0" min="0" step="50" class="form-input" style="width:100%; border-radius:12px; padding:10px 14px; font-size:0.88rem; box-sizing:border-box;">
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div>
              <label style="display:block; font-size:0.83rem; font-weight:800; margin-bottom:4px; color:var(--text-main);">حالة الحملة:</label>
              <select id="camp-input-status" class="form-select" style="width:100%; border-radius:12px; padding:10px 12px; font-size:0.88rem; box-sizing:border-box;">
                <option value="active" ${existingCampaign?.status === 'active' ? 'selected' : ''}>نشطة حالياً 🟢</option>
                <option value="paused" ${existingCampaign?.status === 'paused' ? 'selected' : ''}>متوقفة مؤقتاً ⏸️</option>
                <option value="completed" ${existingCampaign?.status === 'completed' ? 'selected' : ''}>مكتملة 🏁</option>
              </select>
            </div>

            <div>
              <label style="display:block; font-size:0.83rem; font-weight:800; margin-bottom:4px; color:var(--text-main);">الجمهور المستهدف (اختياري):</label>
              <input type="text" id="camp-input-target" value="${existingCampaign?.targetAudience || ''}" placeholder="مثال: طلاب تالتة ثانوي القاهرة" class="form-input" style="width:100%; border-radius:12px; padding:10px 14px; font-size:0.88rem; box-sizing:border-box;">
            </div>
          </div>

          <div>
            <label style="display:block; font-size:0.83rem; font-weight:800; margin-bottom:4px; color:var(--text-main);">ملاحظات إضافية:</label>
            <textarea id="camp-input-notes" rows="2" placeholder="ملاحظات حول الإعلان أو رابط البوست أو الهدف..." class="form-input" style="width:100%; border-radius:12px; padding:10px 14px; font-size:0.88rem; box-sizing:border-box; font-family:'Cairo',sans-serif;">${existingCampaign?.notes || ''}</textarea>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px;">
            <button type="button" id="cancel-camp-btn" class="btn-secondary" style="padding:10px 20px; border-radius:12px; font-size:0.88rem; cursor:pointer;">إلغاء</button>
            <button type="submit" class="btn-primary" style="padding:10px 24px; border-radius:12px; font-size:0.88rem; font-weight:900; background:linear-gradient(135deg, #ec4899, #8b5cf6); border:none; color:#fff; cursor:pointer;">
              ${isEdit ? 'حفظ التعديلات ✅' : 'إنشاء الحملة واعتمادها 🚀'}
            </button>
          </div>

        </form>

      </div>
    `;

    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => overlay.remove();
    overlay.querySelector("#close-camp-modal-btn")?.addEventListener("click", closeModal);
    overlay.querySelector("#cancel-camp-btn")?.addEventListener("click", closeModal);

    overlay.querySelector("#campaign-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = overlay.querySelector("#camp-input-name")?.value?.trim();
      const platform = overlay.querySelector("#camp-input-platform")?.value;
      const adSpend = parseFloat(overlay.querySelector("#camp-input-spend")?.value) || 0;
      const status = overlay.querySelector("#camp-input-status")?.value;
      const targetAudience = overlay.querySelector("#camp-input-target")?.value?.trim();
      const notes = overlay.querySelector("#camp-input-notes")?.value?.trim();

      if (!name) {
        showToast("يرجى إدخال اسم الحملة التسويقية.", "warning");
        return;
      }

      try {
        if (isEdit) {
          await apiFetch(`/admin/marketing-campaigns/${existingCampaign.id}`, {
            method: "PUT",
            body: JSON.stringify({ name, platform, adSpend, status, targetAudience, notes })
          });
          showToast("تم تحديث بيانات الحملة التسويقية بنجاح ✅", "success");
        } else {
          await apiFetch("/admin/marketing-campaigns", {
            method: "POST",
            body: JSON.stringify({ name, platform, adSpend, status, targetAudience, notes })
          });
          showToast("تم إنشاء الحملة التسويقية بنجاح! 🚀", "success");
        }

        closeModal();
        await this.loadMarketingData();
        this.renderTab("marketing");
      } catch (err) {
        showToast(err.message || "فشلت العملية", "error");
      }
    });
  },

  openAddSpendModal(campaignId, campaignName) {
    const modalId = "add-spend-modal";
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = modalId;
    overlay.style.cssText = "position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px); z-index:100010; display:flex; align-items:center; justify-content:center; padding:16px;";

    overlay.innerHTML = `
      <div class="modal-content" style="max-width:440px; width:100%; border-radius:24px; padding:26px; background:var(--bg-card); border:1px solid var(--border-color); box-shadow:0 30px 60px rgba(0,0,0,0.5);">
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h3 style="margin:0; font-size:1.15rem; font-weight:900; color:var(--text-main);">➕ إضافة مصروف إعلاني</h3>
            <p style="margin:2px 0 0 0; font-size:0.78rem; color:var(--text-muted);">${campaignName}</p>
          </div>
          <button id="close-spend-modal-btn" style="background:none; border:none; font-size:1.5rem; color:var(--text-muted); cursor:pointer;">&times;</button>
        </div>

        <div style="display:flex; flex-direction:column; gap:12px;">
          <div>
            <label style="display:block; font-size:0.83rem; font-weight:800; margin-bottom:4px; color:var(--text-main);">المبلغ المصروف الإضافي (ج.م): <span style="color:#ef4444;">*</span></label>
            <input type="number" id="add-spend-amount" placeholder="مثال: 500" min="1" step="10" class="form-input" style="width:100%; border-radius:12px; padding:10px 14px; font-size:0.95rem; font-weight:800;" required>
          </div>

          <div>
            <label style="display:block; font-size:0.83rem; font-weight:800; margin-bottom:4px; color:var(--text-main);">ملاحظة / سبب الصرف (اختياري):</label>
            <input type="text" id="add-spend-note" placeholder="مثال: شحن فيزا إعلانات فيسبوك" class="form-input" style="width:100%; border-radius:12px; padding:10px 14px; font-size:0.85rem;">
          </div>

          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:8px;">
            <button type="button" id="cancel-spend-btn" class="btn-secondary" style="padding:9px 18px; border-radius:12px; font-size:0.85rem;">إلغاء</button>
            <button type="button" id="submit-spend-btn" class="btn-primary" style="padding:9px 22px; border-radius:12px; font-size:0.85rem; font-weight:900; background:linear-gradient(135deg, #ec4899, #8b5cf6); border:none; color:#fff;">إضافة المصروف وتحديث ROAS ✅</button>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => overlay.remove();
    overlay.querySelector("#close-spend-modal-btn")?.addEventListener("click", closeModal);
    overlay.querySelector("#cancel-spend-btn")?.addEventListener("click", closeModal);

    overlay.querySelector("#submit-spend-btn")?.addEventListener("click", async () => {
      const amountVal = parseFloat(overlay.querySelector("#add-spend-amount")?.value);
      const noteVal = overlay.querySelector("#add-spend-note")?.value?.trim();

      if (!amountVal || amountVal <= 0) {
        showToast("يرجى إدخال مبلغ صحيح أكبر من صفر.", "warning");
        return;
      }

      try {
        await apiFetch(`/admin/marketing-campaigns/${campaignId}/add-spend`, {
          method: "POST",
          body: JSON.stringify({ additionalSpend: amountVal, note: noteVal })
        });
        showToast("تمت إضافة المصروف بنجاح وتحديث العائد الإعلاني! 💳", "success");
        closeModal();
        await this.loadMarketingData();
        this.renderTab("marketing");
      } catch (err) {
        showToast(err.message || "فشلت إضافة المصروف", "error");
      }
    });
  },

  async openCampaignDetailsModal(campaignId) {
    const modalId = "campaign-details-modal";
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = modalId;
    overlay.style.cssText = "position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.72); backdrop-filter:blur(8px); z-index:100010; display:flex; align-items:center; justify-content:center; padding:16px;";

    overlay.innerHTML = `
      <div class="modal-content" style="max-width:760px; width:100%; border-radius:24px; padding:36px; background:var(--bg-card); border:1px solid var(--border-color); text-align:center;">
        <div class="spinner" style="width:36px; height:36px; margin:0 auto 16px;"></div>
        <p style="font-size:0.9rem; font-weight:800; color:var(--text-main);">جاري جلب تفاصيل الحملة والطلاب المسجلين...</p>
      </div>
    `;
    document.body.appendChild(overlay);

    try {
      const res = await apiFetch(`/admin/marketing-campaigns/${campaignId}`);
      const camp = res.campaign;
      const metrics = res.metrics;
      const enrollments = res.enrollments || [];

      overlay.innerHTML = `
        <div class="modal-content" style="max-width:820px; width:100%; max-height:90vh; overflow-y:auto; border-radius:24px; padding:28px; background:var(--bg-card); border:1px solid var(--border-color); box-shadow:0 30px 70px rgba(0,0,0,0.55); display:flex; flex-direction:column; gap:20px;">
          
          <!-- Header -->
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:16px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <h3 style="margin:0; font-size:1.2rem; font-weight:900; color:var(--text-main);">${camp.name}</h3>
                <span style="font-size:0.75rem; font-weight:800; padding:2px 8px; border-radius:8px; background:rgba(236,72,153,0.12); color:#ec4899;">
                  [${camp.platform.toUpperCase()}]
                </span>
              </div>
              <p style="margin:3px 0 0 0; font-size:0.8rem; color:var(--text-muted);">
                تاريخ الإنشاء: ${new Date(camp.createdAt).toLocaleDateString('ar-EG')}
              </p>
            </div>
            <button id="close-camp-details-btn" style="background:none; border:none; font-size:1.6rem; color:var(--text-muted); cursor:pointer;">&times;</button>
          </div>

          <!-- Quick Metrics Bar -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; background:var(--bg-app); padding:14px; border-radius:16px; border:1px solid var(--border-color);">
            <div style="text-align:center;">
              <span style="font-size:0.72rem; color:var(--text-muted); display:block;">المصروف</span>
              <strong style="font-size:1.1rem; color:var(--text-main);">${metrics.spend} ج.م</strong>
            </div>
            <div style="text-align:center;">
              <span style="font-size:0.72rem; color:var(--text-muted); display:block;">المبيعات</span>
              <strong style="font-size:1.1rem; color:#10b981;">${metrics.revenue} ج.م</strong>
            </div>
            <div style="text-align:center;">
              <span style="font-size:0.72rem; color:var(--text-muted); display:block;">العائد ROAS</span>
              <strong style="font-size:1.1rem; color:var(--primary);">${metrics.roas}x</strong>
            </div>
            <div style="text-align:center;">
              <span style="font-size:0.72rem; color:var(--text-muted); display:block;">صافي الربح</span>
              <strong style="font-size:1.1rem; color:${metrics.netProfit >= 0 ? '#10b981' : '#ef4444'};">
                ${metrics.netProfit >= 0 ? '+' : ''}${metrics.netProfit} ج.م
              </strong>
            </div>
            <div style="text-align:center;">
              <span style="font-size:0.72rem; color:var(--text-muted); display:block;">المقاعد المسجلة</span>
              <strong style="font-size:1.1rem; color:var(--text-main);">👥 ${metrics.enrollmentsCount}</strong>
            </div>
          </div>

          <!-- Enrolled Students List -->
          <div>
            <h4 style="margin:0 0 10px 0; font-size:0.95rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:6px;">
              <i data-lucide="graduation-cap" style="width:16px; height:16px; color:#ec4899;"></i> قائمة الطلاب المسجلين عبر هذه الحملة (${enrollments.length} طالب):
            </h4>

            ${enrollments.length === 0 ? `
              <div style="text-align:center; padding:30px; background:var(--bg-app); border-radius:14px; border:1px dashed var(--border-color); color:var(--text-muted); font-size:0.85rem;">
                لم يتم تسكين أي طالب عبر هذه الحملة حتى الآن. يمكنك تحديد هذه الحملة عند تسكين طالب جديد في أي مجموعة.
              </div>
            ` : `
              <div style="display:flex; flex-direction:column; gap:8px;">
                ${enrollments.map(e => `
                  <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:14px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
                    <div style="display:flex; align-items:center; gap:10px;">
                      <div style="width:36px; height:36px; border-radius:10px; background:rgba(99,102,241,0.12); color:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:900;">
                        ${(e.student?.name || 'ط')[0]}
                      </div>
                      <div>
                        <strong style="font-size:0.9rem; color:var(--text-main);">${e.student?.name || 'طالب'}</strong>
                        <div style="font-size:0.75rem; color:var(--text-muted);">
                          المجموعة: <strong>${e.group?.name || e.course?.title || 'عام'}</strong>
                          ${e.student?.phone ? ` • هاتف: ${e.student.phone}` : ''}
                        </div>
                      </div>
                    </div>
                    <div style="text-align:left;">
                      <span style="font-size:0.82rem; font-weight:800; color:#10b981; display:block;">
                        💳 ${e.paidAmount || 0} ج.م
                      </span>
                      <span style="font-size:0.72rem; color:var(--text-muted);">
                        ${new Date(e.createdAt).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <div style="display:flex; justify-content:flex-end;">
            <button type="button" id="close-camp-details-bottom-btn" class="btn-secondary" style="padding:9px 22px; border-radius:12px; font-size:0.85rem; font-weight:700;">إغلاق</button>
          </div>

        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
      overlay.querySelector("#close-camp-details-btn")?.addEventListener("click", () => overlay.remove());
      overlay.querySelector("#close-camp-details-bottom-btn")?.addEventListener("click", () => overlay.remove());

    } catch (err) {
      showToast(err.message || "فشل تحميل التفاصيل", "error");
      overlay.remove();
    }
  }
};
