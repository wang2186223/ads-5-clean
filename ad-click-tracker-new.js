// ===== 广告点击监控系统（完全合规版）=====
// 多重检测策略，完全不修改Google广告代码，100%合规

(function() {
    'use strict';
    
    // 配置
    const AD_CLICK_CONFIG = {
        scriptUrl: 'https://script.google.com/macros/s/AKfycbxOHhl5FN8XmcmA0Zf4JcnZM3uFEumgFlOfqYlhP8MJ6HUCu3SsOUlIYTdv0dSw5flm/exec',
        maxClicksPerAd: 3,             // 同一广告位10秒内最多记录次数
        cooldownPeriod: 10000,         // 防抖周期：10秒
        storageKey: 'ad_total_clicks', // localStorage键名
        clickTimesKey: 'ad_click_times', // 点击时间记录
        debugMode: true                // 🔧 开启调试模式，方便测试
    };
    
    // 广告点击追踪器类（完全合规 - 只监听容器）
    class AdClickTracker {
        constructor() {
            this.pageLoadTime = Date.now();
            this.clickRecords = this.loadClickRecords();
            this.monitoredContainers = new Set();
            this.touchData = {}; // 存储每个广告的触摸数据
            this.lastInteractionTime = 0;
            
            this.log('🔍 广告点击监控系统初始化（完全合规版）');
            this.log('📱 策略：容器触摸 + 页面事件组合检测');
            this.init();
        }
        
        // 日志输出
        log(...args) {
            if (AD_CLICK_CONFIG.debugMode) {
                console.log('[AdClickTracker]', ...args);
            }
        }
        
        // 加载点击记录
        loadClickRecords() {
            try {
                const data = localStorage.getItem(AD_CLICK_CONFIG.clickTimesKey);
                return data ? JSON.parse(data) : {};
            } catch (e) {
                return {};
            }
        }
        
        // 保存点击记录
        saveClickRecords() {
            try {
                localStorage.setItem(AD_CLICK_CONFIG.clickTimesKey, JSON.stringify(this.clickRecords));
            } catch (e) {
                this.log('❌ 保存失败:', e);
            }
        }
        
        // 初始化
        init() {
            this.log('⚙️ 开始初始化...');
            
            // 立即扫描并监听
            this.scanAndMonitorAds();
            
            // 持续扫描新广告
            this.startContinuousMonitoring();
            
            // 设置全局页面监听
            this.setupGlobalListeners();
            
            this.log('✅ 监控系统已启动');
            this.log('💡 提示：点击广告后查看控制台日志');
        }
        
        // 扫描并监听广告
        scanAndMonitorAds() {
            const adContainers = document.querySelectorAll('.adsbygoogle');
            
            if (adContainers.length > 0 && this.monitoredContainers.size === 0) {
                this.log(`🔎 扫描到 ${adContainers.length} 个广告容器`);
            }
            
            adContainers.forEach((adContainer, index) => {
                const iframe = adContainer.querySelector('iframe[id^="aswift_"]');
                const adSlot = adContainer.getAttribute('data-ad-slot');
                
                if (iframe && !this.monitoredContainers.has(adContainer)) {
                    this.setupAdMonitoring(adContainer, adSlot);
                    this.monitoredContainers.add(adContainer);
                    this.log(`✓ 已监听广告 #${index + 1} (slot: ${adSlot})`);
                }
            });
        }
        
        // 持续监听
        startContinuousMonitoring() {
            setInterval(() => {
                this.scanAndMonitorAds();
            }, 500);
        }
        
        // ✅ 关键：只监听容器，不碰iframe（100%合规）
        setupAdMonitoring(adContainer, adSlot) {
            const containerId = adSlot || 'ad_' + Date.now();
            
            // 监听容器的触摸开始
            adContainer.addEventListener('touchstart', (e) => {
                this.touchData[containerId] = {
                    startTime: Date.now(),
                    startX: e.touches[0].clientX,
                    startY: e.touches[0].clientY,
                    moved: false,
                    adContainer: adContainer,
                    adSlot: adSlot
                };
                this.lastInteractionTime = Date.now();
                this.log(`👆 触摸开始: 广告 ${adSlot}`);
            }, { passive: true });
            
            // 监听容器的触摸移动
            adContainer.addEventListener('touchmove', (e) => {
                if (!this.touchData[containerId]) return;
                
                const moveX = Math.abs(e.touches[0].clientX - this.touchData[containerId].startX);
                const moveY = Math.abs(e.touches[0].clientY - this.touchData[containerId].startY);
                
                if (moveX > 20 || moveY > 20) {
                    this.touchData[containerId].moved = true;
                    this.log(`📜 检测到滚动 (移动: ${Math.max(moveX, moveY)}px)`);
                }
            }, { passive: true });
            
            // 监听容器的触摸结束
            adContainer.addEventListener('touchend', (e) => {
                if (!this.touchData[containerId]) return;
                
                const touchDuration = Date.now() - this.touchData[containerId].startTime;
                const moved = this.touchData[containerId].moved;
                
                this.log(`👇 触摸结束: ${adSlot} (持续: ${touchDuration}ms, 移动: ${moved ? '是' : '否'})`);
                
                // 判断是点击而非滚动
                if (!moved && touchDuration >= 50 && touchDuration <= 1000) {
                    this.log(`🎯 疑似点击广告！等待确认...`);
                    this.touchData[containerId].isPendingClick = true;
                    this.touchData[containerId].touchDuration = touchDuration;
                    
                    // 延迟检查是否跳转
                    setTimeout(() => {
                        this.checkPendingClick(containerId);
                    }, 300);
                } else {
                    delete this.touchData[containerId];
                }
            }, { passive: true });
        }
        
        // 设置全局监听器
        setupGlobalListeners() {
            // 监听页面失焦
            window.addEventListener('blur', () => {
                const timeSinceInteraction = Date.now() - this.lastInteractionTime;
                if (timeSinceInteraction < 500) {
                    this.log('🔄 页面失焦 - 可能点击了广告');
                    this.confirmAllPendingClicks('blur');
                }
            }, { passive: true });
            
            // 监听页面可见性
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    const timeSinceInteraction = Date.now() - this.lastInteractionTime;
                    if (timeSinceInteraction < 500) {
                        this.log('🚪 页面隐藏 - 可能跳转到广告页');
                        this.confirmAllPendingClicks('visibility');
                    }
                }
            }, { passive: true });
            
            this.log('✓ 全局监听器已设置');
        }
        
        // 检查待确认的点击
        checkPendingClick(containerId) {
            const data = this.touchData[containerId];
            if (data && data.isPendingClick) {
                // 300ms后仍未跳转，可能是iframe内跳转，也记录
                this.log(`⚠️ 触摸后300ms未跳转，记录为可能点击`);
                this.recordAdClick(data.adContainer, data.adSlot, 'touch_nojump', {
                    touchDuration: data.touchDuration
                });
                delete this.touchData[containerId];
            }
        }
        
        // 确认所有待定点击
        confirmAllPendingClicks(triggerMethod) {
            for (const [containerId, data] of Object.entries(this.touchData)) {
                if (data.isPendingClick) {
                    const timeSinceTouch = Date.now() - data.startTime;
                    if (timeSinceTouch < 500) {
                        this.log(`✅ 确认广告点击！(触发: ${triggerMethod}, 延迟: ${timeSinceTouch}ms)`);
                        this.recordAdClick(data.adContainer, data.adSlot, triggerMethod, {
                            touchDuration: data.touchDuration,
                            confirmed: true,
                            timeSinceTouch: timeSinceTouch
                        });
                        delete this.touchData[containerId];
                    }
                }
            }
        }
        
        // 记录广告点击
        recordAdClick(adContainer, adSlot, method, extraData = {}) {
            const now = Date.now();
            
            this.log(`📊 记录广告点击: ${adSlot}`);
            
            // 防抖检查
            if (!this.clickRecords[adSlot]) {
                this.clickRecords[adSlot] = [];
            }
            
            this.clickRecords[adSlot] = this.clickRecords[adSlot].filter(
                timestamp => now - timestamp < AD_CLICK_CONFIG.cooldownPeriod
            );
            
            if (this.clickRecords[adSlot].length >= AD_CLICK_CONFIG.maxClicksPerAd) {
                this.log(`⏱️ 防抖：10秒内已记录${AD_CLICK_CONFIG.maxClicksPerAd}次`);
                return;
            }
            
            this.clickRecords[adSlot].push(now);
            this.saveClickRecords();
            
            const totalClickCount = this.incrementTotalClicks();
            this.log(`💾 累计点击次数: ${totalClickCount}`);
            
            const clickData = this.collectClickData(adContainer, totalClickCount, method, extraData);
            this.sendClickData(clickData);
            
            this.log(`🚀 数据已发送`);
            this.log('─'.repeat(60));
        }
        
        // 递增累计点击
        incrementTotalClicks() {
            try {
                let totalClicks = parseInt(localStorage.getItem(AD_CLICK_CONFIG.storageKey) || '0');
                totalClicks++;
                localStorage.setItem(AD_CLICK_CONFIG.storageKey, totalClicks.toString());
                return totalClicks;
            } catch (e) {
                return 0;
            }
        }
        
        // 收集数据
        collectClickData(adContainer, totalClickCount, method, extraData) {
            const iframe = adContainer.querySelector('iframe[id^="aswift_"]');
            const rect = iframe ? iframe.getBoundingClientRect() : adContainer.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const adPosition = Math.round(rect.top + scrollTop);
            const stayDuration = Math.round((Date.now() - this.pageLoadTime) / 1000);
            
            return {
                timestamp: new Date().toISOString(),
                eventType: 'ad_click',
                novel: '{{ novel.title }}',
                chapter: '{{ chapter.number }}',
                pageUrl: window.location.href,
                adSlot: adContainer.getAttribute('data-ad-slot') || 'unknown',
                adPosition: adPosition,
                scrollDepth: Math.round(window.scrollY),
                userIP: '',
                userAgent: navigator.userAgent,
                screenSize: `${window.screen.width}x${window.screen.height}`,
                viewportSize: `${window.innerWidth}x${window.innerHeight}`,
                stayDuration: stayDuration,
                totalClickCount: totalClickCount,
                clickSource: method,
                referrer: document.referrer,
                ...extraData
            };
        }
        
        // 发送点击数据
        async sendClickData(clickData) {
            try {
                // 获取用户IP
                const userIP = typeof getUserIP === 'function' ? await getUserIP() : await this.getUserIP();
                clickData.userIP = userIP;
                
                // 发送到 Google Apps Script
                fetch(AD_CLICK_CONFIG.scriptUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(clickData)
                }).then(() => {
                    this.log('✅ 数据已发送到服务器');
                }).catch(error => {
                    this.log('❌ 发送失败:', error);
                });
                
                // 发送到 GA4
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'ad_click', {
                        'ad_slot': clickData.adSlot,
                        'total_clicks': clickData.totalClickCount,
                        'novel': clickData.novel,
                        'chapter': clickData.chapter
                    });
                }
                
                // 发送到 Facebook Pixel
                if (typeof fbq !== 'undefined') {
                    fbq('trackCustom', 'AdClick', {
                        ad_slot: clickData.adSlot,
                        total_clicks: clickData.totalClickCount,
                        novel: clickData.novel
                    });
                }
                
            } catch (error) {
                this.log('❌ 发送异常:', error);
            }
        }
        
        // 获取用户IP
        async getUserIP() {
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                return data.ip;
            } catch (error) {
                try {
                    const response = await fetch('https://httpbin.org/ip');
                    const data = await response.json();
                    return data.origin.split(',')[0].trim();
                } catch (error2) {
                    return 'Unknown';
                }
            }
        }
    }
    
    // 页面加载后立即初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            window.adClickTracker = new AdClickTracker();
        });
    } else {
        window.adClickTracker = new AdClickTracker();
    }
    
})();
