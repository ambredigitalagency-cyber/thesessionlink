import {
  Briefcase,
  Building2,
  Camera,
  Compass,
  Dumbbell,
  Flower2,
  GraduationCap,
  HeartHandshake,
  KeyRound,
  Music,
  Scissors,
  Shapes,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  dumbbell: Dumbbell,
  compass: Compass,
  "building-2": Building2,
  scissors: Scissors,
  sparkles: Sparkles,
  "flower-2": Flower2,
  music: Music,
  "graduation-cap": GraduationCap,
  camera: Camera,
  "heart-handshake": HeartHandshake,
  briefcase: Briefcase,
  "key-round": KeyRound,
  shapes: Shapes,
};

export function CategoryIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || Shapes;
  return <Icon className={className} aria-hidden />;
}
