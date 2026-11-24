# Into the Wild · Difficulty configuration and measurement

Pace is interpolated between the starts. Probabilities are conditional on compatible rows. A finite safety window takes precedence over a requested pattern. The final column is the center of the requested flock cadence. Cooldowns and upcoming timed gates affect individual arrivals.

| Stage | Active s | Territory | Label | Start m/s | Base gap s | Second blocker | Timed gate | Gate pair | Dodge follow-up | Risk pickup | Washout | Flock s |
| ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 0 | Gulf Coast Marsh | Rookie | 11.00 | 1.55 | 14% | 9% | 0% | 0% | 0% | 0% | 24 |
| 2 | 15 | Gulf Coast Marsh | Rookie | 14.30 | 1.48 | 23% | 16% | 6% | 0% | 0% | 0% | 23 |
| 3 | 30 | Southern Cypress Swamp | Rookie | 18.32 | 1.40 | 31% | 21% | 12% | 5% | 0% | 0% | 22 |
| 4 | 45 | Southern Cypress Swamp | Rookie | 19.59 | 1.34 | 40% | 26% | 20% | 9% | 1% | 0% | 21 |
| 5 | 60 | Mississippi Flyway | Field Dog | 20.82 | 1.28 | 48% | 30% | 27% | 13% | 3% | 0% | 20 |
| 6 | 75 | Mississippi Flyway | Field Dog | 21.74 | 1.23 | 55% | 34% | 34% | 18% | 4% | 0% | 19 |
| 7 | 90 | Arkansas Flooded Timber | Field Dog | 22.59 | 1.18 | 62% | 37% | 40% | 23% | 6% | 0% | 18 |
| 8 | 105 | Arkansas Flooded Timber | Field Dog | 23.39 | 1.14 | 68% | 40% | 45% | 28% | 8% | 0% | 17 |
| 9 | 120 | Midwest Farm Country | Seasoned Hunter | 24.15 | 1.10 | 73% | 43% | 49% | 32% | 10% | 0% | 16 |
| 10 | 135 | Midwest Farm Country | Seasoned Hunter | 24.81 | 1.07 | 78% | 46% | 53% | 36% | 12% | 0% | 15 |
| 11 | 150 | Prairie Potholes | Seasoned Hunter | 25.40 | 1.04 | 82% | 49% | 58% | 41% | 14% | 4% | 14 |
| 12 | 165 | Prairie Potholes | Seasoned Hunter | 25.96 | 1.01 | 86% | 52% | 62% | 45% | 16% | 4% | 13 |
| 13 | 180 | Dakota Wetlands | Veteran | 26.46 | 0.98 | 89% | 55% | 66% | 49% | 18% | 5% | 12 |
| 14 | 195 | Dakota Wetlands | Veteran | 26.91 | 0.95 | 92% | 58% | 70% | 53% | 20% | 5% | 11 |
| 15 | 210 | Northern Borderlands | Veteran | 27.31 | 0.92 | 94% | 61% | 74% | 57% | 22% | 6% | 10.5 |
| 16 | 225 | Northern Borderlands | Veteran | 27.66 | 0.90 | 96% | 64% | 78% | 61% | 24% | 6% | 10 |
| 17 | 240 | Canadian Boreal Forest | Northern Expedition | 27.99 | 0.88 | 98% | 67% | 82% | 65% | 26% | 7% | 9.6 |
| 18 | 255 | Canadian Boreal Forest | Northern Expedition | 28.30 | 0.86 | 99% | 70% | 86% | 69% | 28% | 7% | 9.2 |
| 19 | 270 | Canadian Mountain Wilderness | Wilderness Legend | 28.58 | 0.84 | 100% | 73% | 90% | 73% | 30% | 8% | 8.8 |
| 20 | 285 | Canadian Mountain Wilderness | Wilderness Legend | 28.87 | 0.82 | 100% | 77% | 94% | 77% | 32% | 8% | 8.4 |

## Matched 512-seed survey

Each pair shows 5.4 → 5.5 on the same seed list. Encounter, occupied, lane, jump, slide and linked counts are per active minute for the 15-second bin. Occupied counts rows with at least two occupied lanes or a full-width gate. Lane changes follow the validated route, so a decrease can reflect more full-width actions or a jump/slide pair that stays in one lane. A linked row arrives within 1.65 seconds of the previous hazard and includes a timed gate or a planned lane change. Families count observed distinct hazard-type pairs. The reaction column is the 10th percentile of modeled time available on lane changes after clearance and steering, not a human reaction measurement. Some 15-second bins dip due to flood spans, gate recovery or flock cadence.

