# Living Wilderness register

The terrain and territory registry controls habitat suitability and distribution independently of the obstacle and scoring systems.

| Territory | Common | Uncommon | Rare | Exceptional |
| --- | --- | --- | --- | --- |
| Gulf Coast Marsh | Mallard, Blue-winged Teal, Northern Shoveler, Great Egret | Green-winged Teal, Gadwall, Great Blue Heron | Greater White-fronted Goose, American Alligator | Bald Eagle |
| Southern Cypress Swamp | Wood Duck, Mallard, Great Blue Heron | Great Egret, Hooded Merganser, Green-winged Teal | White-tailed Deer, American Alligator | Bald Eagle |
| Mississippi Delta | Mallard, Gadwall, Green-winged Teal, Greater White-fronted Goose | Wood Duck, Northern Pintail, White-tailed Deer | Snow Goose, Great Blue Heron | Great Egret |
| Arkansas Flooded Timber | Mallard, Wood Duck, Gadwall | Hooded Merganser, Great Blue Heron, White-tailed Deer | Green-winged Teal, Ring-necked Duck | Bald Eagle |
| Ozark River Country | Mallard, Wood Duck, Great Blue Heron | Hooded Merganser, Common Merganser, White-tailed Deer | Common Goldeneye, Bald Eagle | Bufflehead |
| Midwest Farm Country | White-tailed Deer, Canada Goose, Ring-necked Pheasant | Mallard, American Wigeon, Northern Pintail | Snow Goose, Greater White-fronted Goose | Bald Eagle |
| Platte River Valley | Canada Goose, Mallard, Northern Pintail | Ring-necked Pheasant, American Wigeon, Cackling Goose | Sandhill Crane, Snow Goose | Ross’s Goose. The separate Platte crane passage has its own route-seed draw. |
| Nebraska Sandhills | Ring-necked Pheasant, Blue-winged Teal, Canada Goose | American Wigeon, Northern Shoveler, White-tailed Deer | Northern Pintail, Sandhill Crane | Cackling Goose |
| Dakota Prairie Potholes | Mallard, Blue-winged Teal, Northern Shoveler, Gadwall | Ring-necked Pheasant, Redhead, Northern Pintail | Canvasback, Snow Goose | Ross’s Goose |
| Northern Dakota Wetlands | Gadwall, Canada Goose, Northern Pintail, Blue-winged Teal | Ring-necked Pheasant, Canvasback, Lesser Scaup | Redhead, Cackling Goose, Snow Goose | Ross’s Goose |
| Manitoba Marshlands | Mallard, Canada Goose, Ring-necked Duck, Lesser Scaup | Bufflehead, Canvasback, Redhead | Snow Goose, Moose | Bald Eagle |
| Saskatchewan Parklands | Mallard, White-tailed Deer, Bufflehead, American Wigeon | Northern Pintail, Common Goldeneye, Ring-necked Duck, Cackling Goose | Ross’s Goose, Moose | Bald Eagle |
| Canadian Boreal Forest | Lesser Scaup, Common Goldeneye, Ring-necked Duck, Bufflehead | Common Merganser, Canada Goose | Moose, Bald Eagle | Snow Goose |
| Canadian Rocky Mountain Foothills | Canada Goose, Common Goldeneye, White-tailed Deer | Common Merganser, Mallard, Bufflehead | Moose, Bald Eagle | Sandhill Crane |
| Canadian Mountain Wilderness | Common Goldeneye, Common Merganser, Canada Goose | Bufflehead, Lesser Scaup | Bald Eagle, Moose | Cackling Goose |

## Spawn and journal contracts

The engine proposes an encounter every fourth terrain tile. It classifies candidate anchors by off-trail cover, bank, water or open air. Sites close to landmarks or trunks can be rejected. If a tile has no usable roost, suitable birds can fly past.

The first Gulf encounter is a Mallard. Subsequent draws allocate 65% common, 24% uncommon, 9% rare and 2% exceptional proposals. Terrain can reject a proposal based on available habitat. These are game frequencies, separate from conservation status.

The RC.6 pheasant begins on terrain with folded wings, then launches when the dog is 31 m from the anchor. Its motion, bank and nose follow the world-space path, with a short glide after powered flight. Mallards, teal, diving ducks, geese, other waterfowl and raptors use individual or family cadences. Canada Goose families use staggered longitudinal and lateral formation slots. Waders prefer a real shallow bank. Moose and deer sample the terrain under their moving position.

The ordinary Journal checks the central camera frustum from 5–42 m for roughly 0.22 seconds. The Platte passage checks prominent flock members through 112 m for at least 0.55 seconds and records one event per hunt. These screen and distance checks approximate visibility. Art Studio uses the same renderer with progression disabled; browser QA can use the separate sight probe for representative occlusion checks.

Each player has a separate wildlife schema, currently version 1. Entries hold observations, rare observations, retrieves, first observation date and territory. Existing Mallard and Pheasant totals seed retrieve counts only. Hunt Over commits the ledger once per run ID. Practice saves stay isolated. The wildlife-observed event can contribute to existing observation achievements. The crane passage additionally saves its first date through the RC.5 discovery ledger. It does not alter the authoritative course score.

The Field Journal displays species artwork, habitats, first sightings and lifetime totals. Hunt Over lists newly observed wildlife without interrupting the hunt.

## Species and sources

