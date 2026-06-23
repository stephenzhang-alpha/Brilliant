import type { StrandId } from '../types';
import { lessons } from './index';

export interface StrandMeta {
  id: StrandId;
  title: string;
  blurb: string;
  accent: string;
  row: number;
}

export const strands: StrandMeta[] = [
  { id: 'core', title: 'Core Equations', blurb: 'Variables to inequalities', accent: '#818cf8', row: 0 },
  { id: 'patterns', title: 'Patterns & Functions', blurb: 'Rules and machines', accent: '#f59e0b', row: 1 },
  { id: 'visual', title: 'Visual & Geometry', blurb: 'Area models', accent: '#10b981', row: 2 },
  { id: 'physics', title: 'Real-World & Motion', blurb: 'Rates, lines, systems', accent: '#f472b6', row: 3 },
];

export const strandMap: Record<StrandId, StrandMeta> = Object.fromEntries(
  strands.map((s) => [s.id, s]),
) as Record<StrandId, StrandMeta>;

/**
 * Cross-strand connections that enrich the map beyond strict prerequisites.
 * These are drawn as dashed "see also" links and are NOT required to unlock.
 */
export const crossLinks: Array<[string, string]> = [
  ['pattern-rules', 'variables-and-expressions'],
  ['area-model-tiles', 'variables-and-expressions'],
  ['distributive-as-area', 'two-step-equations'],
  ['function-machines', 'linear-functions'],
  ['two-step-equations', 'linear-functions'],
];

export interface MapEdge {
  from: string;
  to: string;
  kind: 'prereq' | 'cross';
}

/** Prerequisite edges plus cross-links, de-duplicated, for rendering the DAG. */
export function getMapEdges(): MapEdge[] {
  const edges: MapEdge[] = [];
  const seen = new Set<string>();
  for (const lesson of lessons) {
    for (const pre of lesson.prerequisiteIds) {
      const key = `${pre}->${lesson.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({ from: pre, to: lesson.id, kind: 'prereq' });
      }
    }
  }
  for (const [from, to] of crossLinks) {
    const key = `${from}=>${to}`;
    if (!seen.has(key)) {
      seen.add(key);
      edges.push({ from, to, kind: 'cross' });
    }
  }
  return edges;
}

export const entryPoints = (): string[] => lessons.filter((l) => l.entryPoint).map((l) => l.id);
