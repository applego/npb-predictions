# NPB Predictions — Design System

> Last updated: 2026-04-14 — Light theme: Baseball + Expo/HashiCorp clean

## 1. Design Philosophy

**Expo/HashiCorp の白ベースクリーン構造** + **野球ボールそのもの**

- 白い革 + 赤い縫い目 = 野球ボールの配色をそのままUIに
- Expo: 白背景、大きな余白、鮮明なコントラスト、モダンで軽快
- 方針: 「データを見るための道具」— 機能美重視、装飾は野球モチーフに限定

---

## 2. Color Palette

### Base (Light / Expo-inspired)
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `#FAFAFA` | Page background (off-white) |
| `--bg-surface` | `#FFFFFF` | Card / section (pure white) |
| `--bg-elevated` | `#F5F5F5` | Hover / active |
| `--bg-inset` | `#F0F0F0` | Table header, rank column |
| `--border-primary` | `#E5E5E5` | Card borders |
| `--border-strong` | `#D4D4D4` | Active, dividers |

### Text
| Token | Value | Usage |
|-------|-------|-------|
| `--text-primary` | `#1A1A1A` | Headings (near black) |
| `--text-secondary` | `#525252` | Body text |
| `--text-muted` | `#A3A3A3` | Captions, timestamps |

### Baseball Accents
| Token | Value | Motif | Usage |
|-------|-------|-------|-------|
| `--stitch` | `#E53935` | ボール縫い目 | Primary accent, CTA, active nav |
| `--stitch-light` | `#EF5350` | 縫い目 hover | Hover states |
| `--field` | `#2E7D32` | 外野の芝 | Positive scores, success |
| `--dirt` | `#D4A017` | 内野の土 | Gold highlight, 1位 |
| `--plate` | `#F5F5F7` | ホームベース | Clean white accent |

### League
| Token | Value |
|-------|-------|
| `--central` | `#1565C0` |
| `--pacific` | `#00695C` |

### 12球団 Team Colors
| Team | BG | Text |
|------|-----|------|
| 巨人 | `#F97316` | `#fff` |
| 阪神 | `#FBBF24` | `#1a1a1a` |
| DeNA | `#2563EB` | `#fff` |
| 広島 | `#DC2626` | `#fff` |
| 中日 | `#1E40AF` | `#fff` |
| ヤクルト | `#059669` | `#fff` |
| ソフトバンク | `#F5D100` | `#1a1a1a` |
| 日本ハム | `#1E3A5F` | `#4FB3E0` |
| ロッテ | `#1a1a1a` | `#fff` |
| 楽天 | `#B91C1C` | `#fff` |
| 西武 | `#1D4ED8` | `#fff` |
| オリックス | `#1E3A5F` | `#C8A951` |

---

## 3. Typography

| Level | Font | Size | Tracking | Usage |
|-------|------|------|----------|-------|
| Display XL | Bebas Neue | clamp(2.5rem,6vw,4rem) | 0.04em | Hero year number |
| Display LG | Bebas Neue | clamp(1.5rem,4vw,2.25rem) | 0.04em | Section h1 |
| Display SM | Bebas Neue | 0.75rem | 0.15em | Nav links, labels |
| Body | Noto Sans JP | 0.875rem | 0 | Body text |
| Body SM | Noto Sans JP | 0.75rem | 0 | Captions |
| Data | Bebas Neue | 1rem | 0.02em | Scores, rank numbers |

```css
--font-display: 'Bebas Neue', 'Impact', 'Arial Narrow', sans-serif;
--font-body: 'Noto Sans JP', sans-serif;
```

---

## 4. Baseball Motif Elements

### 4a. Stitch Border（縫い目ボーダー）
セクション区切り・ヘッダー下端に赤い縫い目ドットライン。

```css
.stitch-border {
  background-image: radial-gradient(circle, var(--stitch) 1.5px, transparent 1.5px);
  background-size: 10px 3px;
  background-repeat: repeat-x;
  height: 3px;
}
```

**Usage**: Header 下端, セクション上端, カード間の区切り

### 4b. Home Plate Badge（ホームベース型バッジ）
五角形。順位番号・リーグラベルに使用。

```css
.home-plate {
  clip-path: polygon(0% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%);
}
```

**Usage**: 順位番号 (1-6), リーグラベル (セ/パ), ユーザーランクバッジ

### 4c. Bat Divider（バット型ディバイダー）
中央が太く端が細い水平線。

```css
.bat-divider {
  height: 2px;
  background: linear-gradient(90deg,
    transparent 0%,
    var(--border-primary) 15%,
    var(--border-strong) 50%,
    var(--border-primary) 85%,
    transparent 100%
  );
}
```

**Usage**: セクション間, Footer 上端

### 4d. Diamond Pattern（ダイヤモンド背景）
テーブルヘッダーの微妙な菱形テクスチャ。

```css
.diamond-pattern {
  background-image: repeating-linear-gradient(
    45deg, transparent, transparent 10px,
    rgba(255,255,255,0.015) 10px, rgba(255,255,255,0.015) 11px
  );
}
```

