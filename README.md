# agent-output

Research and analysis deliverables produced by the Hermes agent for Xavier Singletary.

Reports are self-contained single-file HTML — no build step, no external dependencies. Open the file directly, or serve the folder.

**Live site:** https://agent-output-production.up.railway.app

## Reports

| Report | Date | What it covers |
|---|---|---|
| [Positioning Research — xsingletary.com](reports/xsingletary-positioning-research/) | 2026-10-13 | Competitive teardown of the fractional GTM-engineering market, search priority order, competitor-positioning map, and per-page positioning briefs. |

## Layout

```
server.mjs      # zero-dependency static server (binds 0.0.0.0:$PORT)
package.json    # start script — this is what lets the host build the app
railway.toml    # deploy config: builder, start command, healthcheck
reports/
  <slug>/
    index.html  # the report
```

One folder per report so the path stays stable and can be served directly.
Directory URLs work with or without a trailing slash; folders without an
`index.html` get an auto-generated listing, so a new report appears in the
browser the moment it is pushed.

## Viewing

- **Hosted:** https://agent-output-production.up.railway.app — `/reports/<slug>/`
- **Local:** `npm start`, then open http://localhost:3000
- **GitHub:** [htmlpreview](https://htmlpreview.github.io/?https://github.com/Xsing33/agent-output/blob/main/reports/xsingletary-positioning-research/index.html), or enable GitHub Pages on `main` (root) for `https://xsing33.github.io/agent-output/reports/<slug>/`

## Deploying

The service is connected to this repo and deploys automatically on push to `main`.

If a push does not trigger a build, deploy manually — note that the path must be
**absolute and paired with `--path-as-root`**, or the archive nests the folder and
the builder finds no app:

```
railway up /absolute/path/to/agent-output --path-as-root -s agent-output -d
```

Health check: `GET /healthz`.

## Notes

- Reports contain no credentials or client PII.
- Competitor pricing and rankings are point-in-time as stated within each report.
