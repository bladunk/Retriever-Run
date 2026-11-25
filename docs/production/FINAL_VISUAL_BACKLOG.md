# Phase 08B · Final visual production backlog

Start with the recognizable figures players see most often. Keep Boyd’s approved derived art and private-reference exclusion policy. Review small portrait crops and moving gameplay before promoting a production batch. The existing tooling covers Blender source and bake, glTF simplification, texture packing, manifest verification and matched gameplay captures. [Art pipeline](ART_PIPELINE.md) · [Runtime budgets](PERFORMANCE_BUDGET.md)

| Priority | Area and current limit | Production target and method | Runtime and rights |
| --- | --- | --- | --- |
| 1 | Field Journal uses three photographs and 26 family silhouettes | Supply a faithful portrait for every species in the queue below. The main field mark should survive the 420 × 294 crop. Use verified photographs, commissioned natural-history originals or a Blender orthographic render of a reference-checked rig | Reuse the existing responsive lazy-loaded registry. Set a byte budget per derivative. Document crop and edits. Prefer CC0 and CC BY and preserve standalone share-alike terms where applicable |
| 1 | Labrador and Boyd moves share limited retargeted motion and procedural blends | Improve the physical gallop, lumbar movement, takeoff, landing, crouch, carrying and Kennel idles in Blender. Compare both dogs from the rear running camera and check gear contact | One live skeletal instance per dog in each active view, bounded motion clips and reuse of coat textures. Preserve the mesh credit and record new clip rights. Keep Boyd sources private |
| 1 | Wildlife ranges from authored skinned assets to simplified silhouettes | Begin with duck, goose, pheasant, crane, deer and raptor proportions, flight/flushing mechanics and profile recognition. Preserve the current exact encounter schedule | Keep existing safe-period shader/rig preparation and two-rig cap. License each model, photograph or clip separately. Bake sharing-friendly LODs |
| 1 | Water, banks and vegetation vary by territory and have visible seams at some crossings | Finish continuous banks, wet/dry materials, depth, directional ripples and believable reeds. Match patches to real habitat; limit tall specimens near travel lanes. Preserve readable jumpable spans | Share regional atlas variants and water material paths in the existing tile lifecycle. Use original models or proven CC0 scans |
| 2 | Five authentic but stylized Lodge miniatures, mostly reused awards | Re-bake Hunting Shack, Retriever’s Cabin, Waterfowl Lodge, Flyway Estate and Legendary Lodge. Improve timber, fireplaces, maps, interior lighting, silhouettes and era-specific gear | Keep display/ownership data independent. Bake illustrations with the Blender Lodge source and lazy decode one active room. Use original interiors and separately licensed reference-derived art |
| 2 | Shared trophy tiers and form factors are repetitive | Distinct original decoys, framed wildlife observations, regional plaques, rarity treatments and humorous artifacts. Protect text contrast and the separation of sightings and retrieves | Group illustrations in lightweight atlases with native-size derivatives. Prefer authored art; retain portrait-level credits if used |
| 2 | Equipment families share base geometry and material treatments | Representative fitted vests, collars and bandanas with recognizably different silhouettes, surface materials and attachment points. Review all using motion captures | Reuse attachment rig and texture sets. Keep one worn set and one preview. Avoid commercial logos and unlicensed patterned graphics |
| 2 | Day, fog and bounced light still rely on limited regional rendering | Affordably improve contact shadows, fog layers, sky, contrast, surface roughness and water highlights while maintaining hazard recognition across presets | Prefer shared materials and baked lighting when appropriate. Approve native frame stability before expanding draw calls or atlas residency. Use original or license-checked textures |
| 3 | Menu and awards use approved hero art and text-first reward cues | Keep Boyd composition. Improve rank insignia, field-report illustrations, Lodge transitions, and an optional brief prestige flourish. Review anonymous onboarding and a multi-award restart | Respect reduced motion and immediate Play Again. Serve separate small responsive derivatives. Approved Boyd artwork and original presentation only |

## Territory production sequence

This pass starts at the normal running camera and adjusts environment art without changing the validated course. Inspect draw calls and resident packs through each matching territory’s departure.

