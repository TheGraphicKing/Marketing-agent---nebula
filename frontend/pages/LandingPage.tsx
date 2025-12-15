import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowRight, 
  Play,
  CheckCircle2,
  BarChart3,
  Target,
  Users,
  Zap,
  Globe,
  TrendingUp,
  Shield,
  Clock,
  Award,
  MousePointer2,
  Layers,
  PieChart
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState<{[key: string]: boolean}>({});
  const observerRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );

    const currentRefs = observerRefs.current;
    Object.keys(currentRefs).forEach((key) => {
      const ref = currentRefs[key];
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const brands = [
    "Google", "Microsoft", "Spotify", "Slack", "Notion", "Figma"
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden antialiased">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrollY > 50 ? 'bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm' : ''}`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold tracking-tight">Nebulaa</span>
            </div>
            
            <div className="hidden md:flex items-center gap-10">
              <a href="#features" className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium">Features</a>
              <a href="#how-it-works" className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium">How it Works</a>
              <a href="#pricing" className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium">Pricing</a>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/login')}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
              >
                Sign in
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-full transition-all duration-300 shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-violet-50/50 via-white to-white"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-br from-violet-100/40 via-indigo-100/30 to-transparent rounded-full blur-3xl"></div>
        
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-50 border border-violet-100 rounded-full mb-8">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-violet-700">Now with GPT-4 Integration</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
              Marketing that
              <span className="relative mx-3">
                <span className="relative z-10 bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">thinks</span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none">
                  <path d="M2 8.5C50 2 150 2 198 8.5" stroke="url(#gradient)" strokeWidth="4" strokeLinecap="round"/>
                  <defs>
                    <linearGradient id="gradient" x1="0" y1="0" x2="200" y2="0">
                      <stop stopColor="#7c3aed"/>
                      <stop offset="1" stopColor="#4f46e5"/>
                    </linearGradient>
                  </defs>
                </svg>
              </span>
              for itself
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed mb-10 max-w-2xl mx-auto">
              Nebulaa uses advanced AI to automate your marketing campaigns, analyze competitors, and find the perfect influencers — all from one beautiful dashboard.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <button 
                onClick={() => navigate('/login')}
                className="group w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-full transition-all duration-300 shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 flex items-center justify-center gap-2"
              >
                Start free trial
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="group w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-full border border-slate-200 transition-all duration-300 flex items-center justify-center gap-2">
                <Play className="w-4 h-4 text-violet-600" />
                Watch demo
              </button>
            </div>

            {/* Social proof */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden">
                    <img 
                      src={`https://i.pravatar.cc/100?img=${i + 10}`} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                <div className="w-10 h-10 rounded-full border-2 border-white bg-violet-600 flex items-center justify-center text-white text-xs font-medium">
                  +2k
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                    </svg>
                  ))}
                </div>
                <span className="font-medium text-slate-900">4.9/5</span>
                <span>from 2,000+ reviews</span>
              </div>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div 
            className="mt-20 relative"
            style={{ transform: `translateY(${scrollY * 0.05}px)` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none"></div>
            <div className="relative bg-slate-900 rounded-2xl p-2 shadow-2xl shadow-slate-900/20 border border-slate-800 mx-auto max-w-5xl">
              <div className="flex gap-1.5 mb-2 px-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              </div>
              <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl overflow-hidden aspect-[16/9]">
                <div className="w-full h-full bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-6">
                  {/* Mock Dashboard */}
                  <div className="grid grid-cols-12 gap-4 h-full">
                    {/* Sidebar */}
                    <div className="col-span-2 bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                      <div className="w-8 h-8 bg-violet-600 rounded-lg mb-6"></div>
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={`h-8 rounded-lg mb-2 ${i === 0 ? 'bg-violet-100' : 'bg-slate-50'}`}></div>
                      ))}
                    </div>
                    {/* Main Content */}
                    <div className="col-span-10 space-y-4">
                      <div className="grid grid-cols-4 gap-4">
                        {[
                          { label: 'Total Reach', value: '2.4M', color: 'text-violet-600' },
                          { label: 'Engagement', value: '18.2%', color: 'text-indigo-600' },
                          { label: 'Campaigns', value: '24', color: 'text-blue-600' },
                          { label: 'Revenue', value: '$48K', color: 'text-emerald-600' },
                        ].map((stat, i) => (
                          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">{stat.label}</div>
                            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-4 flex-1">
                        <div className="col-span-2 bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                          <div className="h-4 w-32 bg-slate-100 rounded mb-4"></div>
                          <div className="h-32 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-lg flex items-end justify-around px-4 pb-4">
                            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                              <div key={i} className="w-8 bg-gradient-to-t from-violet-500 to-indigo-500 rounded-t" style={{ height: `${h}%` }}></div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                          <div className="h-4 w-24 bg-slate-100 rounded mb-4"></div>
                          <div className="space-y-3">
                            {[...Array(4)].map((_, i) => (
                              <div key={i} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100"></div>
                                <div className="flex-1">
                                  <div className="h-3 w-20 bg-slate-100 rounded mb-1"></div>
                                  <div className="h-2 w-16 bg-slate-50 rounded"></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-16 border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-sm text-slate-500 font-medium mb-8">TRUSTED BY LEADING COMPANIES WORLDWIDE</p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {brands.map((brand, i) => (
              <div key={i} className="text-2xl font-semibold text-slate-300 hover:text-slate-400 transition-colors cursor-default">
                {brand}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div 
            ref={(el) => (observerRefs.current['features'] = el)}
            id="features-section"
            className={`text-center mb-16 transition-all duration-700 ${isVisible['features-section'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-50 border border-violet-100 rounded-full mb-6">
              <Layers className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-medium text-violet-700">Features</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
              Everything you need to scale
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Powerful tools designed to help you create, manage, and optimize your marketing with unprecedented efficiency.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Target className="w-6 h-6" />,
                title: "Smart Campaigns",
                description: "AI-powered campaign creation that adapts to your audience in real-time.",
                bgColor: "bg-violet-50",
                iconColor: "text-violet-600"
              },
              {
                icon: <BarChart3 className="w-6 h-6" />,
                title: "Advanced Analytics",
                description: "Deep insights into performance with actionable recommendations.",
                bgColor: "bg-indigo-50",
                iconColor: "text-indigo-600"
              },
              {
                icon: <Users className="w-6 h-6" />,
                title: "Influencer Matching",
                description: "Find creators who align perfectly with your brand values.",
                bgColor: "bg-blue-50",
                iconColor: "text-blue-600"
              },
              {
                icon: <TrendingUp className="w-6 h-6" />,
                title: "Competitor Intel",
                description: "Stay ahead with real-time analysis of competitor strategies.",
                bgColor: "bg-cyan-50",
                iconColor: "text-cyan-600"
              },
              {
                icon: <Globe className="w-6 h-6" />,
                title: "Multi-Platform",
                description: "Manage all channels from Instagram to TikTok in one place.",
                bgColor: "bg-teal-50",
                iconColor: "text-teal-600"
              },
              {
                icon: <Zap className="w-6 h-6" />,
                title: "Instant Publishing",
                description: "Schedule and publish content across all platforms instantly.",
                bgColor: "bg-amber-50",
                iconColor: "text-amber-600"
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="group p-8 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-xl hover:shadow-slate-100 transition-all duration-500"
              >
                <div className={`w-12 h-12 ${feature.bgColor} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <div className={feature.iconColor}>{feature.icon}</div>
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 md:py-32 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full mb-6 shadow-sm">
              <MousePointer2 className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">How it works</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
              Simple to start, powerful to scale
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Get up and running in minutes, not days. Our intuitive platform grows with your business.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Connect your accounts",
                description: "Link your social media profiles and marketing tools in just a few clicks."
              },
              {
                step: "02",
                title: "Set your goals",
                description: "Tell us what you want to achieve and our AI will create a personalized strategy."
              },
              {
                step: "03",
                title: "Watch it grow",
                description: "Sit back as Nebulaa optimizes your campaigns and delivers results."
              }
            ].map((item, index) => (
              <div key={index} className="relative">
                {index < 2 && (
                  <div className="hidden md:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-slate-300 to-transparent -translate-x-1/2 z-0"></div>
                )}
                <div className="relative bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                  <div className="text-5xl font-bold text-slate-100 mb-4">{item.step}</div>
                  <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-slate-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 md:py-32 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
                Results that speak for themselves
              </h2>
              <p className="text-lg text-slate-400 mb-8">
                Our customers see measurable improvements within the first month of using Nebulaa.
              </p>
              <div className="space-y-4">
                {[
                  "Average 340% increase in engagement",
                  "Save 20+ hours per week on marketing",
                  "10x faster campaign deployment"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {[
                { value: "10K+", label: "Active Users", icon: <Users className="w-5 h-5" /> },
                { value: "500M+", label: "Impressions", icon: <TrendingUp className="w-5 h-5" /> },
                { value: "99.9%", label: "Uptime", icon: <Shield className="w-5 h-5" /> },
                { value: "24/7", label: "Support", icon: <Clock className="w-5 h-5" /> }
              ].map((stat, i) => (
                <div key={i} className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                  <div className="text-slate-400 mb-2">{stat.icon}</div>
                  <div className="text-3xl md:text-4xl font-bold mb-1">{stat.value}</div>
                  <div className="text-slate-400 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-full mb-8">
            <Award className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">Customer Story</span>
          </div>
          <blockquote className="text-2xl md:text-4xl font-medium leading-relaxed mb-8">
            "Nebulaa transformed how we approach marketing. We've seen a 
            <span className="text-violet-600"> 340% increase in engagement</span> 
            {" "}and saved countless hours on campaign management."
          </blockquote>
          <div className="flex items-center justify-center gap-4">
            <img 
              src="https://i.pravatar.cc/100?img=32" 
              alt="Sarah Chen" 
              className="w-14 h-14 rounded-full object-cover"
            />
            <div className="text-left">
              <div className="font-semibold">Sarah Chen</div>
              <div className="text-slate-500 text-sm">CMO at TechFlow</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 md:py-32 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full mb-6 shadow-sm">
              <PieChart className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Pricing</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Start free and upgrade as you grow. No hidden fees, no surprises.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
              <div className="text-sm font-medium text-slate-500 mb-2">Starter</div>
              <div className="text-4xl font-bold mb-1">Free</div>
              <div className="text-slate-500 text-sm mb-6">Forever free</div>
              <ul className="space-y-3 mb-8">
                {['1 social account', '5 campaigns/month', 'Basic analytics', 'Email support'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-slate-600">{item}</span>
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
              >
                Sign up free
              </button>
            </div>

            {/* Pro */}
            <div className="bg-slate-900 rounded-2xl p-8 text-white relative shadow-xl">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-violet-600 rounded-full text-xs font-medium">
                Most popular
              </div>
              <div className="text-sm font-medium text-slate-400 mb-2">Pro</div>
              <div className="text-4xl font-bold mb-1">$49<span className="text-lg text-slate-400 font-normal">/mo</span></div>
              <div className="text-slate-400 text-sm mb-6">Billed annually</div>
              <ul className="space-y-3 mb-8">
                {['10 social accounts', 'Unlimited campaigns', 'Advanced analytics', 'Influencer discovery', 'Priority support'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />
                    <span className="text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-white hover:bg-slate-100 text-slate-900 font-medium rounded-xl transition-colors"
              >
                Start free trial
              </button>
            </div>

            {/* Enterprise */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
              <div className="text-sm font-medium text-slate-500 mb-2">Enterprise</div>
              <div className="text-4xl font-bold mb-1">Custom</div>
              <div className="text-slate-500 text-sm mb-6">For large teams</div>
              <ul className="space-y-3 mb-8">
                {['Unlimited everything', 'Custom integrations', 'Dedicated manager', 'SLA & compliance', 'White label'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-slate-600">{item}</span>
                  </li>
                ))}
              </ul>
              <button className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors">
                Contact sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Ready to transform your marketing?
          </h2>
          <p className="text-lg text-slate-600 mb-10">
            Join thousands of marketers who trust Nebulaa to grow their business.
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="group px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-full transition-all duration-300 shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 inline-flex items-center gap-2"
          >
            Sign up for free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-sm text-slate-500 mt-4">No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-semibold">Nebulaa</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-slate-600">
              <a href="#" className="hover:text-slate-900 transition-colors">Privacy</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Terms</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Contact</a>
            </div>
            <div className="text-slate-500 text-sm">
              © 2025 Nebulaa. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
