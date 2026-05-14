# Design System — Nova Inspired

## Overview
Nova embodies a premium fintech experience through **liquid glassmorphism** and sophisticated motion design. The aesthetic prioritizes clarity and trust with a refined neutral palette accented by vibrant electric blue, creating a sense of modern sophistication. Smooth animations, subtle transparency effects, and carefully calibrated depth establish an agency-grade visual language that feels both approachable and premium.

**Key Characteristics:**
- Premium glassmorphism with layered transparency effects
- Vibrant electric blue accents against neutral dark–light scales
- Liquid motion and smooth transitions throughout
- Clean, minimal UI with generous whitespace
- Sophisticated shadow system for subtle depth
- High contrast for accessibility paired with soft visual effects

## Colors

### Primary
| Token | Hex | Usage |
|-------|-----|-------|
| `primary-action` | `#0000F5` | Core interactive element for CTAs, active navigation, key affordances |
| `primary-text` | `#0A0A0A` | Main heading, body text, navigation labels |

### Accent
| Token | Hex | Usage |
|-------|-----|-------|
| `accent-secondary` | `#689BFB` | Lighter blue for secondary highlights, supporting visuals, charts |
| `dark-navy` | `#1A2850` | Deep background tint or modal overlay accent |

### Neutral Scale
| Token | Hex | Usage |
|-------|-----|-------|
| `neutral-900` | `#0A0A0A` | Primary text, dark backgrounds |
| `neutral-800` | `#0D0D0E` | Secondary text, subtle UI layers |
| `neutral-400` | `#CCCCCC` | Tertiary text, disabled states, muted labels |
| `neutral-200` | `#E5E5E5` | Light borders, divider lines |
| `neutral-50` | `#F8FAFC` | Off-white backgrounds, lightest surface |

### Surface & Borders
| Token | Hex | Usage |
|-------|-----|-------|
| `surface` | `#FFFFFF` | Primary card and container backgrounds |
| `border-subtle` | `#E5E5E5` | Delicate dividers and separation lines |
| `glass-border` | `rgba(255, 255, 255, 0.47)` | Translucent borders for glassmorphism |

### Semantic
| Token | Hex | Usage |
|-------|-----|-------|
| `error` | `#DC2626` | Error states, warnings, destructive actions |
| `success` | `#22C55E` | Success states, completed actions |

## Typography

### Font Family
**Primary:** `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif`

### Hierarchy
| Role | Size | Weight | Line Height | Letter Spacing |
|------|------|--------|-------------|----------------|
| Display | 36px | 700 | 44px | -0.5px |
| Heading 1 | 28px | 700 | 36px | -0.3px |
| Heading 2 | 20px | 600 | 28px | -0.2px |
| Body Large | 16px | 400 | 24px | 0px |
| Body Regular | 14px | 400 | 21px | 0px |
| Body Small | 12px | 400 | 18px | 0px |
| Button | 16px | 600 | 24px | 0px |
| Label | 12px | 500 | 18px | 0px |

## Spacing (4px base)
| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Inline gaps |
| `space-2` | 8px | Icon-to-text spacing |
| `space-3` | 12px | Component internal spacing |
| `space-4` | 16px | Card content padding |
| `space-5` | 20px | Section gaps |
| `space-6` | 24px | Layout gaps between sections |
| `space-8` | 32px | Major section spacing |
| `space-12` | 48px | Whitespace between major sections |
| `space-16` | 64px | Large section breaks |

## Border Radius
| Token | Value | Context |
|-------|-------|---------|
| `radius-sm` | 12px | Badges, status indicators, small elements |
| `radius-md` | 20px | Buttons, inputs, medium cards |
| `radius-lg` | 24px | Large cards, containers |
| `radius-xl` | 32px | Hero cards, featured elements |

## Elevation & Shadows
| Level | Value | Usage |
|-------|-------|-------|
| Flat | `none` | Disabled states, inactive elements |
| Base | `rgba(15, 23, 42, 0.11) 0px 14px 40px 0px` | Default cards, containers |
| Raised | `rgba(104, 155, 251, 0.3) 0px 12px 40px 0px` | Floating actions, primary actions |
| Elevated | `rgba(15, 23, 42, 0.15) 0px 20px 48px 0px` | Modals, overlays, card hover |
| Premium | `rgba(104, 155, 251, 0.2) 0px 16px 48px 0px` | Glassmorphic surfaces, accent cards |

## Components

### Buttons

#### Primary CTA
- Background: `#0000F5`
- Text: `#FFFFFF`, 16px, weight 600
- Padding: `12px 24px`
- Border Radius: `18px`
- Height: `48px`
- Shadow: `rgba(104, 155, 251, 0.3) 0px 12px 40px 0px`
- Hover: bg `#0000D9`, shadow `rgba(104, 155, 251, 0.5) 0px 16px 48px 0px`
- Disabled: bg `#CCCCCC`, text `#0A0A0A`, no shadow

#### Secondary
- Background: `transparent`
- Text: `#0A0A0A`, 16px, weight 600
- Padding: `12px 24px`
- Border: `1px solid #E5E5E5`
- Border Radius: `18px`
- Height: `48px`
- Hover: bg `#F8FAFC`, border `#CCCCCC`

### Cards

#### Default Card
- Background: `#FFFFFF`
- Padding: `24px`
- Border Radius: `16px`
- Border: `1px solid #E5E5E5`
- Shadow: `rgba(15, 23, 42, 0.11) 0px 14px 40px 0px`
- Hover: shadow `rgba(15, 23, 42, 0.15) 0px 20px 48px 0px`

#### Glass Card
- Background: `rgba(255, 255, 255, 0.8)`
- Padding: `24px`
- Border Radius: `16px`
- Border: `1px solid rgba(255, 255, 255, 0.47)`
- Shadow: `rgba(104, 155, 251, 0.2) 0px 16px 48px 0px`
- Backdrop Filter: `blur(10px)`

### Inputs
- Background: `#FFFFFF`
- Text: `#0A0A0A`, 14px
- Padding: `12px 16px`
- Border Radius: `8px`
- Border: `1px solid #E5E5E5`
- Focus: border `2px solid #0000F5`, shadow `rgba(0, 0, 245, 0.1) 0px 0px 0px 3px`
- Placeholder: `#CCCCCC`, italic

### Badges
- Primary: bg `#0000F5`, text `#FFFFFF`, padding `4px 12px`, radius `9999px`
- Pending: bg `rgba(0, 0, 245, 0.1)`, text `#0000F5`, border `1px solid #0000F5`
- Success: bg `rgba(34, 197, 94, 0.1)`, text `#22C55E`
- Error: bg `rgba(220, 38, 38, 0.1)`, text `#DC2626`

## Do's and Don'ts

### Do
- Use primary blue (`#0000F5`) for all primary CTAs
- Maintain high contrast between text and background
- Apply glassmorphic effects with `rgba(255, 255, 255, 0.8)` + `backdrop-filter: blur(10px)`
- Group related content into cards with `24px` padding and `16px` border radius
- Implement smooth transitions (`transition: all 200ms ease-out`)
- Apply cool-toned shadow system for hierarchy
- Use generous whitespace (48–64px between major sections)
- Test all interactive states (hover, focus, active, disabled)

### Don't
- Don't use dark blue or navy text on neutral backgrounds
- Don't add shadows to every element
- Don't mix accent colors—keep blue as sole primary
- Don't apply border radius > 18px to buttons or inputs
- Don't use red error color for non-critical messaging
- Don't use opacity below 70% for interactive elements
- Don't apply letterSpacing to body text
- Don't scale down button padding below 12px vertically
