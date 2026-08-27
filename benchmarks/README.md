# OpenRouter free-model benchmark

Benchmark date: 2026-08-26

## Fixture and scoring

The checked-in generator creates a privacy-safe synthetic assessment with known ground truth:

- five printed questions in document order, including `11 (a)` and `11 (b)`
- four answered questions presented out of order
- one explicitly unanswered question
- one answer continuing onto a second page
- one unrelated rough-work region that must remain unmatched
- six expected handwriting regions with normalized ground-truth boxes

The runner calls the same extraction prompts, Zod schemas, deterministic mapping, continuation handling, and semantic fallback used by the application. The composite score weights question labels 25%, explicit answer labels 15%, final mapping 30%, bounding-box IoU 20%, and transcription keyword recall 10%.

## Results

| Model/run | Complete | Overall | Labels | Mapping | Bbox IoU | Keywords | Wall time | Tokens |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Dots3 Note, run 1 | Yes | 90.6% | 100% | 100% | 53.2% | 100% | 46.9s | 12,049 |
| Dots3 Note, run 2 | Yes | 88.4% | 100% | 100% | 41.9% | 100% | 90.9s | 10,536 |
| Nemotron Nano Omni 30B A3B | Yes | 81.1% | 100% | 100% | 22.0% | 66.7% | 268.3s | 20,909 |
| MiniMax M3 | Partial | — | — | throttled | — | — | extraction: 11.8s max | 9,421* |
| Gemma 4 26B A4B | No | — | — | — | — | — | throttled | — |
| Gemma 4 31B | No | — | — | — | — | — | throttled | — |

\* MiniMax completed question and answer extraction (3,364 and 6,057 tokens) but its semantic-mapping request was rate-limited, so no comparable end-to-end quality score was recorded.

Dots3 Note mean results across the two complete runs:

- overall quality: **89.5%**
- question labels: **100%**
- explicit answer labels: **100%**
- mapping/unanswered/continuation/unmatched: **100%**
- transcription keyword recall: **100%**
- bounding-box IoU: **47.6%**
- end-to-end wall time: **68.9 seconds**

The lower IoU reflects model boxes that tightly cover glyphs versus the intentionally padded ground-truth regions. Both runs returned six distinct blocks rather than page-wide boxes, so the overlays remained usable. Exact padding varied between runs.

## Decision

`dots-studio/dots-3-note-preview:free` is the default because it was the only pinned free model to complete the parallel vision extraction and semantic mapping pipeline repeatedly, while achieving perfect functional mapping scores on the controlled fixture.

### Nemotron and GPT-OSS follow-up

The live OpenRouter catalog lists `nvidia/nemotron-3-super-120b-a12b:free`, but its input modality is text only. A separate semantic-only benchmark removed every written question label and required the model to map six extracted text blocks—including a continuation and unmatched rough work—by meaning alone:

| Text model | Mapping score | Latency | Tokens | Result |
|---|---:|---:|---:|---|
| Nemotron 3 Super 120B A12B (free) | 100% | 9.1s | 1,357 | Complete |
| GPT-OSS 120B `:free` alias | — | 0.08s | — | API rejected: free variant unavailable |

Nemotron 120B is therefore a valid free semantic-mapping model but cannot replace the vision model used for question and handwriting extraction. Its mapping result and latency were effectively equal to Dots3’s two mapping runs (both 100%, averaging 9.2s), so a hybrid default would add another availability dependency without improving this fixture.

The Nemotron 120B free endpoint also advertises prompt logging/training terms. The benchmark uses synthetic data only; do not route confidential student work through that endpoint without an appropriate data-processing review.

The general multimodal Nemotron variant, `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`, was also tested end-to-end. It preserved question labels and final mappings but had materially worse transcription, bounding regions, and latency than Dots3. Its question extraction required a second structured-response attempt.

OpenRouter’s catalog currently lists `openai/gpt-oss-120b` as text-only and paid. Probing `openai/gpt-oss-120b:free` returned: “This model is unavailable for free.” The paid endpoint was not invoked.

Free-tier latency was volatile and the other candidates frequently returned HTTP 429. The application therefore keeps the model configurable and preserves deterministic label mappings, unanswered questions, and unmatched blocks when semantic mapping or grading is unavailable.

This synthetic benchmark is a regression baseline, not a substitute for a diverse real-handwriting evaluation set. Before production use, add anonymized samples covering camera skew, faint pencil, diagrams, crossed-out work, multiple languages, and different handwriting styles.

## Reproduce

```bash
npm run benchmark:fixture
npm run benchmark
```

Run one pinned model:

```bash
npm run benchmark -- dots-studio/dots-3-note-preview:free
```

Reports are written to `benchmarks/results/latest.json` and a timestamped JSON file. No API keys or source document contents are written to the report.

Run the text-only mapping comparison with:

```bash
npm run benchmark:mapping
```

Its report is written to `benchmarks/results/mapping-latest.json`.
