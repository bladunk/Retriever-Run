# Into the Wild · Obstacle art and collision audit

The gallery renders the production art, atmosphere, terrain and Labrador. The two camera positions show the normal follow distance and a close inspection angle. The fixture isolates one hazard at a time so its silhouette is readable. Full runs are in the [southern](south.webp) and [northern](north.webp) galleries.

- [Timber, sign, fence and tractor hazards](obstacle-gallery-timber.webp)
- [Water hazards and diving geese](obstacle-gallery-water.webp)
- [5.4 versus all three 5.5 fallen-tree designs at 6,118 m](fallen-timber-comparison.webp)

| Hazard | What players see and what to do | Art and collision review |
| --- | --- | --- |
| Small log | Low horizontal bark and a cut end. Jump or change lanes. | Core, crown and base volumes follow the timber. |
| Exposed root | Low root or twisted snag at ground level. Jump or change lanes. | The lowered profile and off-axis root are reflected in the volume and scale. |
| Driftwood | Water-worn low wood with a lateral swing. Jump or leave its sweep. | The model and swept test use the same moving offset. |
| Standing snag or stump | Short upright trunk with a pale crown. Change lanes when sightlines or timing are uncertain. | One upright trunk volume. Taller habitat trees remain beyond the trail. |
| Fence | Two upright posts plus two rails. Choose the route around it. | Posts and rails use separate collision parts. |
| Posted timber sign | A bright board attached to low timber with an upright. Duck or change lanes. | Lettering is painted onto the approach face. The beam and post retain their established collision. |
| Full-width low timber | One continuous beam on two end posts. Slide beneath it. | The overhang has separate beam, upper timber and end-post parts. |
| Uprooted tree | Torn trunk, root forks and a raised mass of entrained soil. Leave the lane. | All three variants fit the shared lower roots, crown, raised roots and downed trunk envelope. Small root ends and mineral fragments serve as surface detail. |
| Tractor | Red engine, cab and exposed dark wheels. Change lanes. | Original art preserved. Engine, cab and wheels have separate volumes. |
| Puddle | Local patch of shallow water. Jump or steer around it. | Several overlapping parts follow the tapered puddle edge and check paw contact. |
| Creek | Water crossing that spans the trail. Jump it. | The wide water threshold tracks paw contact while leaving the verified jump window. |
| Flooded lane | One sustained band of water with an open route alongside it. Leave the lane until it ends. | The continuous rendered ribbon covers the existing series of water segments. Its span exceeds a full jump at maximum speed. |
| Diving goose | A low-moving Canada goose with its flight formation. Duck or change lanes. | The moving neck, head and body volumes share the art’s trajectory. Higher background birds serve as scenery. |

The old fallen-tree art joined short cylinders from similar attachment points. Its repeated light-colored ends read as spokes when seen down-trail. The three replacements have separately authored root paths and silhouette profiles. They are named **Peat root plate**, **Silt-split roots**, and **Mossbound crown**. Each uses a tapered curved trunk with an irregular end-grain cap, forked roots, a deformed soil mass, rocks, and mottled surface color. Their visible height is roughly 2.2 m. The collision contract stays common so timing learned from one tree applies to the others. Fixed-step sweeps tested attempted jumps and slides at seven timings and confirmed both adjacent-lane dodges for each variant.

The 6,118 m comparison reconstructs the coordinate in the brief with merged 5.4 and current 5.5 art. Run `node scripts/obstacle-gallery.mjs` after installing a Playwright browser to reproduce current views. For a baseline comparison, use a checkout of `486afa5`, copy the two `scripts/fixtures/obstacle-gallery.*` files into that checkout, install its dependencies, and set `FIELD_STUDIO_SOURCE` to the checkout with the `baseline` argument.
