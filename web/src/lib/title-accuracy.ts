const TITLE_HIT_SCORE = 3;

export interface TitleActual {
  playerName: string;
}

export interface TitlePredictorInput<TPick> {
  predictionId: number;
  name: string;
  source: string | null;
  picks: Map<string, TPick>;
}

export interface TitlePredictorSummary<TPick>
  extends TitlePredictorInput<TPick> {
  hits: number;
  score: number;
  confirmedTitleCount: number;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export function hasAnyTitlePick<TPick>(
  predictor: TitlePredictorInput<TPick>,
): boolean {
  return predictor.picks.size > 0;
}

export function scoreTitlePredictors<TPick extends { playerName: string }>(
  predictors: TitlePredictorInput<TPick>[],
  actualByKey: Map<string, TitleActual>,
  confirmedKeys: string[],
): TitlePredictorSummary<TPick>[] {
  return predictors.filter(hasAnyTitlePick).map((predictor) => {
    let hits = 0;
    for (const key of confirmedKeys) {
      const actual = actualByKey.get(key);
      const pick = predictor.picks.get(key);
      if (!actual || !pick) continue;
      if (norm(pick.playerName) === norm(actual.playerName)) {
        hits += 1;
      }
    }
    return {
      ...predictor,
      hits,
      confirmedTitleCount: confirmedKeys.length,
      score: hits * TITLE_HIT_SCORE,
    };
  });
}
