import Link from "next/link";
import { ArrowRight, MapPin, TrendingUp, ShieldCheck, Zap, Activity, Building, BarChart3, CheckCircle2 } from "lucide-react";

export default function ClientLandingPage() {
  const featuredProjects = [
    {
      id: "aura-symphony",
      name: "Aura Symphony Residency",
      location: "Financial District",
      price: "From ₹2.5 Cr",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
      description: "Ultra-luxury 3 & 4 BHK apartments with panoramic views and world-class amenities in the heart of the IT hub.",
      configs: ["3, 4 BHK", "Under Construction"],
      status: "RERA Approved"
    },
    {
      id: "neopolis-horizon",
      name: "Neopolis Horizon Towers",
      location: "Kokapet Neopolis",
      price: "From ₹1.8 Cr",
      image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
      description: "High-density commercial and residential high-rises connected directly to Neopolis SEZ & ORR Exit 1.",
      configs: ["2, 3 BHK", "Newly Launched"],
      status: "HMDA Approved"
    },
    {
      id: "pharma-city-meadows",
      name: "Pharma City Eco Meadows",
      location: "Shamshabad Belt",
      price: "From ₹45 Lakhs",
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
      description: "Gated plotting community adjacent to the Srisailam Highway growth corridor and airport expansion zone.",
      configs: ["Plots (200-500 sq.yds)", "Ready for Reg."],
      status: "DTCP Approved"
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative w-full min-h-[85vh] flex items-center justify-center gradient-hero overflow-hidden pt-24 pb-16">
        <div className="absolute inset-0 pattern-grid opacity-20 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-accent/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary-light/40 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 container mx-auto px-4 flex flex-col items-center text-center animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/15 bg-white/10 mb-8 backdrop-blur-md animate-fade-in-up stagger-1">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse-glow" />
            <span className="text-xs font-semibold uppercase tracking-wider text-accent-cyan">
              Hyderabad Real Estate Intelligence
            </span>
          </div>

          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight mb-6 max-w-4xl animate-fade-in-up stagger-2">
            AI-Powered Real Estate <br />
            <span className="text-gradient-accent">Investment Research</span>
          </h1>

          <p className="font-sans text-lg md:text-xl text-white/80 max-w-2xl mb-10 leading-relaxed animate-fade-in-up stagger-3">
            Personalized corridor recommendations for Hyderabad's fastest-growing micro-markets. Analyze budgets, investment horizons, and local infrastructure developments in seconds.
          </p>

          <div className="glass-panel p-6 md:p-8 rounded-[16px] shadow-luxury max-w-lg w-full mb-16 animate-fade-in-up stagger-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/research" className="btn-primary w-full sm:w-auto">
                Start Your Analysis <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
              <Link href="/market" className="btn-secondary w-full sm:w-auto text-white border-white/20 hover:bg-white/10">
                Explore Corridors
              </Link>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12 w-full max-w-4xl">
            <div className="flex flex-col items-center animate-fade-in-up stagger-4">
              <div className="font-display text-4xl font-bold text-white mb-2">12+</div>
              <div className="text-sm font-medium text-white/60 uppercase tracking-widest">Corridors</div>
            </div>
            <div className="flex flex-col items-center animate-fade-in-up stagger-5">
              <div className="font-display text-4xl font-bold text-white mb-2">₹34,420 Cr</div>
              <div className="text-sm font-medium text-white/60 uppercase tracking-widest">Data Processed</div>
            </div>
            <div className="flex flex-col items-center animate-fade-in-up stagger-6">
              <div className="font-display text-4xl font-bold text-white mb-2">100%</div>
              <div className="text-sm font-medium text-white/60 uppercase tracking-widest">AI-Powered</div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Urban Ventures */}
      <section className="py-16 md:py-24 bg-surface relative z-20">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h2 className="section-header font-display text-3xl md:text-4xl font-bold text-text-primary pl-4">Why Urban Ventures</h2>
            <p className="font-sans text-text-secondary mt-4 max-w-2xl pl-4">Data-driven insights that empower you to make confident real estate investments in Hyderabad.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card-premium p-8 animate-fade-in-up stagger-1">
              <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-display text-xl font-bold text-text-primary mb-3">Instant Analysis</h3>
              <p className="font-sans text-text-secondary leading-relaxed">
                Get comprehensive insights on properties, infrastructure, and ROI projections in seconds, not days.
              </p>
            </div>
            <div className="card-premium p-8 animate-fade-in-up stagger-2">
              <div className="w-12 h-12 rounded-full bg-success-light flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
              <h3 className="font-display text-xl font-bold text-text-primary mb-3">Growth Forecasting</h3>
              <p className="font-sans text-text-secondary leading-relaxed">
                Proprietary AI models predict capital appreciation based on upcoming infrastructure and zoning changes.
              </p>
            </div>
            <div className="card-premium p-8 animate-fade-in-up stagger-3">
              <div className="w-12 h-12 rounded-full bg-warning-light flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6 text-warning" />
              </div>
              <h3 className="font-display text-xl font-bold text-text-primary mb-3">Verified Data</h3>
              <p className="font-sans text-text-secondary leading-relaxed">
                Every data point is cross-referenced with official RERA records, HMDA master plans, and market transactions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Corridor highlights */}
      <section className="py-16 md:py-24 bg-surface-dim overflow-hidden">
        <div className="container mx-auto px-4 mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="section-header font-display text-3xl md:text-4xl font-bold text-text-primary pl-4">Prime Corridors</h2>
              <p className="font-sans text-text-secondary mt-4 max-w-2xl pl-4">Discover the high-growth zones shaping the future of Hyderabad.</p>
            </div>
            <Link href="/market" className="text-accent font-medium hover:underline flex items-center">
              View All Corridors <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Carousel container */}
        <div className="flex overflow-x-auto gap-6 px-4 md:px-8 pb-8 snap-x hide-scrollbar max-w-[100vw]">
          {[
            { name: "Neopolis & Kokapet", growth: "+24%", dir: "West", desc: "The next financial district with premium skyscrapers." },
            { name: "Tellapur - Nallagandla", growth: "+18%", dir: "West", desc: "Luxury residential hub favored by IT executives." },
            { name: "Airport Corridor", growth: "+32%", dir: "South", desc: "Rapidly expanding logistics and aerospace ecosystem." },
            { name: "Uppal - Pocharam", growth: "+15%", dir: "East", desc: "Emerging IT destination with excellent metro connectivity." }
          ].map((corridor, idx) => (
            <div key={idx} className="card-interactive min-w-[300px] md:min-w-[350px] p-6 snap-start">
              <div className="flex justify-between items-start mb-4">
                <span className="badge-hot">{corridor.growth} Growth</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">{corridor.dir}</span>
              </div>
              <h3 className="font-display text-xl font-bold text-text-primary mb-2">{corridor.name}</h3>
              <p className="font-sans text-text-secondary text-sm mb-6">{corridor.desc}</p>
              <Link href={`/market`} className="text-sm font-medium text-primary hover:text-accent flex items-center transition-colors">
                Explore <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Projects */}
      <section className="py-16 md:py-24 bg-surface">
        <div className="container mx-auto px-4">
          <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="section-header font-display text-3xl md:text-4xl font-bold text-text-primary pl-4">Featured Projects</h2>
              <p className="font-sans text-text-secondary mt-4 max-w-2xl pl-4">Handpicked developments offering exceptional value and growth potential.</p>
            </div>
            <Link href="/projects" className="text-accent font-medium hover:underline flex items-center">
              View All Projects <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProjects.map((project) => (
              <div key={project.id} className="card-premium overflow-hidden group flex flex-col justify-between">
                <div>
                  <div className="relative h-60 overflow-hidden bg-slate-900">
                    <img 
                      src={project.image} 
                      alt={project.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-95"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    
                    <div className="absolute top-3 left-3 z-10">
                      <span className="bg-emerald-500/90 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                        <CheckCircle2 className="w-3 h-3" /> {project.status}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 z-10">
                      <span className="bg-[#0B1D3A]/90 backdrop-blur-md text-white text-xs font-bold px-3.5 py-1.2 rounded-full border border-white/20 shadow-md">
                        {project.price}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 space-y-3">
                    <div className="flex items-center gap-1.5 text-text-tertiary text-xs font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-accent" />
                      <span>{project.location}</span>
                    </div>
                    <h3 className="font-display text-xl font-bold text-text-primary group-hover:text-accent transition-colors">
                      {project.name}
                    </h3>
                    <p className="font-sans text-text-secondary text-xs leading-relaxed line-clamp-2">
                      {project.description}
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-2 flex items-center justify-between border-t border-slate-100 mt-2">
                  <div className="flex gap-1.5">
                    {project.configs.map((cfg, i) => (
                      <span key={i} className="px-2.5 py-0.5 bg-[#F0EEFA] text-[#5B4FE0] text-[10px] font-bold rounded-full">
                        {cfg}
                      </span>
                    ))}
                  </div>
                  <Link href={`/projects`} className="text-xs font-bold text-[#5B4FE0] hover:text-primary flex items-center gap-1">
                    Details <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Market Pulse */}
      <section className="py-16 md:py-24 bg-[#0B1D3A] text-white relative overflow-hidden">
        <div className="absolute inset-0 pattern-dots opacity-10 pointer-events-none"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-white">Hyderabad Market Pulse</h2>
            <p className="font-sans text-white/70 max-w-2xl mx-auto">Real-time indicators tracking the city's real estate trajectory for this quarter.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/5 border border-white/10 backdrop-blur-md p-6 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-accent-cyan/20 text-accent-cyan flex items-center justify-center mb-4">
                <Activity className="w-5 h-5" />
              </div>
              <div className="text-3xl md:text-4xl font-display font-bold text-white mb-1">14,250</div>
              <div className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-3">Units Launched (Q3)</div>
              <div className="flex items-center text-emerald-400 text-xs font-bold">
                <TrendingUp className="w-4 h-4 mr-1" /> +12.5% YoY
              </div>
            </div>
            
            <div className="bg-white/5 border border-white/10 backdrop-blur-md p-6 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center mb-4">
                <Building className="w-5 h-5" />
              </div>
              <div className="text-3xl md:text-4xl font-display font-bold text-white mb-1">₹7,200</div>
              <div className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-3">Avg. Price / Sq.Ft</div>
              <div className="flex items-center text-emerald-400 text-xs font-bold">
                <TrendingUp className="w-4 h-4 mr-1" /> +8.2% YoY
              </div>
            </div>
            
            <div className="bg-white/5 border border-white/10 backdrop-blur-md p-6 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center mb-4">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="text-3xl md:text-4xl font-display font-bold text-white mb-1">3.2M</div>
              <div className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-3">Commercial Leasing (Sq.Ft)</div>
              <div className="flex items-center text-emerald-400 text-xs font-bold">
                <TrendingUp className="w-4 h-4 mr-1" /> +15.4% YoY
              </div>
            </div>
            
            <div className="bg-white/5 border border-white/10 backdrop-blur-md p-6 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-purple-400/20 text-purple-300 flex items-center justify-center mb-4">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="text-3xl md:text-4xl font-display font-bold text-white mb-1">42</div>
              <div className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-3">Active Infra Projects</div>
              <div className="text-white/70 text-xs font-bold">
                Worth ₹45k+ Cr
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
