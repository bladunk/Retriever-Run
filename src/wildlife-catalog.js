// Body, head and wing colors are field marks for stylized game illustrations.
// The last three numbers describe length in metres, bill proportions and neck.
export const fieldSpecies = Object.freeze(Object.fromEntries([
  ['mallard','Mallard','duck','Mallard',0x7f8072,0x205445,0x445783,.58,1,1,'Shallow wetlands and flooded fields'],
  ['wood-duck','Wood Duck','crest','Wood_Duck',0x995b37,0x244942,0x314d60,.49,.72,1,'Wooded swamps and marshes with trees'],
  ['pintail','Northern Pintail','pintail','Northern_Pintail',0x96918a,0x614634,0x69514a,.66,.90,1.58,'Open shallow wetlands and flooded grain'],
  ['wigeon','American Wigeon','duck','American_Wigeon',0xa3836d,0x5c6651,0x6b7671,.49,.75,.86,'Marshes and shallow, vegetated lakes'],
  ['gadwall','Gadwall','duck','Gadwall',0x8c857d,0x836e5b,0xe1d6bd,.49,.99,.92,'Quiet marshes, ponds and reservoirs'],
  ['green-teal','Green-winged Teal','teal','Green-winged_Teal',0x9a9082,0x7c4633,0x486658,.34,.64,.79,'Shallow marshes and river margins'],
  ['blue-teal','Blue-winged Teal','teal','Blue-winged_Teal',0x9a7256,0x655e67,0x688297,.39,.73,.81,'Shallow ponds and seasonal wetlands'],
  ['shoveler','Northern Shoveler','spoon','Northern_Shoveler',0xa45d35,0x264c37,0x617a88,.50,1.62,.96,'Marsh pools with shallow feeding water'],
  ['canvasback','Canvasback','diver','Canvasback',0xc0bfb0,0x8c4734,0x77756d,.56,1.22,1.14,'Large marshes and open freshwater'],
  ['redhead','Redhead','diver','Redhead',0x8c8a82,0x8f4d33,0x656667,.49,.97,.89,'Freshwater marshes and lakes'],
  ['ringneck','Ring-necked Duck','crest-diver','Ring-necked_Duck',0x858885,0x36383d,0x575455,.43,1.04,.91,'Vegetated ponds and boreal wetlands'],
  ['scaup','Lesser Scaup','diver','Lesser_Scaup',0xbbbab2,0x36343f,0x72766f,.42,1.07,.87,'Open lakes and deeper marsh pools'],
  ['goldeneye','Common Goldeneye','diver','Common_Goldeneye',0xd6d4c3,0x213f35,0x4b544e,.47,.77,.88,'Lakes and rivers near wooded country'],
  ['bufflehead','Bufflehead','diver','Bufflehead',0xe0ded0,0x313f50,0x403d42,.34,.66,.74,'Small lakes and sheltered water'],
  ['hooded-merganser','Hooded Merganser','merganser','Hooded_Merganser',0xa37246,0x34373a,0x55505a,.47,.89,.95,'Forested wetland and river edges'],
  ['common-merganser','Common Merganser','merganser','Common_Merganser',0xdddbce,0x24473f,0x373737,.62,1.41,1.14,'Clear lakes and rivers'],
  ['canada-goose','Canada Goose','goose','Canada_Goose',0x82715e,0x2b2c28,0x625944,.94,.99,1.26,'Lakes, open fields and river shallows'],
  ['snow-goose','Snow Goose','goose','Snow_Goose',0xe0dfd5,0xe0ded5,0x423d3a,.76,.99,1.05,'Open wetlands and harvested fields'],
  ['ross-goose','Ross’s Goose','goose','Rosss_Goose',0xe6e3dd,0xe3e0d7,0x383837,.61,.68,.84,'Open fields, marshes and northern lakes'],
  ['white-fronted-goose','Greater White-fronted Goose','goose','Greater_White-fronted_Goose',0x8a7660,0x82746a,0x5b5650,.72,.92,.95,'Grain fields, marshes and large ponds'],
  ['cackling-goose','Cackling Goose','goose','Cackling_Goose',0x756757,0x2c2c29,0x503f34,.61,.63,.83,'Prairie wetlands and open migration staging areas'],
  ['pheasant','Ring-necked Pheasant','pheasant','Ring-necked_Pheasant',0x9b5331,0x284437,0x765338,.78,.78,.96,'Tall grass, corn margins and agricultural cover'],
  ['crane','Sandhill Crane','crane','Sandhill_Crane',0xa59d8f,0xa76a5b,0x6c6960,1.17,1.29,2.4,'Shallow roosts on the Platte and open fields'],
  ['heron','Great Blue Heron','wader','Great_Blue_Heron',0x6d8388,0xa9aaa1,0x505c63,.98,1.55,2.25,'Shallow, quiet banks and marsh pools'],
  ['egret','Great Egret','wader','Great_Egret',0xe6e1ce,0xe6e1ce,0xd0cdbb,.94,1.46,2.52,'Southern shallow marshes and slow waters'],
  ['eagle','Bald Eagle','raptor','Bald_Eagle',0x534435,0xe7e1d1,0x43372c,.88,1.15,.86,'Wooded rivers and fish-bearing lakes'],
  ['deer','White-tailed Deer','deer','',0xa87d58,0x927152,0x504536,1.69,1,1,'Field edges and broken woodland'],
  ['moose','Moose','moose','',0x695746,0x52483c,0x8e785f,2.14,1,1,'Northern marshes, lake edges and boreal forest'],
  ['alligator','American Alligator','alligator','',0x62634b,0x72765a,0x535b47,2.35,1,1,'Warm southern backwaters and marsh banks'],
].map(([id, name, family, cornell, body, head, wing, size, bill, neck, habitat]) => [id, Object.freeze({
  id, name, family, body, head, wing, size, bill, neck, habitat,
  source: cornell ? 'https://www.allaboutbirds.org/guide/' + cornell + '/lifehistory' :
    { deer: 'https://mdc.mo.gov/discover-nature/field-guide/white-tailed-deer',
      moose: 'https://www.nps.gov/romo/learn/nature/moose.htm',
      alligator: 'https://www.nps.gov/ever/learn/nature/alligator.htm' }[id],
})])))

