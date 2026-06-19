# NPB Predictions — Design System

> Last updated: 2026-06-19 — Release direction: Navy Editorial Scorebook

## 1. Design Philosophy

**雑誌エディトリアルの紙面感** + **日本野球の伝統色**

- Release default: `editorial-navy-ivory`
- Release direction: **Navy Editorial Scorebook** — C「紙面」/ D「新聞」の情報密度を、現行の紺・アイボリー・深紅テーマへ統合する
- 紺 + アイボリー + 深紅 = 日本野球の伝統色を UI の基調にする
- 方針: 「読み物として入り、データで納得する」— 予想・順位・解説者比較をスポーツ誌の編集面として見せる
- 装飾は紙面・縫い目・順位表のモチーフに限定し、操作面は引き続き軽く保つ

---

## 1a. Design Decision Status

### Selected for release
- **Navy Editorial Scorebook**: current `editorial-navy-ivory` theme plus the paper/newspaper comparison patterns from `../デザイン案を決定/NPB デザイン案比較.dc.html`.
- Keep the app light by default. Dense tables, scorecards, team chips, compact tabs, and rank-trend summaries should feel like a sports paper score sheet.
- Use the Claude Design comparison artifact as a reference for composition and information hierarchy, not as a second runtime source of truth.

### Accepted from the comparison artifact
- C「紙面」: print-like tables, thin rules, compact scoring, restrained red/green accents.
- D「新聞」: editorial masthead tone, high-density prediction summaries, strong section hierarchy.
- Shared patterns: sticky compact page controls, prediction matrix, title-score cards, current-standings scoreboard, drag/drop prediction entry, fixed/unfixed status labels.

### Deprioritized for release
- A「放送席」: useful for spacing and broadcast-like clarity, but too generic as the product identity.
- B「ナイター」: useful as an alternative theme, but not the default because the release UI should remain readable in daylight/light contexts.

### Source of truth
- Product design rules: this file.
- Implemented theme tokens: `web/src/lib/theme-presets.ts`.
- Exploratory/reference artifacts: `web/design/` and `../デザイン案を決定/`.
- User-facing verification: Playwright/browser screenshots after any component, CSS, or layout change.

---

## 1b. Claude Design Management Workflow

Claude Design should be used as a design-system collaborator and prototype surface, then reconciled back into this repo:

1. **Sync context first**: import or attach the current design system/codebase before generating alternatives. Use the current components, screenshots, and this file as context.
2. **Compare directions explicitly**: request 2-4 alternatives only when the direction is undecided. Save the comparison artifact under a dated reference path and record which parts are accepted/rejected.
3. **Promote one direction**: update this file with the selected direction, accepted patterns, rejected patterns, and the code files that own implementation.
4. **Implement in code**: runtime truth lives in tokens/components, primarily `web/src/lib/theme-presets.ts` and the React components using those tokens.
5. **Verify visibly**: for `.tsx`/`.css`/layout changes, run the app and capture screenshots for desktop and mobile before committing.
6. **Archive, don't fork truth**: Claude Design exports are references. Do not maintain competing design specs in exported HTML, screenshots, and markdown at the same time.

---

## 2. Color Palette

### Release Default: Editorial Navy Ivory
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `#FAF7F2` | Page background (warm ivory) |
| `--bg-surface` | `#FEFBF6` | Card / section |
| `--bg-elevated` | `#F2EDE5` | Hover / active |
| `--bg-inset` | `#EAE3D6` | Table header, rank column |
| `--border-primary` | `#D4CCB8` | Card borders |
| `--border-strong` | `#0C1B33` | Active, strong dividers |

### Text
| Token | Value | Usage |
|-------|-------|-------|
| `--text-primary` | `#0C1B33` | Headings, masthead |
| `--text-secondary` | `#1E3A5F` | Body text |
| `--text-muted` | `#647184` | Captions, timestamps |

### Editorial Baseball Accents
| Token | Value | Motif | Usage |
|-------|-------|-------|-------|
| `--stitch` | `#B91C1C` | ボール縫い目 / 見出し赤 | Primary accent, CTA, active nav |
| `--stitch-light` | `#DC2626` | 縫い目 hover | Hover states |
| `--field` | `#15803D` | 外野の芝 | Positive scores, success |
| `--dirt` | `#B45309` | 内野の土 | Gold highlight, 1位 |
| `--plate` | `#FEFBF6` | ホームベース | Ivory accent |

### Alternative Themes
`web/src/lib/theme-presets.ts` keeps comparison candidates available for settings:
`baseball`, `stadium`, `newspaper`, `night`, `sports-red`, `sports-blue`, and 12 editorial variants.
The release default remains `editorial-navy-ivory`.

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
- 影を濃くしすぎない（紙面を邪魔しない薄い影のみ）

---

## 9. Agent Quick Reference

```
Theme: Navy Editorial Scorebook / editorial-navy-ivory
BG: base=#FAF7F2, surface=#FEFBF6, elevated=#F2EDE5, inset=#EAE3D6
Text: primary=#0C1B33, secondary=#1E3A5F, muted=#647184
Border: primary=#D4CCB8, strong=#0C1B33
Accent: --stitch=#B91C1C (editorial red / baseball stitch)
Gold: --dirt=#B45309 (1位 highlight / infield dirt)
Fonts: display=Bebas Neue, body=Noto Sans JP
Motifs: stitch-border (red dots), home-plate (pentagon), bat-divider, paper-score rules
Matrix: team colors fill cells, 3px gap, league color band header, compact score-sheet density
Card: ivory surface + restrained border + subtle shadow, radius 0.5rem
No dark mode, no glow, no grain
```
