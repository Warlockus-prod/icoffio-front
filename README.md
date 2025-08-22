# 🚀 ICOFFIO.COM - Multi-language Technology News Platform

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/icoffio-front)

## 🌍 **Live Sites**
- 🇺🇸 **English**: [icoffio.com](https://icoffio.com)
- 🇵🇱 **Polish**: [pl.icoffio.com](https://pl.icoffio.com) 
- 🇩🇪 **German**: [de.icoffio.com](https://de.icoffio.com)
- 🇷🇴 **Romanian**: [ro.icoffio.com](https://ro.icoffio.com)
- 🇨🇿 **Czech**: [cs.icoffio.com](https://cs.icoffio.com)

## 🎯 **Project Overview**

Modern, multi-language technology news platform built with **Next.js 14**, **TypeScript**, and **Tailwind CSS**. Connected to **WordPress Headless CMS** for content management with automatic language detection and SEO optimization.

### ✨ **Features**
- **5-Language Support** with automatic browser detection
- **Headless WordPress** integration via GraphQL
- **Modern responsive design** inspired by top tech media sites
- **SEO optimized** with meta tags, Open Graph, and sitemaps
- **Performance monitoring** with Web Vitals
- **One-click deployment** to Vercel

---

## 🚀 **Quick Start**

### **Local Development**
```bash
# Clone repository
git clone https://github.com/your-username/icoffio-front.git
cd icoffio-front

# Install dependencies  
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your settings

# Start development server
npm run dev
```

### **Deploy to Production**
```bash
# Deploy to Vercel (recommended)
vercel

# Or connect GitHub to Vercel for auto-deployment
```

---

## 🌐 **Multi-language Structure**

### **URL Structure**
- `icoffio.com/en/` - English (default)
- `icoffio.com/pl/` - Polish
- `icoffio.com/de/` - German  
- `icoffio.com/ro/` - Romanian
- `icoffio.com/cs/` - Czech

### **Automatic Features**
- **Browser language detection** → Auto-redirect to appropriate language
- **Language switcher** in navigation header
- **SEO tags per language** (meta, Open Graph, hreflang)
- **Localized content** while keeping navigation in English

---

## 📊 **Content Management**

### **WordPress Integration**
- **Endpoint**: `https://icoffio.com/graphql`
- **Categories**: AI, Apple, Games, Tech, News, **Digital** (new!)
- **Auto-revalidation** via webhooks

### **Adding Content**
```bash
# Seed sample content to WordPress
WP_BASE=https://icoffio.com \
WP_USER=admin \
WP_APP_PASS="your-password" \
npm run seed

# Add Digital category content
npm run seed-new
```

### **Automatic Updates**
Set up WordPress webhooks to trigger revalidation:
```
POST https://your-domain.com/api/revalidate?secret=TOKEN&path=/
```

---

## 🔧 **Development**

### **Tech Stack**
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: WordPress (Headless), WPGraphQL
- **Deployment**: Vercel
- **Languages**: EN, PL, DE, RO, CS

### **Project Structure**
```
icoffio-front/
├── app/
│   ├── [locale]/          # Language-specific routes
│   ├── api/revalidate/    # ISR webhook endpoint
│   └── sitemap.ts         # SEO sitemap
├── components/            # Reusable UI components  
├── lib/                   # Data fetching & utilities
├── scripts/               # WordPress seeding scripts
└── middleware.ts          # Language detection & routing
```

### **Key Commands**
```bash
npm run dev          # Start development server
npm run build        # Production build
npm run seed         # Seed WordPress content
npm run seed-new     # Add Digital category content
```

---

## 🌍 **Deployment Guide**

### **Vercel Setup (Recommended)**

1. **Connect GitHub Repository**
   ```bash
   # Push to GitHub
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/icoffio-front.git
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Set environment variables:
     ```
     NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
     NEXT_PUBLIC_WP_ENDPOINT=https://icoffio.com/graphql
     REVALIDATE_TOKEN=your-secure-token
     ```

3. **Configure Custom Domains**
   - Main: `icoffio.com` → English
   - Subdomains: `pl.icoffio.com`, `de.icoffio.com`, etc.

### **Auto-deployment**
- **Push to main branch** → Automatic deployment
- **Pull requests** → Preview deployments  
- **Environment branches** → Staging deployments

---

## 📈 **SEO & Performance**

### **SEO Features**
- Dynamic meta tags per language and page
- Open Graph images for social sharing
- Twitter Cards support
- XML sitemap generation
- Canonical URLs with hreflang
- Robots.txt optimization

### **Performance**
- **Bundle size**: <100KB per page
- **Web Vitals** monitoring
- **Image optimization** with Next.js
- **Static generation** with ISR
- **CDN distribution** via Vercel

---

## 🔄 **Making Updates**

### **Content Updates**
1. **WordPress Admin** → Add/edit posts → Auto-revalidation
2. **Manual revalidation**: 
   ```bash
   curl -X POST "https://your-domain.com/api/revalidate?secret=TOKEN&path=/"
   ```

### **Code Updates**
1. **Make changes locally**
2. **Test with** `npm run dev`
3. **Push to GitHub** → Auto-deployment
4. **Verify on staging** → Promote to production

### **Adding Languages**
1. Update `next.config.mjs` locales
2. Add translations in `lib/i18n.ts`
3. Create subdomain in Vercel
4. Deploy changes

---

## 🛠️ **Environment Variables**

### **Required Variables**
```bash
# Public (client-side)
NEXT_PUBLIC_SITE_URL=https://icoffio.com
NEXT_PUBLIC_WP_ENDPOINT=https://icoffio.com/graphql

# Private (server-side)  
REVALIDATE_TOKEN=your-secure-token-here

# WordPress seeding (development only)
WP_BASE=https://icoffio.com
WP_USER=admin
WP_APP_PASS="your-wordpress-app-password"
```

---

## 📞 **Support & Maintenance**

### **Monitoring**
- **Vercel Analytics** for performance
- **Web Vitals** in browser console
- **Error tracking** via Vercel
- **Uptime monitoring** recommended

### **Common Tasks**
- **Update dependencies**: `npm update`
- **Check build**: `npm run build`  
- **Clear cache**: Redeploy on Vercel
- **Database backup**: WordPress export

---

## 🎉 **Production Ready!**

**All systems operational:**
- ✅ Multi-language support (5 languages)
- ✅ Modern responsive design  
- ✅ SEO optimization
- ✅ Performance monitoring
- ✅ WordPress integration  
- ✅ GitHub deployment ready
- ✅ Digital category added

**Ready for launch!** 🚀

---

*Built with ❤️ using Next.js, TypeScript, and modern web technologies.*