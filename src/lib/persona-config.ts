/**
 * Keep PersonaConfig rows in step with PERSONA_META. Creates missing rows
 * only — admins may have edited existing ones, and those edits win.
 */
import prisma from "./prisma";
import { PERSONA_KEYS, PERSONA_META } from "./personas";

let ensured = false;

export async function ensurePersonaConfigs(): Promise<number> {
  if (ensured) return 0;
  const existing = new Set((await prisma.personaConfig.findMany({ select: { persona: true } })).map((r) => r.persona));
  const missing = PERSONA_KEYS.filter((k) => !existing.has(k));
  if (missing.length) {
    await prisma.personaConfig.createMany({
      data: missing.map((persona) => {
        const m = PERSONA_META[persona];
        return {
          persona,
          displayName: m.label,
          description: m.description,
          minBudgetLakhs: m.minBudgetLakhs,
          maxBudgetLakhs: m.maxBudgetLakhs,
          minHorizon: m.minHorizon,
          maxHorizon: m.maxHorizon,
          riskLevels: m.riskLevels,
          color: m.color,
          icon: m.icon,
          defaultProjects: [],
        };
      }),
      skipDuplicates: true,
    });
  }
  ensured = true;
  return missing.length;
}