| Territory | First environment target |
| --- | --- |
| Gulf Coast Marsh | Preserve the art-pipeline slice. Strengthen tidal depth gradients, near-bank fine debris and thin cordgrass silhouettes |
| Southern Cypress Swamp | Preserve the owner-approved canopy composition. Refine reflected trunks, wet roots and highlights under the elevated structures |
| Mississippi Delta | Seasonal hardwood silhouettes, mud banks, waterborne silt and low farm-edge shelter |
| Arkansas Flooded Timber | Waterlines up trunks, submerged root layers and readable sightlines in dense flooded areas |
| Ozark River Country | Shelving rock, winding river shallows, shaded bluff transitions and deciduous bank texture |
| Midwest Farm Country | Cornfield depth, cropped field edges and weathered working farm structures |
| Platte River Valley | Preserve the approved open floodplain. Improve shallow sandbars, sandhill crane framing and distant cottonwood layers |
| Nebraska Sandhills | Sand and prairie grass transitions, low riparian detail and grounded rural structures |
| Dakota Prairie Potholes | Seasonal reedy ponds, open prairie depth and water-to-land gradients |
| Northern Dakota Wetlands | Low working sheds, shoreline contact, reed clusters and sky depth |
| Manitoba Marshlands | Open reflective water, marsh textures and northbound seasonal shifts |
| Saskatchewan Parklands | Mixed aspen groups, broad sloughs and distinct parkland edge transitions |
| Canadian Boreal Forest | Wind-broken conifer groups, understory and darker wet shoreline material |
| Rocky Mountain Foothills | Scale relationships among ridges, scree, tall trees and streamcut paths |
| Canadian Mountain Wilderness | Layered silhouettes, snow-to-scree transitions, wet ramp highlights and safe distant fog |

## Journal portrait queue

Each entry below has a stable `species-<catalog-id>` key and an educational source in the wildlife catalog. Treat the current silhouettes as navigation aids. Verify sex, age, seasonal plumage and visual field marks in the licensed candidate before integrating it.

| Species | Current art | Review target |
| --- | --- | --- |
| Mallard | Licensed photo | Keep drake’s green head and blue speculum references. Add a hen when the layout can accommodate it |
| Wood Duck | Licensed photo | Keep recognizable crest and white facial lines. Review a tight field crop and consider a second female plumage |
| Northern Pintail | Profile silhouette | Long raised tail, slender neck and appropriate drake chest stripe |
| American Wigeon | Duck silhouette | Pale crown, eye patch and short blue-gray bill |
| Gadwall | Duck silhouette | Fine markings, contrasting rump and white speculum |
| Green-winged Teal | Teal silhouette | Distinctive eye patch and correct small proportions |
| Blue-winged Teal | Teal silhouette | White face crescent and blue shoulder patch |
| Northern Shoveler | Broad-bill silhouette | Broad spatulate bill and contrasting male flanks |
| Canvasback | Diving duck silhouette | Forward-sloping forehead, long bill and pale back |
| Redhead | Diving duck silhouette | Rounded head, steeper forehead and blue-gray bill |
| Ring-necked Duck | Crested diver silhouette | Angular head, bill bands and flank wedge |
| Lesser Scaup | Diving duck silhouette | Rear crown peak, dark chest and narrow pale sides |
| Common Goldeneye | Diving duck silhouette | Golden eye and round facial patch at bill base |
| Bufflehead | Diving duck silhouette | Compact shape with broad white head patch |
| Hooded Merganser | Merganser silhouette | Hooded crest and narrow bill |
| Common Merganser | Merganser silhouette | Long straight red bill, long posture and suitable plumage |
| Canada Goose | Goose silhouette | Correct large form, black neck and cheek strap |
| Snow Goose | Goose silhouette | White morph with black primaries and bill line |
| Ross’s Goose | Goose silhouette | Smaller round head with shorter, straighter bill |
| Greater White-fronted Goose | Goose silhouette | White bill base, dark barring and orange legs |
| Cackling Goose | Goose silhouette | Short neck, small bill and stockier head than Canada Goose |
| Ring-necked Pheasant | Long-tailed bird silhouette | Long tapered tail, face and collar marks |
| Sandhill Crane | Long-necked silhouette | Readable scarlet crown and extended flight posture |
| Great Blue Heron | Wader silhouette | Blue-gray plumage, dark crown stripe and tucked flight neck |
| Great Egret | Wader silhouette | White plumage, dark legs and light bill |
| Bald Eagle | Raptor silhouette | Adult dark wings, white head and yellow bill |
| White-tailed Deer | Mammal silhouette | Appropriate proportions and unmistakable tail underside |
| Moose | Mammal silhouette | Shoulder hump, long muzzle and seasonally appropriate antlers |
| American Alligator | Licensed photo and reptile silhouette | Preserve broad snout, low body and tapering tail |
