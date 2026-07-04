# NPB Design References

This directory keeps design references and generated previews. It is not the product design source of truth.

## Source of Truth

- Product rules: `../DESIGN.md`
- Runtime theme tokens: `../src/lib/theme-presets.ts`
- Implemented UI: `../src/`

## Reference Rules

- Keep Claude Design exports, screenshots, and comparison HTML as dated references.
- Every accepted reference must be summarized in `../DESIGN.md` with:
  - selected direction
  - accepted patterns
  - rejected or deferred patterns
  - implementation owner files
  - visual verification evidence
- Do not treat exported HTML as implementation. Port decisions into tokens/components, then verify in the running app.

## Current Release Direction

The release direction is **Navy Editorial Scorebook**:

- base theme: `editorial-navy-ivory`
- reference: `../../デザイン案を決定/NPB デザイン案比較.dc.html`
- adopted direction: C「紙面」/ D「新聞」 information density
- deferred directions: A「放送席」 and B「ナイター」
