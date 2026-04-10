# NPB Predictions — Design System

> Auto-generated from design tokens. Last updated: 2026-04-10

## 1. Visual Theme & Atmosphere

Stadium scoreboard aesthetic. Dark navy backgrounds with amber/gold glow accents evoking lit scoreboards under night-game floodlights. Typography pairs a condensed display font (Bebas Neue) for headings with clean Japanese sans-serif (Noto Sans JP) for body text. Always-dark theme -- no light mode.

## 2. Color Palette & Roles

### Primary Colors
| Token | Value | Role |
|-------|-------|------|
| Amber glow | `rgba(251, 191, 36, *)` | Primary accent used in text shadows, box shadows, borders |

### Background & Surface
| Token | Value | Role |
|-------|-------|------|
| Stadium card bg | `#0a1525` | Card default background |
| Stadium card hover | `#0f1d35` | Card hover state |

### Border
| Token | Value | Role |
|-------|-------|------|
| Card border | `rgba(255, 255, 255, 0.05)` | Subtle white border on stadium cards |

### CSS Variables (Source of Truth)

Font variables injected via `next/font/google`:
```css
--font-display: 'Bebas Neue', 'Impact', 'Arial Narrow', sans-serif;
--font-body: 'Noto Sans JP', sans-serif;
```

No explicit color tokens defined in CSS. App uses Tailwind defaults combined with custom utility classes in `globals.css`.

## 3. Typography Rules

### 3.1 和文フォント (Japanese Fonts)
- **Noto Sans JP** -- 本文、ナビゲーション、全日本語テキスト

### 3.2 欧文フォント (Latin Fonts)
- **Bebas Neue** -- 見出し、ロゴ、ナビリンク（全 caps、ワイドトラッキング）
- Fallback: Impact, Arial Narrow, sans-serif

### 3.3 font-family 指定
```css
/* Display (headings, logos, nav) */
font-family: var(--font-display, 'Bebas Neue', 'Impact', 'Arial Narrow', sans-serif);
letter-spacing: 0.05em;

/* Body */
font-family: var(--font-body, 'Noto Sans JP', sans-serif);
```

### 3.4 文字サイズ階層 (Type Scale)
Tailwind デフォルトサイズを使用。カスタムフォントサイズの定義なし。

### 3.5 行間・字間 (Line Height & Letter Spacing)
| Context | letter-spacing |
|---------|----------------|
| Display (`.font-display`) | 0.05em |

### 3.6 禁則処理 (Kinsoku Shori)
ブラウザ標準。カスタム設定なし。

### 3.7 OpenType Features
未設定。

### 3.8 縦書き (Vertical Writing)
未使用。

## 4. Component Stylings

### Stadium Card (`.stadium-card`)
背景 `#0a1525`、ボーダー `1px solid rgba(255, 255, 255, 0.05)`、角丸 `0.75rem`。hover で `#0f1d35` に明るくなる。

### Amber Glow Text (`.animate-amber-glow`)
テキストシャドウでネオン効果。3.5s ease-in-out 周期で脈動。
- 通常: `0 0 10px rgba(251,191,36,0.4)`, `0 0 20px rgba(251,191,36,0.2)`
- ピーク: `0 0 22px rgba(251,191,36,0.9)`, `0 0 40px rgba(251,191,36,0.5)`, `0 0 60px rgba(251,191,36,0.2)`

### Border Glow (`.animate-border-glow`)
box-shadow でネオンボーダー。3s ease-in-out 周期。
- 通常: `0 0 5px rgba(251,191,36,0.15)`
- ピーク: `0 0 15px rgba(251,191,36,0.35)`, `0 0 30px rgba(251,191,36,0.1)`

### Scoreboard Flicker (`.animate-flicker`)
12s ease-in-out 周期の微妙な点滅。スタジアムスコアボードのディスプレイ再現。
- 94%: opacity 0.82
- 96%: opacity 0.95
- 98%: opacity 0.87

### Slide Up (`.animate-slide-up`)
0.5s ease-out で `translateY(20px)` からフェードイン。`forwards` で最終状態を保持。

### Pulse Dot (`.animate-pulse-dot`)
2s ease-in-out で `scale(1) → scale(1.5) → scale(1)`、opacity `1 → 0.7 → 1`。

### Text Shadow Amber (`.text-shadow-amber`)
静的な amber text shadow: `0 0 10px rgba(251, 191, 36, 0.5)`。

### Display Font (`.font-display`)
Bebas Neue フォントスタック + `letter-spacing: 0.05em`。

## 5. Layout Principles

Stadium card をコンテンツブロックのプライマリコンテナとして使用。Amber アクセントでインタラクティブ要素やハイライトを表現。

## 6. Depth & Elevation

### Shadows
| Context | Shadow |
|---------|--------|
| Amber text glow (static) | `0 0 10px rgba(251,191,36,0.5)` |
| Amber glow anim (peak) | `0 0 22px/40px/60px rgba(251,191,36,*)` |
| Border glow anim (peak) | `0 0 15px/30px rgba(251,191,36,*)` |

## 7. Do's and Don'ts

### Do
- Amber (`rgba(251, 191, 36, *)`) を唯一のアクセントカラーとして統一する
- Bebas Neue は `letter-spacing: 0.05em` 以上のワイドトラッキングで使う
- ネオン発光効果は `animate-amber-glow` / `animate-border-glow` で表現する
- コンテンツブロックには `.stadium-card` を使う
- スコアボード風の雰囲気を出すときは `.animate-flicker` を控えめに使う

### Don't
- 明るい背景やライトモードを導入しない（常にダーク）
- Bebas Neue を小文字・通常トラッキングで使わない
- amber 以外のアクセントカラーを追加しない
- flicker アニメーションを広範囲に使わない（微妙さが大事）

## 8. Responsive Behavior

Tailwind v4 デフォルトブレークポイント使用。カスタムブレークポイントなし。

| Breakpoint | Width |
|------------|-------|
| sm | 640px |
| md | 768px |
| lg | 1024px |
| xl | 1280px |
| 2xl | 1536px |

## 9. Agent Prompt Guide

### Quick Reference
```
Theme: Stadium scoreboard aesthetic (always dark)
Card BG: #0a1525, hover: #0f1d35
Card border: rgba(255,255,255,0.05), radius: 0.75rem
Accent: rgba(251,191,36,*) (amber glow)
Font Display: Bebas Neue, Impact, Arial Narrow, sans-serif (0.05em spacing)
Font Body: Noto Sans JP, sans-serif
Animations: amber-glow(3.5s), border-glow(3s), flicker(12s), slide-up(0.5s), pulse-dot(2s)
Tailwind: v4 (@import "tailwindcss"), no tailwind.config
```

### Prompt Example
```
Create a [component] for NPB Predictions.
Style: Dark stadium scoreboard aesthetic with amber neon accents
Colors: card=#0a1525, card-hover=#0f1d35, accent=rgba(251,191,36,*), border=rgba(255,255,255,0.05)
Fonts: headings=Bebas Neue (0.05em tracking), body=Noto Sans JP
Effects: amber-glow text shadows, border-glow box shadows, scoreboard-flicker
Container: .stadium-card (0.75rem radius)
```
