# Dr. Kaldawi Patient Guide

A static website: no server, no database, nothing about patients is stored. Host it free on GitHub Pages.

## Where things live

| What | File |
|---|---|
| Medicine guide, one file per section | `content/medications/01.md` … `18.md`, `c2.md` (immune medicines) |
| Rules for every medicine (Part A) | `content/medications/a-rules.md` |
| For everyone on immune medicines (C1) | `content/medications/c1.md` |
| Before you message us | `content/medications/before-you-message.md` |
| Lifestyle | `content/lifestyle/general.md`, `seeds.md`, `oh-pots.md` |
| Resources | `content/resources.md` |
| Handouts (Epley, controlled medicine agreement) | `content/handouts/` |
| Tracking scores (questions and scoring) | `assets/scores.js` |
| Diagnoses in the plan builder | `assets/plan-config.js` |

## Editing the medicine files

Plain Markdown, plus a few tags in curly braces at the end of a heading:

- `## Gabapentin (Neurontin) {#gabapentin}`: one medicine. The `#id` must stay unique; the plan links use it.
- `### Some heading`: shown with every medicine in that section (for example "About this condition").
- `### Box title {applies=gabapentin,pregabalin}`: a shared box shown only when one of those medicines is on the plan.
- `#### Plan A: Standard {choice default}`: an option inside a medicine (lamotrigine plans, prednisone schedules). The plan builder lets you tick which ones apply. `default` = ticked automatically; `when=mg` = ticked automatically for that diagnosis.
- A blank to fill in is written `\_\_\_\_\_\_`. The first "My dose: \_\_\_" in a medicine is replaced by the dose typed in the plan builder.

## Yearly update

Edit the text files on GitHub (pencil icon), commit, and the site updates in a minute or two. Update "Last reviewed" in `index.html`.
