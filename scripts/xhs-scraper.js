// 小红书世界杯数据抓取 v2 — 拦截 API 响应
// 用法：
//  1. 刷新 https://www.xiaohongshu.com/worldcup26 页面
//  2. 等页面加载完后，切换到赛程 Tab
//  3. 粘贴运行此脚本
//  4. 浏览各个页面（赛程、比赛详情、球队、球员等）
//  5. 所有 API 响应会自动收集，最后运行 downloadAll() 下载

(function() {
  const collected = {};

  // 拦截 fetch
  const origFetch = window.fetch;
  window.fetch = async function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
    const res = await origFetch.apply(this, args);
    // 克隆响应以读取 JSON
    const clone = res.clone();
    try {
      const json = await clone.json();
      if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) {
        const key = url.split('?')[0].split('/').slice(-2).join('/');
        if (!collected[key]) {
          collected[key] = { url, data: json, count: 1 };
          console.log('📦 捕获:', key, url.slice(0, 80));
        } else {
          collected[key].count++;
          collected[key].data = json; // 更新为最新数据
        }
      }
    } catch(e) {} // 非 JSON 响应忽略
    return res;
  };

  // 拦截 XHR
  const origXHROpen = XMLHttpRequest.prototype.open;
  const origXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    return origXHROpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function() {
    this.addEventListener('load', function() {
      try {
        const url = this._url || '';
        if ((url.includes('xiaohongshu.com') || url.includes('xhslink.com')) && this.responseText) {
          const json = JSON.parse(this.responseText);
          const key = url.split('?')[0].split('/').slice(-2).join('/');
          if (!collected[key]) {
            collected[key] = { url, data: json, count: 1 };
            console.log('📦 XHR捕获:', key, url.slice(0, 80));
          } else {
            collected[key].count++;
            collected[key].data = json;
          }
        }
      } catch(e) {}
    });
    return origXHRSend.apply(this, arguments);
  };

  console.log('✅ 拦截器已启动！现在正常浏览页面，所有 API 数据会自动收集');
  console.log('🔜 浏览完成后，输入 downloadAll() 下载全部数据');

  window.downloadAll = function() {
    const entries = Object.entries(collected);
    console.log(`📊 共收集 ${entries.length} 个 API 接口`);
    entries.forEach(([key, val]) => {
      console.log(`  ${key}: ${JSON.stringify(val.data).length} 字符 (${val.count} 次请求)`);
    });
    // 下载所有
    entries.forEach(([key, val]) => {
      const blob = new Blob([JSON.stringify(val.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xhs_${key.replace(/\//g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
    console.log('💾 全部下载完成！把这几个 JSON 文件发给我');
  };

  window.showCollected = function() {
    console.table(Object.entries(collected).map(([key, val]) => ({
      endpoint: key,
      size: JSON.stringify(val.data).length,
      calls: val.count
    })));
  };
})();
