# RC.10 gameplay evidence

The captures use the production renderer and controls. Studio examples are labeled and contain synthetic receipts. Browser footage uses software graphics.

## Moving gameplay

- [Matched opening creek clip](creek-pair.mp4). RC.9 on the left and RC.10 on the right. Seed 7, Low graphics and fixed simulation checkpoints. This shows the opening pickup line and jump. The clip samples game frames at fixed intervals.
- [Offline hunts and Final Moments](first-hunts-and-recap.mp4). Actual two-profile browser installation, hunt, loss, results, optional recap and one-tap replay. A real hunt crossed the first XP threshold. The 320 px review asserts the XP bar fits in the initial results view. [Offline save and replay check](compact-replay.json)
- [Matched Hunt Over before](screens/before-hunt-over.jpg) and [after](screens/after-hunt-over.jpg). Seed-7 creek entry, Low graphics. This matched diagnostic does not award account progression. [Separately earned results](screens/after-ordinary-result.jpg) · [Optional final-moments view](screens/after-watch-final-moments.jpg)

## Endless

The [difficulty chart](difficulty.svg) shows the actual model parameters. The [raw curve and sample counts](difficulty.json) include old and new rates from the same seed. A continuous offline run reached 606.01 simulated seconds, and a rerun reached 606.20. The resource check exceeded the existing geometry limit in both runs. The accelerated software fixture uses a 102 × 181 drawing buffer and is a compatibility test.

[Raw continuous run](continuous-offline.json) · [Resource retest](continuous-retest.json) · [Final territory capture](journey/journey-mountain.jpg)

| Gameplay renderer checkpoint | Isolated Studio view |
| --- | --- |
| 5 min | [Manitoba](screens/studio-minute-5.jpg) |
| 10 min | [Endless](screens/studio-minute-10.jpg) |
| 15 min | [Endless](screens/studio-minute-15.jpg) |
| 20 min | [Endless](screens/studio-minute-20.jpg) |
| 30 min | [Endless](screens/studio-minute-30.jpg) |

[Journey stills across all 15 territories](journey/) · [Seeded 60-minute results](survey.ndjson) · [120-minute and action timing traces](timing-windows.ndjson)

## Hunt Over fixtures

| Result | Rendered Studio example |
| --- | --- |
| Ordinary | [View](screens/studio-ordinary.jpg) |
| Personal record | [Record comparison](screens/studio-record.jpg) |
| Partial XP | [Partial meter](screens/studio-partial.jpg) |
| Single level | [Exact advancement](screens/studio-level.jpg) |
| Multiple levels | [Overflow and final level](screens/studio-multi.jpg) |
| Rank | [Rank advancement](screens/studio-rank.jpg) |
| Equipment | [Earned vest](screens/studio-equipment.jpg) |
| Trophy | [Earned trophy](screens/studio-trophy.jpg) |
| Lodge | [Lodge advancement](screens/studio-lodge.jpg) |
| Rare discovery | [Journal discovery](screens/studio-rare.jpg) |
| Great Migration | [Route completion](screens/studio-migration.jpg) |
| Master Hunter | [Boyd tribute](screens/studio-master.jpg) |

The browser exercised the same XP display across all 12 fixtures, skipped a multi-level award and checked the exact 125 XP overflow. Reduced motion produced the same settled value. The Studio save key stayed unchanged.

## Remaining measurements

The evidence pairs representative openings and results, with isolated examples for the later mechanics and rewards. Physical iPhone captures across weather, graphics, high-speed collection, different movement chains and rare naturally earned results remain pending. The long compatibility traces do not establish human survival, fair camera recognition for every combination, or native frame pacing.
