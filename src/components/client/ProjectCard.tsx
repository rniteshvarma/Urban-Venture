import Link from "next/link";
import React from "react";

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
  const formatPrice = (min: number, max: number) => {
    const minText = min < 100 ? `${min}L` : `${(min / 100).toFixed(1)}Cr`;
    const maxText = max < 100 ? `${max}L` : `${(max / 100).toFixed(1)}Cr`;
    return `₹${minText} - ₹${maxText}`;
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "LOW":
        return "bg-green-50 text-green-700 border-green-200";
      case "MEDIUM":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "HIGH":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  // Safe image path fallback
  const imgUrl = (project.imageUrls && project.imageUrls.length > 0) 
    ? project.imageUrls[0] 
    : "/placeholder-project.jpg";

  return (
    <div className="bg-surface border border-luxury rounded-card shadow-sm hover:shadow-luxury transition-all duration-300 flex flex-col overflow-hidden w-80 flex-shrink-0">
      {/* Project Image & Status overlay */}
      <div className="relative h-48 bg-primary-light flex items-center justify-center text-accent/50 text-xs tracking-wider uppercase font-semibold">
        {imgUrl.startsWith("/") && imgUrl !== "/placeholder-project.jpg" ? (
          <img 
            src={imgUrl} 
            alt={project.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback
              (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&q=80`;
            }}
          />
        ) : (
          <img 
            src={`https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&q=80`} 
            alt={project.name}
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Status Badge */}
        <span className="absolute top-3 left-3 bg-primary/95 text-white text-[9px] font-bold px-2 py-0.5 rounded-tag border border-accent/20 uppercase tracking-widest">
          {project.status.replace("_", " ")}
        </span>

        {/* Property Type Badge */}
        <span className="absolute bottom-3 right-3 bg-surface/90 text-text-primary text-[10px] font-semibold px-2 py-0.5 rounded-tag border border-luxury uppercase tracking-wider">
          {project.propertyType}
        </span>
      </div>

      {/* Details */}
      <div className="p-5 flex-grow flex flex-col justify-between">
        <div>
          {/* Corridor Tag */}
          <div className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1">
            {project.corridor}
          </div>
          
          <h3 className="font-display text-lg font-bold text-primary mb-1 line-clamp-1">
            {project.name}
          </h3>
          
          <p className="text-xs text-text-secondary mb-3">
            by {project.developer}
          </p>

          <div className="flex items-center gap-2 mb-4">
            <span className={`text-[10px] font-semibold uppercase tracking-wider border px-2 py-0.5 rounded-tag ${getRiskColor(project.riskLevel)}`}>
              {project.riskLevel} RISK
            </span>
            <span className="text-[10px] text-text-secondary">
              {project.minHorizonYears}-{project.maxHorizonYears} Yrs Horizon
            </span>
          </div>
        </div>

        <div className="border-t border-luxury pt-4 mt-2 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-text-secondary uppercase tracking-wider">Est. Budget</span>
            <span className="text-sm font-bold text-primary">{formatPrice(project.minBudgetLakhs, project.maxBudgetLakhs)}</span>
          </div>

          <Link
            href={`/projects/${project.id}`}
            className="text-xs font-bold text-primary hover:text-accent border-b border-primary hover:border-accent pb-0.5 uppercase tracking-wider transition-all"
          >
            Details →
          </Link>
        </div>
      </div>
    </div>
  );
}