| Stable ID | Species | Silhouette family | Representative habitat | Reference |
| --- | --- | --- | --- | --- |
| mallard | Mallard | duck | Shallow wetlands and flooded fields | [Habitat reference](https://www.allaboutbirds.org/guide/Mallard/lifehistory) |
| wood-duck | Wood Duck | crest | Wooded swamps and marshes with trees | [Habitat reference](https://www.allaboutbirds.org/guide/Wood_Duck/lifehistory) |
| pintail | Northern Pintail | pintail | Open shallow wetlands and flooded grain | [Habitat reference](https://www.allaboutbirds.org/guide/Northern_Pintail/lifehistory) |
| wigeon | American Wigeon | duck | Marshes and shallow, vegetated lakes | [Habitat reference](https://www.allaboutbirds.org/guide/American_Wigeon/lifehistory) |
| gadwall | Gadwall | duck | Quiet marshes, ponds and reservoirs | [Habitat reference](https://www.allaboutbirds.org/guide/Gadwall/lifehistory) |
| green-teal | Green-winged Teal | teal | Shallow marshes and river margins | [Habitat reference](https://www.allaboutbirds.org/guide/Green-winged_Teal/lifehistory) |
| blue-teal | Blue-winged Teal | teal | Shallow ponds and seasonal wetlands | [Habitat reference](https://www.allaboutbirds.org/guide/Blue-winged_Teal/lifehistory) |
| shoveler | Northern Shoveler | spoon | Marsh pools with shallow feeding water | [Habitat reference](https://www.allaboutbirds.org/guide/Northern_Shoveler/lifehistory) |
| canvasback | Canvasback | diver | Large marshes and open freshwater | [Habitat reference](https://www.allaboutbirds.org/guide/Canvasback/lifehistory) |
| redhead | Redhead | diver | Freshwater marshes and lakes | [Habitat reference](https://www.allaboutbirds.org/guide/Redhead/lifehistory) |
| ringneck | Ring-necked Duck | crest-diver | Vegetated ponds and boreal wetlands | [Habitat reference](https://www.allaboutbirds.org/guide/Ring-necked_Duck/lifehistory) |
| scaup | Lesser Scaup | diver | Open lakes and deeper marsh pools | [Habitat reference](https://www.allaboutbirds.org/guide/Lesser_Scaup/lifehistory) |
| goldeneye | Common Goldeneye | diver | Lakes and rivers near wooded country | [Habitat reference](https://www.allaboutbirds.org/guide/Common_Goldeneye/lifehistory) |
| bufflehead | Bufflehead | diver | Small lakes and sheltered water | [Habitat reference](https://www.allaboutbirds.org/guide/Bufflehead/lifehistory) |
| hooded-merganser | Hooded Merganser | merganser | Forested wetland and river edges | [Habitat reference](https://www.allaboutbirds.org/guide/Hooded_Merganser/lifehistory) |
| common-merganser | Common Merganser | merganser | Clear lakes and rivers | [Habitat reference](https://www.allaboutbirds.org/guide/Common_Merganser/lifehistory) |
| canada-goose | Canada Goose | goose | Lakes, open fields and river shallows | [Habitat reference](https://www.allaboutbirds.org/guide/Canada_Goose/lifehistory) |
| snow-goose | Snow Goose | goose | Open wetlands and harvested fields | [Habitat reference](https://www.allaboutbirds.org/guide/Snow_Goose/lifehistory) |
| ross-goose | Ross’s Goose | goose | Open fields, marshes and northern lakes | [Habitat reference](https://www.allaboutbirds.org/guide/Rosss_Goose/lifehistory) |
| white-fronted-goose | Greater White-fronted Goose | goose | Grain fields, marshes and large ponds | [Habitat reference](https://www.allaboutbirds.org/guide/Greater_White-fronted_Goose/lifehistory) |
| cackling-goose | Cackling Goose | goose | Prairie wetlands and open migration staging areas | [Habitat reference](https://www.allaboutbirds.org/guide/Cackling_Goose/lifehistory) |
| pheasant | Ring-necked Pheasant | pheasant | Tall grass, corn margins and agricultural cover | [Habitat reference](https://www.allaboutbirds.org/guide/Ring-necked_Pheasant/lifehistory) |
| crane | Sandhill Crane | crane | Shallow roosts on the Platte and open fields | [Habitat reference](https://www.allaboutbirds.org/guide/Sandhill_Crane/lifehistory) |
| heron | Great Blue Heron | wader | Shallow, quiet banks and marsh pools | [Habitat reference](https://www.allaboutbirds.org/guide/Great_Blue_Heron/lifehistory) |
| egret | Great Egret | wader | Southern shallow marshes and slow waters | [Habitat reference](https://www.allaboutbirds.org/guide/Great_Egret/lifehistory) |
| eagle | Bald Eagle | raptor | Wooded rivers and fish-bearing lakes | [Habitat reference](https://www.allaboutbirds.org/guide/Bald_Eagle/lifehistory) |
| deer | White-tailed Deer | deer | Field edges and broken woodland | [Habitat reference](https://mdc.mo.gov/discover-nature/field-guide/white-tailed-deer) |
| moose | Moose | moose | Northern marshes, lake edges and boreal forest | [Habitat reference](https://www.nps.gov/romo/learn/nature/moose.htm) |
| alligator | American Alligator | alligator | Warm southern backwaters and marsh banks | [Habitat reference](https://www.nps.gov/ever/learn/nature/alligator.htm) |
