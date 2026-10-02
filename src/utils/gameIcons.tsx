import React from 'react';
import {
  Boxes,
  Brush,
  Coins,
  Disc3,
  FoldVertical,
  LayoutGrid,
  Music4,
  Target,
  type LucideIcon,
} from 'lucide-react';
import type { GameIconName } from './gamesCatalog';
/**
 * Mapeo `GameIconName` -> icono lucide. Vive aparte de `gamesCatalog.ts`
 * para que el catálogo siga siendo un módulo puro, sin React.
 */
export const GAME_ICONS: Record<GameIconName, LucideIcon> = {
  coins: Coins,
  blocks: Boxes,
  marimba: Music4,
  target: Target,
  thread: Disc3,
  broom: Brush,
  paper: FoldVertical,
  trays: LayoutGrid,
};

interface GameIconProps {
  name: GameIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const GameIcon: React.FC<GameIconProps> = ({ name, size = 24, color, strokeWidth = 1.6 }) => {
  const Icon = GAME_ICONS[name];
  if (!Icon) return null;
  return <Icon size={size} color={color} strokeWidth={strokeWidth} aria-hidden="true" />;
};
