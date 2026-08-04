"use client";

import { BANDS, agreementSentence, modelLabel } from "../../lib/agreement";

/**
 * The centrepiece: when each model says go.
 *
 * Agreement reads as a vertical stripe. A rider who has never heard of ICON-EU
 * can still see that everything lines up at 12:00 and one model is alone.
 *
 * Wind sports only. Windy.app serves wave data from separate models and it is
 * identical across all five wind models, so for surfing this grid would be five
 * identical rows claiming a consensus that was never measured.
 */
export function ModelGrid({ columns, models, agreedByColumn, outlier, sentence }) {
  if (!models?.length) return null;

  return (
    <section className="pt-[22px]">
      <h2 className="font-data text-[9px] tracking-label-wide text-dim mb-2.5">
        WHEN EACH MODEL SAYS GO
      </h2>

      <div className="flex gap-1 font-data text-[8px] text-dim pb-1.5" aria-hidden="true">
        <div className="w-[62px]" />
        {columns.map((c) => (
          <div key={c.timestamp} className="flex-1 text-center">
            {c.label}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-[5px]">
        {models.map((model) => (
          <div key={model.model} className="flex gap-1 items-center">
            <div
              className={`w-[62px] font-data text-[9px] ${
                model.model === outlier ? "text-marginal" : "text-faded-ink"
              }`}
            >
              {modelLabel(model.model)}
            </div>
            {model.votes.map((vote, i) => (
              <div
                key={i}
                className={`flex-1 h-5 rounded ${
                  vote === true
                    ? model.model === outlier
                      ? "bg-marginal-low"
                      : "bg-accent"
                    : "bg-track"
                }`}
              />
            ))}
          </div>
        ))}

        <div className="flex gap-1 items-center mt-[5px] pt-2 border-t border-rule">
          <div className="w-[62px] font-data text-[9px] text-ink">AGREED</div>
          {agreedByColumn.map((count, i) => (
            <div
              key={i}
              className={`flex-1 text-center font-data text-[10px] ${
                count >= 4
                  ? "text-accent font-bold"
                  : count >= 2
                    ? "text-faded-ink"
                    : "text-dim"
              }`}
            >
              {count}
            </div>
          ))}
        </div>
      </div>

      {sentence && (
        <p className="text-[12px] leading-[1.45] text-faded-ink mt-3">{sentence}</p>
      )}
    </section>
  );
}

/**
 * The surf variant. No mockup exists for this — it is designed here.
 *
 * With the model grid hidden, surfing needs its own answer to "do I believe
 * it". The insight is that surf has RICHER per-slot criteria than wing does:
 * spotConfigs carries swell height, period, swell direction and optimal tide.
 * Wing's confidence comes from who agrees; surf's comes from how many
 * conditions line up. Same question, different evidence — so this deliberately
 * mirrors the grid's visual language, and a vertical stripe of accent still
 * means "everything agrees".
 */
export function CriteriaPanel({ criteria, windAgreement }) {
  if (!criteria?.length) return null;
  const matched = criteria.filter((c) => c.met).length;

  return (
    <section className="pt-[22px]">
      <h2 className="font-data text-[9px] tracking-label-wide text-dim mb-2.5">
        WHAT LINES UP
      </h2>

      <div className="flex flex-col gap-[5px]">
        {criteria.map((criterion) => (
          <div key={criterion.label} className="flex gap-2 items-center">
            <div className="w-[76px] font-data text-[9px] text-faded-ink">
              {criterion.label}
            </div>
            <div className="w-[70px] font-data text-[11px] text-ink tabular-nums">
              {criterion.value}
            </div>
            <div
              className={`flex-1 h-5 rounded ${
                criterion.met === true
                  ? "bg-accent"
                  : criterion.met === null
                    ? "bg-track"
                    : "bg-marginal-low"
              }`}
              title={criterion.range}
            />
          </div>
        ))}

        <div className="flex gap-2 items-center mt-[5px] pt-2 border-t border-rule">
          <div className="w-[76px] font-data text-[9px] text-ink">MATCHED</div>
          <div
            className={`font-data text-[11px] ${
              matched >= criteria.length - 1 ? "text-accent font-bold" : "text-faded-ink"
            }`}
          >
            {matched} of {criteria.length}
          </div>
        </div>
      </div>

      {/* Wind is the one thing the models genuinely disagree about for surf —
          offshore texture versus onshore mush — so they keep a role here, as a
          line rather than a grid. */}
      {windAgreement && windAgreement.band !== BANDS.UNKNOWN && (
        <p className="text-[12px] leading-[1.45] text-faded-ink mt-3">
          Wind: {agreementSentence(windAgreement)}
        </p>
      )}
    </section>
  );
}
