# NPB Predictions — Design System

> Auto-generated from design tokens. Last updated: 2026-04-13

## 1. Visual Theme & Atmosphere

Stadium scoreboard aesthetic with night-game atmosphere. Dark navy backgrounds (`#0a1525`) combined with amber neon glow (`rgba(251, 191, 36, *)`) evoke lit scoreboards under floodlights. Condensed display typography (Bebas Neue) for headers contrasts with clean Japanese sans-serif (Noto Sans JP) for body text. Always-dark theme — no light mode. Subtle scoreboard flicker and ambient glow animations reinforce the stadium ambiance.

## 2. Color Palette & Roles

### Primary Colors
| Token | Value | Role |
|-------|-------|------|
| Amber glow | `rgba(251, 191, 36, 0.4)` ~ `rgba(251, 191, 36, 0.9)` | Primary accent used in text shadows, box shadows, borders (animated) |

### Background & Surface
| Token | Value | Role |
|-------|-------|------|
| Stadium card bg | `#0a1525` | Card default background |
| Stadium card hover | `#0f1d35` | Card hover state (brightened) |

### Border
| Token | Value | Role |
|-------|-------|------|
| Card border | `rgba(255, 255, 255, 0.05)` | Subtle white border on `.stadium-card` |
| Border glow (animated) | `rgba(251, 191, 36, 0.15)` ~ `rgba(251, 191, 36, 0.35)` | Animated border glow effect |

### CSS Variables (Source of Truth)

Font variables injected via `next/font/google` in layout:
```css
--font-display: 'Bebas Neue', 'Impact', 'Arial Narrow', sans-serif;
--font-body: 'Noto Sans JP', sans-serif;
```

**Note**: No explicit `:root` color variables. All colors are hardcoded in utility classes (Tailwind v4 + custom utilities in `globals.css`).

## 3. Typography Rules

### 3.1 和文フォント (Japanese Fonts)
- **Noto Sans JP** — 本文、ナビゲーション、全日本語テキスト

### 3.2 欧文フォント (Latin Fonts)
- **Bebas Neue** — 見出し、ロゴ、ナビリンク（全て大文字推奨、ワイドトラッキング）
- Fallback: `Impact`, `Arial Narrow`, `sans-serif`

### 3.3 font-family 指定
```css
/* Display (headings, logos, nav) — `.font-display` */
font-family: var(--font-display, 'Bebas Neue', 'Impact', 'Arial Narrow', sans-serif);
letter-spacing: 0.05em;

/* Body — `.font-body` */
font-family: var(--font-body, 'Noto Sans JP', sans-serif);
```

### 3.4 文字サイズ階層 (Type Scale)
Tailwind v4 デフォルトサイズを使用。カスタムフォントサイズの定義なし。

### 3.5 行間・字間 (Line Height & Letter Spacing)
| Context | letter-spacing | Notes |
|---------|----------------|-------|
| Display (`.font-display`) | `0.05em` | Bebas Neue は必ずワイドトラッキング |

行間（line-height）: Tailwind デフォルト。明示的なカスタム設定なし。

### 3.6 禁則処理 (Kinsoku Shori)
ブラウザ標準。カスタム設定なし。

### 3.7 OpenType Features
未設定。

### 3.8 縦書き (Vertical Writing)
未使用。

## 4. Component Stylings

### Stadium Card (`.stadium-card`)
**Visual**: 濃紺背景に極めて薄い白ボーダー。角丸カード。hover で背景が明るくなる。

**CSS**:
```css
.stadium-card {
  background: #0a1525;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 0.75rem;
}

.stadium-card:hover {
  background: #0f1d35;
}
```

### Amber Glow Text (`.animate-amber-glow`)
**Visual**: テキストに amber ネオンの脈動効果。3.5秒周期で明滅。

**Keyframes**:
```css
@keyframes amber-glow {
  0%, 100% {
    text-shadow: 0 0 10px rgba(251, 191, 36, 0.4), 0 0 20px rgba(251, 191, 36, 0.2);
  }
  50% {
    text-shadow: 0 0 22px rgba(251, 191, 36, 0.9), 0 0 40px rgba(251, 191, 36, 0.5), 0 0 60px rgba(251, 191, 36, 0.2);
  }
}
/* animation: amber-glow 3.5s ease-in-out infinite; */
```

### Border Glow (`.animate-border-glow`)
**Visual**: box-shadow で amber ネオンボーダー。3秒周期で脈動。

**Keyframes**:
```css
@keyframes border-glow {
  0%, 100% { box-shadow: 0 0 5px rgba(251, 191, 36, 0.15); }
  50% { box-shadow: 0 0 15px rgba(251, 191, 36, 0.35), 0 0 30px rgba(251, 191, 36, 0.1); }
}
/* animation: border-glow 3s ease-in-out infinite; */
```

### Scoreboard Flicker (`.animate-flicker`)
**Visual**: 微妙な点滅でスタジアムディスプレイの雰囲気を演出。12秒周期。**使いすぎ注意** — 特定の要素のみに限定。

**Keyframes**:
```css
@keyframes scoreboard-flicker {
  0%, 93%, 95.5%, 97%, 99%, 100% { opacity: 1; }
  94% { opacity: 0.82; }
  96% { opacity: 0.95; }
  98% { opacity: 0.87; }
}
/* animation: scoreboard-flicker 12s ease-in-out infinite; */
```

