---
title: "A little UI for the rails new command"
categories: ["rails", "tools", "rails new"]
---

`rails new` is the first command you run on any Rails project — and also the one
with the most flags nobody quite remembers. `--skip-`-this, `--css=`-that, and the
list keeps shifting between versions: `--skip-solid`, `--skip-kamal` and
`--skip-thruster` are Rails 8.0; `--skip-rubocop`, `--skip-brakeman` and `--skip-ci`
arrived in 7.2; `--skip-docker` and `--database=trilogy` in 7.1.

So I built a small interactive builder: flip the toggles, pick a version, copy the command.

<p style="margin:1.5em 0;">
  <a href="/rails-new/" style="display:inline-block;background:#c52f21;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px;">Open the <code style="color:#fff;background:transparent;">rails&nbsp;new</code> builder&nbsp;→</a>
</p>

A few things it does:

- **Version-aware** — the flags on offer change to match the Rails version you pick (7.0 → 8.1), so you never get `--skip-solid` on a 7.x app or `bun` on 7.0.
- **Shows what's implied** — flip on `--api` or `--minimal` and the options Rails quietly turns on for you (`--skip-javascript`, `--skip-asset-pipeline`, and so on, transitively) light up automatically — so you can see exactly what each meta-flag means.
- **Clean output** — defaults such as `--database=sqlite3`, `--javascript=importmap` and the version's asset pipeline are left out, so the command stays short.
- **Pinning** — tick *pin* to get `rails _8.0.5_ new myapp` instead of plain `rails new`.
- **Presets** — one click for *API only*, *Minimal* or *No front-end*.
- **Copy button** — of course.

It's a single static HTML file — no build step, no framework — so it loads instantly.

Or just try it right here:

<iframe src="/rails-new/" title="rails new command builder" loading="lazy" style="width:100%;height:900px;border:1px solid #e7e5e4;border-radius:14px;background:#f5f5f4;margin-top:.5em;"></iframe>