**Usage**: Matrix ヘッダー行, Hero セクション背景

---

## 5. Component Specs

### 5a. Navigation
```
[🏠] NPB LEAGUE   HOME  STANDINGS  PREDICTIONS  RANKINGS  NEWS   [ログイン]
═══ stitch dots (red) ════════════════════════════════════════════════════
```
- Logo: "N" inside home-plate clip-path, `--stitch` background
- Links: Bebas Neue 0.75rem, tracking-widest, `--text-muted` default
- Active: `--stitch` color + 底部に赤ドット indicator
- Header bg: `--bg-inset`
- Bottom edge: `.stitch-border` (red dots)

### 5b. Prediction Matrix（順位予想マトリクス）
TV中継/新聞スポーツ欄風のメインコンポーネント。

```
┌──────────────────────────────────────────┐
│ [🏠セ] 2026年 セ・リーグ 順位予想         │ ← League band (--central bg)
├──────┬────────┬────────┬────────┬────────┤
│  1   │ [巨人] │ [阪神] │ [DeNA] │ ...   │ ← Rank: home-plate badge
│  2   │ [阪神] │ [巨人] │ [巨人] │       │ ← Cell: team color fills 100%
│  3   │ [DeNA] │ [DeNA] │ [阪神] │       │
│  4   │ [広島] │ [広島] │ [広島] │       │
│  5   │ [中日] │ [ヤクルト]│[中日]│       │
│  6   │ [ヤクルト]│[中日]│[ヤクルト]│     │
└──────┴────────┴────────┴────────┴────────┘
```

- League band: `--central` or `--pacific` background, white text, リーグ名
- Header row: `--bg-inset` + diamond pattern, predictor names
- Rank column: home-plate badge, 1位=`--dirt`, 6位=subtle red tint
- Team cell: **チームカラーが100%セルを塗る**, 4px radius, 3px gap
  - Font: Noto Sans JP 0.8rem bold
  - Text: team textColor
  - Text shadow for white text: `0 1px 2px rgba(0,0,0,0.3)`
- border-spacing: 3px (セル間のギャップ)

### 5c. Scoreboard
```
═══ stitch border (top) ═══════════════════
  CURRENT STANDINGS      2025 Season
┌────────────────────────────────────────┐
│  #  Name        順位  タイトル  合計   │
│  1  ユーザーA    +12    +6      18    │ ← --dirt row
│  2  ユーザーB    +8     +3      11    │
└────────────────────────────────────────┘
```
- Top: stitch border
- 1位 row: `--dirt` accent background
- Score numbers: Bebas Neue, tabular-nums

### 5d. News Card
```
┌─ left accent (3px, type color) ────────┐
│ [icon] TYPE_BADGE    year             │
│ Title text                             │
│ Body text                              │
│ 📎 source link                         │
└────────────────────────────────────────┘
```
- Left: 3px type-color bar
- Source: `📎` + link or label

---

## 6. Layout

- Max-width: `72rem` (1152px) — データ密度のため広め
- Gutter: 1rem mobile / 1.5rem desktop
- Section gap: 2rem
- Card padding: 1.25rem
- Card radius: 0.5rem (HashiCorp 風に控えめ)
- Card border: `--border-primary`

---

## 7. Animations

**最小限に抑える。機能的なものだけ。**

| Name | Duration | Usage |
|------|----------|-------|
| `pulse-dot` | 2s | Active season indicator dot |

**削除済み（旧テーマ）**: amber-glow, border-glow, scoreboard-flicker, grain texture

---

## 8. Do's and Don'ts

### Do
- `--stitch` (赤) を primary accent として統一する
- 野球モチーフ (stitch, home-plate, bat-divider) をUI装飾に使う
- チームカラーはマトリクスセルのみに限定（UI全体に散らさない）
- Bebas Neue は常に uppercase + wide tracking
- データテーブルは密度重視（cell padding は小さく）
- コンテンツブロックは `--bg-surface` + `--border-primary`

### Don't
- ダークモードにしない（白ベース固定）
- amber glow / neon 系エフェクトは使わない
- grain texture は使わない
- 丸角を大きくしない (max 0.5rem)
- `--stitch` 以外のアクセントカラーをUI装飾に追加しない
- 過度なアニメーション
- 影を濃くしすぎない（Expo風の軽い影のみ）

---

## 9. Agent Quick Reference

```
Theme: Light (Expo/baseball ball) + baseball motif
BG: base=#FAFAFA, surface=#FFFFFF, elevated=#F5F5F5, inset=#F0F0F0
Text: primary=#1A1A1A, secondary=#525252, muted=#A3A3A3
Border: primary=#E5E5E5, strong=#D4D4D4
Accent: --stitch=#E53935 (red stitching on white = baseball)
Gold: --dirt=#D4A017 (1位 highlight)
Fonts: display=Bebas Neue, body=Noto Sans JP
Motifs: stitch-border (red dots), home-plate (pentagon), bat-divider
Matrix: team colors fill cells, 3px gap, league color band header
Card: white + light border + subtle shadow, radius 0.5rem
No dark mode, no glow, no grain
```
