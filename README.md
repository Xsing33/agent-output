# agent-output

Research and analysis deliverables produced by the Hermes agent for Xavier Singletary.

Reports are self-contained single-file HTML — no build step, no external dependencies. Open the file directly, or serve the folder.

## Reports

| Report | Date | What it covers |
|---|---|---|
| [Positioning Research — xsingletary.com](reports/xsingletary-positioning-research/) | 2026-10-13 | Competitive teardown of the fractional GTM-engineering market, search priority order, competitor-positioning map, and per-page positioning briefs. |

## Layout

```
reports/
  <slug>/
    index.html      # the report
```

One folder per report so the path stays stable and can be served directly.

## Viewing

Open `index.html` straight from the filesystem. To view through GitHub, either use
[htmlpreview](https://htmlpreview.github.io/?https://github.com/Xsing33/agent-output/blob/main/reports/xsingletary-positioning-research/index.html)
or enable GitHub Pages on `main` (root), which serves each report at
`https://xsing33.github.io/agent-output/reports/<slug>/`.

## Notes

- Reports contain no credentials or client PII.
- Competitor pricing and rankings are point-in-time as stated within each report.
