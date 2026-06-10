import Link from "next/link";

export default function ClientLandingPage() {
  return (
    <div className="relative flex-grow flex flex-col justify-center overflow-hidden py-20 px-4 sm:px-6 lg:px-8">
      {/* Subtle Panning Geometric Grid Background */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-50"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(15, 31, 61, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(15, 31, 61, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at center, black, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black, transparent 80%)",
        }}
      />
      
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full filter blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full filter blur-3xl pointer-events-none z-0" />

      <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-accent/20 bg-accent/5 mb-8 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-accent">
            Hyderabad Real Estate Intelligence
          </span>
        </div>

        {/* Hero Title */}
        <h1 className="font-display text-4xl sm:text-6xl font-bold text-primary tracking-tight leading-tight sm:leading-none mb-6">
          AI-Powered Real Estate <br />
          <span className="text-gold-gradient">Investment Research</span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl text-base sm:text-xl text-text-secondary leading-relaxed mb-10">
          Personalized corridor recommendations for Hyderabad's fastest-growing micro-markets. Analyze budgets, investment horizons, and local infrastructure developments in seconds.
        </p>

        {/* CTA */}
        <div className="mb-16">
          <Link
            href="/research"
            className="group inline-flex items-center justify-center px-8 py-4 text-sm font-semibold uppercase tracking-widest text-surface bg-primary hover:bg-primary-light transition-all rounded-[4px] shadow-luxury"
          >
            Start Your Analysis
            <span className="ml-2 group-hover:translate-x-1 transition-transform inline-block">→</span>
          </Link>
        </div>

        {/* Trust Indicators */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-8 border-t border-luxury pt-12 max-w-3xl">
          <div className="text-center px-4">
            <div className="font-display text-3xl font-bold text-primary mb-1">500+</div>
            <div className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Projects Analyzed
            </div>
          </div>
          <div className="text-center px-4 border-y sm:border-y-0 sm:border-x border-luxury py-4 sm:py-0">
            <div className="font-display text-3xl font-bold text-primary mb-1">15+</div>
            <div className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Micro-Markets mapped
            </div>
          </div>
          <div className="text-center px-4">
            <div className="font-display text-3xl font-bold text-primary mb-1">AI-Verified</div>
            <div className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Infrastructure Data
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
