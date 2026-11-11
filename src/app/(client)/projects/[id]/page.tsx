/**
 * Project page. The server loads the public view of the project and renders
 * the page with it, so the HTML already holds the name, prices, units, rating
 * and checks — for search engines and for a fast first paint. Listings that
 * aren't public (a seller's own draft, admin review) fall back to the browser
 * fetch, which knows who is signed in.
 */
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { siteUrl } from "@/lib/site";
import { ANONYMOUS, loadProjectDetail } from "@/lib/projects/detail";
import ProjectDetailView from "./ProjectDetailView";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await loadProjectDetail(id, ANONYMOUS).catch(() => null);
  if (!project && !(await prisma.project.count({ where: { id } }).catch(() => 1))) notFound();
  return (
    <ProjectDetailView
      id={id}
      // The same JSON shape the browser fetch returns (dates as strings).
      initialProject={project ? JSON.parse(JSON.stringify(project)) : null}
      pageUrl={`${siteUrl()}/projects/${id}`}
    />
  );
}