### Slide Up Fade (`.animate-slide-up`)
**Visual**: 下から 20px スライドしながらフェードイン。0.5秒。`forwards` で最終状態保持。

**Keyframes**:
```css
@keyframes slide-up-fade {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
/* animation: slide-up-fade 0.5s ease-out forwards; */
```

### Pulse Dot (`.animate-pulse-dot`)
**Visual**: 点が拡大・縮小 + opacity 変化。2秒周期。

**Keyframes**:
```css
@keyframes pulse-dot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%       { transform: scale(1.5); opacity: 0.7; }
}
/* animation: pulse-dot 2s ease-in-out infinite; */
```

### Text Shadow Amber (`.text-shadow-amber`)
**Visual**: 静的な amber text shadow（アニメーションなし）。

**CSS**:
```css
.text-shadow-amber {
  text-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
}
```

### Font Utility Classes
```css
.font-display {
  font-family: var(--font-display, 'Bebas Neue', 'Impact', 'Arial Narrow', sans-serif);
  letter-spacing: 0.05em;
}

.font-body {
  font-family: var(--font-body, 'Noto Sans JP', sans-serif);
}
```

## 5. Layout Principles

- **Primary container**: `.stadium-card` をコンテンツブロックの基本単位とする
- **Accent strategy**: Amber glow でインタラクティブ要素やハイライトを表現
- **Grid system**: Tailwind v4 デフォルトグリッド（明示的なカスタムグリッドなし）
- **Spacing rhythm**: Tailwind デフォルトスペーシングスケール使用

## 6. Depth & Elevation

### Shadows
| Context | Shadow | Notes |
|---------|--------|-------|
| Amber text glow (static) | `0 0 10px rgba(251,191,36,0.5)` | `.text-shadow-amber` |
| Amber glow anim (通常) | `0 0 10px rgba(251,191,36,0.4), 0 0 20px rgba(251,191,36,0.2)` | `.animate-amber-glow` 0% / 100% |
| Amber glow anim (peak) | `0 0 22px rgba(251,191,36,0.9), 0 0 40px rgba(251,191,36,0.5), 0 0 60px rgba(251,191,36,0.2)` | `.animate-amber-glow` 50% |
| Border glow anim (通常) | `0 0 5px rgba(251,191,36,0.15)` | `.animate-border-glow` 0% / 100% |
| Border glow anim (peak) | `0 0 15px rgba(251,191,36,0.35), 0 0 30px rgba(251,191,36,0.1)` | `.animate-border-glow` 50% |

### Z-Index
明示的な z-index 階層定義なし。Tailwind デフォルト使用。

## 7. Do's and Don'ts

### Do
- **Amber を唯一のアクセントカラー** として統一する（`rgba(251, 191, 36, *)`）
- Bebas Neue は **`letter-spacing: 0.05em` 以上** のワイドトラッキングで使う
- ネオン発光効果は **`.animate-amber-glow` / `.animate-border-glow`** で表現する
- コンテンツブロックには **`.stadium-card`** を使う
- スコアボード風の雰囲気を出すときは **`.animate-flicker` を控えめに使う**（広範囲に使わない）
- `.stadium-card` には `hover:bg-[#0f1d35]` または `.stadium-card:hover` スタイルを活用

### Don't
- **明るい背景やライトモードを導入しない**（常にダーク）
- Bebas Neue を **小文字・通常トラッキングで使わない**
- **Amber 以外のアクセントカラーを追加しない**（青・緑・赤などの追加色は禁止）
- **`.animate-flicker` を広範囲に使わない**（微妙さが大事）
- **過度なアニメーション**（ユーザーを疲れさせない）

## 8. Responsive Behavior

Tailwind v4 デフォルトブレークポイント使用。カスタムブレークポイントなし。

| Breakpoint | Width |
|------------|-------|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

## 9. Agent Prompt Guide

### Quick Reference
```
Theme: Stadium scoreboard aesthetic (always dark)
Card BG: #0a1525, hover: #0f1d35
Card border: rgba(255,255,255,0.05), radius: 0.75rem
Accent: rgba(251,191,36,*) (amber glow only)
Font Display: Bebas Neue, Impact, Arial Narrow, sans-serif (letter-spacing: 0.05em)
Font Body: Noto Sans JP, sans-serif
Animations: amber-glow(3.5s), border-glow(3s), flicker(12s), slide-up-fade(0.5s), pulse-dot(2s)
Tailwind: v4 (@import "tailwindcss"), no tailwind.config
Custom utilities: .stadium-card, .animate-*, .font-display, .font-body, .text-shadow-amber
```

### Prompt Example
```
Create a [component] for NPB Predictions.
Style: Dark stadium scoreboard aesthetic with amber neon accents
Colors: card=#0a1525, card-hover=#0f1d35, accent=rgba(251,191,36,*), border=rgba(255,255,255,0.05)
Fonts: headings=Bebas Neue (letter-spacing: 0.05em), body=Noto Sans JP
Effects: .animate-amber-glow (text), .animate-border-glow (box), .animate-flicker (subtle, sparingly)
Container: .stadium-card (radius: 0.75rem)
Animation durations: amber-glow=3.5s, border-glow=3s, flicker=12s, slide-up=0.5s, pulse-dot=2s
```
