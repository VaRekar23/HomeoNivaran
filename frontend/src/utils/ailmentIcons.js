/**
 * Resolves a Lucide icon name to the actual icon component.
 * Used for dynamic icon rendering based on DB-stored icon names.
 *
 * Why not import all lucide-react?
 * That would import 1000+ icons and bloat the bundle.
 * Instead we whitelist the icons we support for ailments.
 */
import {
  HeartPulse, Heart, Activity, Brain, Eye, Ear,
  Wind, Thermometer, Droplets, Flame, Leaf, Bone,
  Shield, Sparkles, Scissors, Moon, Layers, Zap,
  Sun, Cloud, Smile, Frown, Baby, Users, Star,
  AlertCircle, CheckCircle2, Circle, Plus, Minus,
  ArrowUp, ArrowDown, Package, Pill, Stethoscope,
  Microscope, FlaskConical, Syringe, Bandage, Cross,
  Flower, Flower2, TreePine, Sprout, Wheat,
} from "lucide-react"

const ICON_MAP = {
  // Health & Body
  HeartPulse,
  Heart,
  Activity,
  Brain,
  Eye,
  Ear,
  Bone,
  Stethoscope,
  Microscope,
  Syringe,
  Bandage,
  Cross,
  Pill,
  FlaskConical,

  // Nature & Elements
  Wind,
  Thermometer,
  Droplets,
  Flame,
  Leaf,
  Sun,
  Cloud,
  Flower,
  Flower2,
  TreePine,
  Sprout,
  Wheat,

  // Misc
  Shield,
  Sparkles,
  Scissors,
  Moon,
  Layers,
  Zap,
  Smile,
  Frown,
  Baby,
  Users,
  Star,
  AlertCircle,
  CheckCircle2,
  Circle,
  Plus,
  Minus,
  ArrowUp,
  ArrowDown,
  Package,
}

/**
 * Get a Lucide icon component by name.
 * Falls back to HeartPulse if not found.
 */
export const getAilmentIcon = (iconName) => {
  if (!iconName) return HeartPulse
  return ICON_MAP[iconName] || HeartPulse
}

/**
 * Check if an icon name is valid (exists in our whitelist).
 */
export const isValidIconName = (iconName) => {
  return !!ICON_MAP[iconName]
}

/**
 * Get all available icon names for the doctor to choose from.
 */
export const getAvailableIcons = () => {
  return Object.keys(ICON_MAP)
}

export default ICON_MAP