export const retrieveSpecies = { mallard: 'mallard', pheasant: 'pheasant' }

// Tiers describe game presentation frequency within a territory.
export const encounterTiers = ['common', 'uncommon', 'rare', 'exceptional']
export const habitatEncounters = {
  gulf: [
    ['mallard','blue-teal','shoveler','egret'], ['green-teal','gadwall','heron'], ['white-fronted-goose','alligator'], ['eagle']],
  cypress: [
    ['wood-duck','mallard','heron'], ['egret','hooded-merganser','green-teal'], ['deer','alligator'], ['eagle']],
  flyway: [
    ['mallard','gadwall','green-teal','white-fronted-goose'], ['wood-duck','pintail','deer'], ['snow-goose','heron'], ['egret']],
  timber: [
    ['mallard','wood-duck','gadwall'], ['hooded-merganser','heron','deer'], ['green-teal','ringneck'], ['eagle']],
  ozark: [
    ['mallard','wood-duck','heron'], ['hooded-merganser','common-merganser','deer'], ['goldeneye','eagle'], ['bufflehead']],
  farm: [
    ['deer','canada-goose','pheasant'], ['mallard','wigeon','pintail'], ['snow-goose','white-fronted-goose'], ['eagle']],
  platte: [
    ['canada-goose','mallard','pintail'], ['pheasant','wigeon','cackling-goose'], ['crane','snow-goose'], ['ross-goose']],
  sandhills: [
    ['pheasant','blue-teal','canada-goose'], ['wigeon','shoveler','deer'], ['pintail','crane'], ['cackling-goose']],
  prairie: [
    ['mallard','blue-teal','shoveler','gadwall'], ['pheasant','redhead','pintail'], ['canvasback','snow-goose'], ['ross-goose']],
  dakota: [
    ['gadwall','canada-goose','pintail','blue-teal'], ['pheasant','canvasback','scaup'], ['redhead','cackling-goose','snow-goose'], ['ross-goose']],
  manitoba: [
    ['mallard','canada-goose','ringneck','scaup'], ['bufflehead','canvasback','redhead'], ['snow-goose','moose'], ['eagle']],
  parklands: [
    ['mallard','deer','bufflehead','wigeon'], ['pintail','goldeneye','ringneck','cackling-goose'], ['ross-goose','moose'], ['eagle']],
  boreal: [
    ['scaup','goldeneye','ringneck','bufflehead'], ['common-merganser','canada-goose'], ['moose','eagle'], ['snow-goose']],
  foothills: [
    ['canada-goose','goldeneye','deer'], ['common-merganser','mallard','bufflehead'], ['moose','eagle'], ['crane']],
  mountain: [
    ['goldeneye','common-merganser','canada-goose'], ['bufflehead','scaup'], ['eagle','moose'], ['cackling-goose']],
}
