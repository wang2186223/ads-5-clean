export default function middleware(request) {
  const userAgent = request.headers.get('user-agent') || '';

  // 1. 核心白名单：谷歌广告蜘蛛直接放行，确保广告正常吐出来
  if (userAgent.includes('Mediapartners-Google') || userAgent.includes('Google-Ads-Creatives')) {
    return; // Vercel Edge Middleware 中 return undefined = 放行，官方标准写法
  }

  // 2. 检查是否有"真实读者通行证" Cookie
  const cookieHeader = request.headers.get('cookie') || '';
  const hasAuth = cookieHeader.includes('reader_auth=passed_verification');

  if (hasAuth) {
    return; // 有通行证，放行（用户翻页无感知）
  }

  // 3. 拦截：返回验证页面（爬虫看到的是这个 HTML，不是真实章节内容）
  const verifyHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Verifying Your Connection...</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding-top: 100px; background: #f9f9f9; }
        .box { background: white; padding: 40px; display: inline-block; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        button { background: #1a73e8; color: white; border: none; padding: 12px 24px; font-size: 16px; border-radius: 4px; cursor: pointer; margin-top: 20px; }
        button:hover { background: #1557b0; }
    </style>
</head>
<body>
    <div class="box">
        <h2>Are you a real reader?</h2>
        <p>Please click the button below to continue reading.</p>
        <button onclick="document.cookie='reader_auth=passed_verification; path=/; max-age=86400;'; location.reload();">
            Click to Read
        </button>
    </div>
</body>
</html>`;

  // 返回自定义的验证 HTML
  return new Response(verifyHtml, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

// 4. 只拦截章节页面，首页和小说目录页保持公开（有利于 SEO）
export const config = {
  matcher: ['/novels/:novel/:chapter'],
};