| Stage | Midpoint m/s | Encounters/min | Occupied rows/min | Lane changes/min | Required jumps/min | Required slides/min | Linked rows/min | Reaction p10 s | Pair families |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 12.65 → 12.65 | 32 → 32 | 8.4 → 8.4 | 18.2 → 18.2 | 4.6 → 4.6 | 0.2 → 0.2 | 14.5 → 14.5 | 0.856 → 0.856 | 227 → 227 |
| 2 | 16.31 → 16.31 | 36 → 36.7 | 7.5 → 12.9 | 22.3 → 20.4 | 2.1 → 3.9 | 1.1 → 1.8 | 19 → 26.9 | 0.888 → 0.828 | 258 → 319 |
| 3 | 18.91 → 18.95 | 40 → 42.3 | 16.1 → 20 | 21.8 → 21.7 | 5.1 → 7 | 2.3 → 3.1 | 30.1 → 33.8 | 0.798 → 0.795 | 425 → 459 |
| 4 | 20.09 → 20.2 | 40.7 → 41.1 | 13.6 → 19.9 | 23.8 → 21 | 3.8 → 6.3 | 1.6 → 3.2 | 30.7 → 32.5 | 0.804 → 0.741 | 466 → 517 |
| 5 | 21.09 → 21.28 | 43.2 → 43.6 | 22 → 27 | 22.8 → 21.5 | 6.4 → 7.6 | 2.9 → 4.9 | 34.1 → 35.7 | 0.731 → 0.695 | 587 → 619 |
| 6 | 21.91 → 22.16 | 43.7 → 45 | 20.7 → 30.4 | 23.9 → 21.8 | 5.1 → 7.7 | 2.8 → 5.7 | 33.7 → 35.8 | 0.734 → 0.644 | 597 → 664 |
| 7 | 22.68 → 22.99 | 43.8 → 44.9 | 28.2 → 35.1 | 23.3 → 21.7 | 5.8 → 8.2 | 3.6 → 5.3 | 34.1 → 34.8 | 0.661 → 0.598 | 902 → 837 |
| 8 | 23.39 → 23.77 | 44.6 → 45.6 | 28.3 → 38.3 | 22.3 → 21.2 | 6.6 → 9.3 | 4.2 → 5.9 | 34.3 → 36 | 0.663 → 0.56 | 866 → 833 |
| 9 | 24.1 → 24.48 | 47.4 → 50.2 | 37.9 → 45.6 | 27.4 → 26.4 | 5.8 → 10.2 | 4.4 → 6.9 | 37.5 → 43.1 | 0.602 → 0.532 | 1207 → 1046 |
| 10 | 24.81 → 25.1 | 47.6 → 51.5 | 38 → 48 | 27.3 → 26.9 | 6 → 10.8 | 4.9 → 7.3 | 38.2 → 45 | 0.609 → 0.533 | 1251 → 1034 |
| 11 | 25.45 → 25.68 | 48.8 → 51.4 | 42.2 → 49 | 27.4 → 26.1 | 6.1 → 11 | 5.1 → 7.9 | 38.1 → 44.1 | 0.571 → 0.523 | 1119 → 834 |
| 12 | 26.05 → 26.21 | 48.7 → 52.3 | 42.2 → 50.6 | 28.2 → 26.1 | 6.4 → 11.1 | 5.3 → 8.5 | 39.4 → 44.8 | 0.571 → 0.508 | 1151 → 761 |
| 13 | 26.58 → 26.68 | 50.3 → 53.8 | 45.6 → 52.4 | 28.2 → 26.8 | 6.9 → 11.5 | 6.2 → 8.8 | 40.6 → 45.8 | 0.562 → 0.437 | 1085 → 714 |
| 14 | 27.05 → 27.11 | 50.7 → 54.5 | 45.8 → 53.4 | 29.1 → 26.5 | 6.4 → 11.8 | 5.6 → 9.4 | 40.5 → 46.2 | 0.554 → 0.425 | 1089 → 665 |
| 15 | 27.49 → 27.48 | 51.8 → 55.5 | 49.5 → 54.8 | 28.6 → 26 | 7.7 → 12.1 | 7.4 → 10.2 | 43.1 → 46.8 | 0.53 → 0.426 | 1000 → 619 |
| 16 | 27.9 → 27.83 | 52.1 → 55.4 | 49.8 → 55 | 28.8 → 25.6 | 7.1 → 12.5 | 6.9 → 10.1 | 42.4 → 46.7 | 0.522 → 0.427 | 1017 → 579 |
| 17 | 28.26 → 28.15 | 53.2 → 55.5 | 51.9 → 55.4 | 28.9 → 25.2 | 7.5 → 12.4 | 8.2 → 10.4 | 44.1 → 46.3 | 0.504 → 0.429 | 914 → 546 |
| 18 | 28.55 → 28.44 | 53 → 55.7 | 51.8 → 55.6 | 29.1 → 25.2 | 7.8 → 12.8 | 7.6 → 10.8 | 43.9 → 47 | 0.502 → 0.43 | 953 → 537 |
| 19 | 28.7 → 28.72 | 55 → 55.9 | 55 → 55.9 | 28.8 → 25 | 8 → 12.9 | 9.1 → 11 | 45.5 → 47 | 0.559 → 0.431 | 803 → 469 |
| 20 | 28.7 → 28.87 | 55 → 55.7 | 55 → 55.7 | 29.1 → 24.6 | 7.8 → 13 | 9.3 → 11.1 | 45.7 → 46.9 | 0.554 → 0.432 | 818 → 448 |

Reproduce both surveys with `npm run test:difficulty-survey -- /path/to/5.4 512` and `npm run test:difficulty-survey -- . 512`. The baseline was merged commit `486afa5`. The script reports optional bonus routes and single-lane rows in its JSON output.
