import Link from "next/link";
import React from "react";
import { MapPin, ShieldCheck } from "lucide-react";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    developer: string;
    corridor: string;
    city: string;
    minBudgetLakhs: number;
    maxBudgetLakhs: number;
    minHorizonYears: number;
    maxHorizonYears: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    propertyType: string;
    infraHighlights: string[];
    imageUrls: string[];
    status: "ACTIVE" | "SOLD_OUT" | "UPCOMING" | "ARCHIVED";
  };
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const formatPrice = (min: number) => {
    return min < 100 ? `₹${min}L` : `₹${(min / 100).toFixed(1)}Cr`;
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "LOW":
        return "bg-success/10 text-success border-success/20";
      case "MEDIUM":
        return "bg-warning/10 text-warning border-warning/20";
      case "HIGH":
        return "bg-danger/10 text-danger border-danger/20";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  // Safe image path fallback
  const imgUrl = (project.imageUrls && project.imageUrls.length > 0) 
    ? project.imageUrls[0] 
    : "/placeholder-project.jpg";

  return (
    <div className="card-premium h-full flex flex-col group overflow-hidden p-0 border-0 shadow-sm hover:shadow-card">
      {/* Project Image & Status overlay */}
      <div className="relative aspect-video bg-primary-light flex items-center justify-center overflow-hidden">
        {imgUrl.startsWith("/") && imgUrl !== "/placeholder-project.jpg" ? (
          <img 
            src={imgUrl} 
            alt={project.name}
            className="w-full h-full object-cover img-hover-zoom"
            onError={(e) => {
              // Fallback
              (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80`;
            }}
          />
        ) : (
          <img 
            src={`https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80`} 
            alt={project.name}
            className="w-full h-full object-cover img-hover-zoom"
          />
        )}
        
        {/* Status Badge */}
        <span className="absolute top-3 left-3 bg-surface/90 text-text-primary text-[10px] font-bold px-2.5 py-1 rounded-[6px] border border-gray-200 uppercase tracking-widest shadow-sm z-10">
          {project.status.replace("_", " ")}
        </span>

        {/* Verification / RERA Badge */}
        {project.riskLevel === "LOW" && (
          <span className="absolute top-3 right-3 badge-verified flex items-center gap-1 z-10 shadow-sm">
            <ShieldCheck size={10} /> RERA verified
          </span>
        )}

        {/* Price Tag (badge-premium) */}
        <span className="absolute bottom-3 right-3 badge-premium shadow-sm z-10 text-sm">
          From {formatPrice(project.minBudgetLakhs)}
        </span>
      </div>

      {/* Details */}
      <div className="p-5 flex-grow flex flex-col justify-between">
        <div>
          {/* Corridor Tag */}
          <div className="text-[10px] font-bold text-accent uppercase tracking-wider mb-2 flex items-center gap-1">
            <MapPin size={12} className="text-accent" />
            {project.corridor}
          </div>
          
          <h3 className="font-display text-lg font-bold text-text-primary mb-1 line-clamp-1 group-hover:text-accent transition-colors">
            {project.name}
          </h3>
          
          <p className="text-xs text-text-secondary mb-4">
            by <span className="font-semibold text-text-primary">{project.developer}</span>
          </p>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider border ${getRiskColor(project.riskLevel)}`}>
              {project.riskLevel} RISK
            </span>
            <span className="px-2 py-0.5 rounded-[4px] bg-surface-dim border border-gray-100 text-text-secondary text-[9px] font-bold uppercase tracking-wider">
              {project.propertyType}
            </span>
            <span className="text-[10px] text-text-secondary font-medium ml-auto">
              {project.minHorizonYears}-{project.maxHorizonYears} Yrs Hold
            </span>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 mt-2">
          <Link
            href={`/projects/${project.id}`}
            className="btn-primary w-full text-center text-xs py-2"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}
