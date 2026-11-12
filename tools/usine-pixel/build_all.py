"""Builds every asset of the Christmas factory into OUT (public/usine)."""
import os, json, sys, shutil
from kit2 import *
from mach import crop_frames, ports_info
import catalog as K, beltparts as BP, vehicles as V
import props, items, ui, elf as E, animals as A, accessories as X
import stage23 as S2, stage45 as S4, stage678 as S8
OUT=sys.argv[1]
def wr(path,im): 
    os.makedirs(os.path.dirname(path),exist_ok=True); im.save(path,optimize=True)
def strip(frames):
    W,H=frames[0].size; S=Image.new('RGBA',(W*len(frames),H))
    for i,f in enumerate(frames): S.paste(f,(i*W,0))
    return S
def row(ims):
    W=sum(i.width for i in ims); H=max(i.height for i in ims); S=Image.new('RGBA',(W,H)); x=0
    for i in ims: S.paste(i,(x,H-i.height)); x+=i.width
    return S
STAGE_NAMES={1:"Atelier du lutin",2:"Atelier équipé",3:"Petite fabrique",4:"Manufacture à vapeur",5:"Usine électrique",6:"Usine automatisée",7:"Complexe industriel",8:"Multinationale"}
st={k:{'name':v,'family':None,'belt':None,'machines':{},'objects':{},'tiles':{},'vehicles':{}} for k,v in STAGE_NAMES.items()}
fam_of={1:'art',2:'art',3:'art',4:'vap',5:'elec',6:'robot',7:'elec',8:'elec'}
for k in st: st[k]['family']=fam_of[k]
def d(k): return f'{OUT}/etape-{k}'
# ---------------- characters ----------------
BASE=['cat','dog','bunny','duck','turtle','fish']
def char_sheet(frame_fn):
    S=Image.new('RGBA',(128,16*48)); r=0
    for a in A.ANIMS:
        for dd in A.DIRS:
            for f in range(4): S.paste(frame_fn(dd,a,f),(f*32,r*48))
            r+=1
    return S
for sp in A.SPECIES:
    if sp in BASE:
        for ci in range(8): wr(f'{OUT}/personnages/{sp}-{ci}.png',char_sheet(lambda dd,a,f: A.frame(sp,ci,dd,a,f)))
    else: wr(f'{OUT}/personnages/{sp}.png',char_sheet(lambda dd,a,f: A.frame(sp,0,dd,a,f)))
    for acc in X.ACCS: wr(f'{OUT}/accessoires/{sp}-{acc}.png',char_sheet(lambda dd,a,f: X.frame(sp,acc,dd,a,f)))
elf_rows=[f'{a}_{dd}' for a in E.ANIMS for dd in E.DIRS]
def elf_sheet(recol=None):
    S=Image.new('RGBA',(128,16*48)); r=0
    for a in E.ANIMS:
        for dd in E.DIRS:
            for f in range(4): S.paste(E.elf(dd,a,f),(f*32,r*48))
            r+=1
    if recol: S=K.recolor(S,recol) if hasattr(K,'recolor') else recolor(S,recol)
    return S
wr(f'{OUT}/personnages/lutin.png',elf_sheet())
wr(f'{OUT}/personnages/lutin-assistant.png',elf_sheet({P['g1'][:3]:P['b1'][:3],P['g0'][:3]:P['b0'][:3],P['g2'][:3]:P['b2'][:3]}))
rows=[f'{a}_{dd}' for a in A.ANIMS for dd in A.DIRS]
json.dump({'frame':[32,48],'frames':4,'rows':rows,'feet':[16,46],'fps':{'idle':3,'walk':8,'work':8,'carry':8},
  'colorable':BASE,'colors':8,'accessories':X.ACCS,'npc':['lutin','lutin-assistant'],
  'carry':'objet 16x16 posé au-dessus de la tête : bas de l\'objet à y≈8 (≈4 de plus avec un chapeau)'},open(f'{OUT}/personnages.json','w'),indent=2,ensure_ascii=False)
# ---------------- shared : items + ui ----------------
it=Image.new('RGBA',(16*len(items.ITEMS),16))
for i,n in enumerate(items.ITEMS): it.paste(items.item(n),(i*16,0))
wr(f'{OUT}/commun/items_16x16.png',it)
b=Image.new('RGBA',(48,64))
for i,s in enumerate(('normal','hover','pressed','disabled')): b.paste(ui.button(s),(0,i*16))
wr(f'{OUT}/commun/ui_button.png',b); wr(f'{OUT}/commun/ui_panel.png',ui.panel())
bb=Image.new('RGBA',(64,20)); bb.paste(ui.bar(0),(0,0)); bb.paste(ui.bar(1),(0,10)); wr(f'{OUT}/commun/ui_progress_bar.png',bb)
c=Image.new('RGBA',(48,16))
for i,k in enumerate(('hand','work','exclaim')): c.paste(ui.cursor(k),(i*16,0))
wr(f'{OUT}/commun/ui_icons.png',c); wr(f'{OUT}/commun/icon_globe.png',strip([S8.globe_icon(f) for f in range(4)]))
json.dump({'items_16x16.png':{'frame':[16,16],'order':items.ITEMS},'ui_button.png':{'frame':[48,16],'states':['normal','hover','pressed','disabled'],'nineSlice':4},
  'ui_panel.png':{'nineSlice':6},'ui_progress_bar.png':{'rows':['empty','full']},'ui_icons.png':{'frame':[16,16],'order':['hand','work','exclaim']},'icon_globe.png':{'frame':[32,32],'frames':4}},
  open(f'{OUT}/commun/commun.json','w'),indent=2)
# ---------------- belts ----------------
belt_info={}
for name in ('bois','fonte','metal'):
    S,FR,names=BP.belt_family({'bois':'wood','fonte':'iron','metal':'metal'}[name])
    wr(f'{OUT}/tapis/{name}.png',S); belt_info[name]=names
json.dump({'frame':[32,32],'frames':4,'rows':belt_info['metal'],'files':{'bois':'étape 3','fonte':'étape 4','metal':'étapes 5 à 8'},
  'naming':"Droit : sens de déplacement. Virage 'A>B' : entre par le bord A, sort par le bord B.",
  'geometry':'tapis horizontal : surface y 4..24, face 24..29 (hauteur 5) ; tapis vertical : surface x 6..26'},open(f'{OUT}/tapis/tapis.json','w'),indent=2,ensure_ascii=False)
for k,bn in ((3,'bois'),(4,'fonte'),(5,'metal'),(6,'metal'),(7,'metal'),(8,'metal')): st[k]['belt']=f'../tapis/{bn}.png'
# ---------------- machines (both orientations) ----------------
for name,(fn,base,fam,stage,role) in K.CATALOG.items():
    for o in ('h','v'):
        frames=crop_frames([fn(f,o) for f in range(4)])
        W,H=base if o=='h' else (base[1],base[0])
        fname=f'{name}_{o}.png'; wr(f'{d(stage)}/{fname}',strip(frames))
        has_ports=not(stage<=2 or name in ('boiler','generator','silo','metal_chest'))
        e=st[stage]['machines'].setdefault(name,{'role':role,'family':fam})
        e[o]={'file':fname,'frame':list(frames[0].size),'frames':4,'footprint':[W,H],
              'ports':ports_info(W,H,o) if has_ports else None,
              'view':'de face (ports ouest/est)' if o=='h' else 'de côté (ports nord/sud)'}
        if not has_ports: e[o]['use']='le personnage se place sous l\'emprise, face au nord'
# ---------------- belt pieces (étape 6) ----------------
for o in ('h','v'):
    for fam,stage in (('elec',6),):
        wr(f'{d(6)}/qc_tunnel_{o}.png',strip([BP.gate(f,o,fam) for f in range(4)]))
        wr(f'{d(6)}/splitter_{o}.png',strip([BP.splitter(f,o,fam) for f in range(4)]))
st[6]['objects']['qc_tunnel']={'h':{'file':'qc_tunnel_h.png','frame':[32,32+BP.ZG],'frames':4,'footprint':[1,1],'on':'tapis horizontal'},
                               'v':{'file':'qc_tunnel_v.png','frame':[32,32+BP.ZG],'frames':4,'footprint':[1,1],'on':'tapis vertical'},'role':'contrôle qualité au-dessus du tapis'}
st[6]['objects']['splitter']={'h':{'file':'splitter_h.png','frame':[32,76],'frames':4,'footprint':[1,2],'flow':'ouest -> est, 2 rangées'},
                              'v':{'file':'splitter_v.png','frame':[64,44],'frames':4,'footprint':[2,1],'flow':'nord -> sud, 2 colonnes'},'role':'répartit les objets sur 2 tapis'}
for o in ('ns','we'):
    res=[BP.arm(f,o) for f in range(4)]
    wr(f'{d(6)}/robot_arm_{o}.png',strip([r[0] for r in res]))
    st[6]['objects'][f'robot_arm_{o}']={'file':f'robot_arm_{o}.png','frame':list(res[0][0].size),'frames':4,'footprint':[1,1],
        'footprintOrigin':list(res[0][2]),'hand':[list(r[1]) for r in res],
        'play':'0-1-2-3-2-1 ; objet tenu dessiné à « hand » (frames 1-2)',
        'move':'prend au sud, dépose au nord (inverser pour l\'autre sens)' if o=='ns' else 'prend à l\'ouest, dépose à l\'est (inverser pour l\'autre sens)'}
# ---------------- stage-specific objects, tiles, vehicles ----------------
def obj(k,name,im,**info): wr(f'{d(k)}/{name}.png',im); st[k]['objects'][name]=dict(file=f'{name}.png',frame=list(im.size if 'frames' not in info else (im.width//info['frames'],im.height)),**info)
def tiles(k,name,ims,names,**info): wr(f'{d(k)}/{name}.png',row(ims)); st[k]['tiles'][name]=dict(file=f'{name}.png',frame=list(ims[0].size),tiles=names,**info)
# étape 1-3 : bois
for k in (1,2,3):
    tiles(k,'floor_wood',[props.floor(v) for v in range(3)],['planche','noeud','clous'])
    tiles(k,'wall_log',[props.wall(x) for x in ('plain','window','shelf')],['simple','fenêtre','étagère'],note='mur du fond, 2 tuiles de haut')
for k in (1,2,3):
    obj(k,'source_sand',props.sand_pile(),footprint=[1,1],gives='sand'); obj(k,'source_branch',props.branch_bundle(),footprint=[1,1],gives='branch')
    obj(k,'ship_crate',props.ship_crate(),footprint=[1,1],accepts='produits finis -> pièces')
obj(1,'deco_rug',props.rug(),footprint=[2,1],layer='sol'); obj(1,'deco_tree',props.deco_tree(),footprint=[1,1])
for k in (2,3): obj(k,'source_wood',K.wood_pile(),footprint=[1,1],gives='wood')
obj(2,'storage_shelf',S2.storage_shelf(),footprint=[1,1],role='stockage'); obj(2,'deco_tool_rack',S2.tool_rack(),footprint=[1,1],layer='mur')
obj(3,'crank',strip([S2.crank_station(f) for f in range(4)]),frames=4,footprint=[1,1],role='fait avancer les tapis en bois quand on clique')
# étape 4 : vapeur
tiles(4,'floor_stone',[S4.floor_stone(v) for v in range(2)],['dalle','dalle_fissure'])
tiles(4,'wall_brick',[S4.wall_brick(x) for x in ('plain','window','pipe')],['simple','fenêtre','tuyau'])
tiles(4,'pipes',[S4.pipe_tile(x) for x in ('h','v','ne','nw','se','sw')],['h','v','ne','nw','se','sw'],note='tuyaux de vapeur au sol, de la chaudière aux machines')
obj(4,'pipe_valve',strip([S4.pipe_tile('valve',f) for f in range(4)]),frames=4,footprint=[1,1])
obj(4,'deco_steam_lamp',S4.steam_lamp(),footprint=[1,1]); obj(4,'source_sand',props.sand_pile(),footprint=[1,1],gives='sand')
obj(4,'source_wood',K.wood_pile(),footprint=[1,1],gives='wood'); obj(4,'ship_crate',props.ship_crate(),footprint=[1,1])
# étapes 5-6 : électrique / robot
for k in (5,6):
    tiles(k,'floor_concrete',[S4.floor_concrete(v) for v in range(3)],['béton','bord_danger','allée'])
    tiles(k,'wall_metal',[S4.wall_metal(x) for x in ('plain','sign','light')],['simple','sortie','lampe'])
obj(6,'control_terminal',strip([S8.control_terminal(f) for f in range(4)]),frames=4,footprint=[1,1])
# étape 7 : extérieur + logistique
tiles(7,'floor_asphalt',[S8.floor_asphalt(v) for v in range(4)],['asphalte','ligne_blanche','ligne_jaune','bord_neige'])
tiles(7,'floor_snow',[S8.floor_snow(v) for v in range(2)],['neige','neige_herbe'])
obj(7,'building_warehouse',strip([S8.warehouse(f) for f in range(4)]),frames=4,footprint=[4,3])
obj(7,'loading_dock',strip([S8.loading_dock(f) for f in range(4)]),frames=4,footprint=[3,2])
for vn,fn,fps in (('truck',V.truck,{'right':[3,1],'left':[3,1],'down':[2,3],'up':[2,3]}),('forklift',V.forklift,{'right':[1,1],'left':[1,1],'down':[1,1],'up':[1,1]})):
    for k in (7,8):
        e={}
        for dd,fpp in fps.items():
            frames=[fn(f,dd) for f in range(4)]; nm=f'vehicle_{vn}_{dd}.png'; wr(f'{d(k)}/{nm}',strip(frames))
            e[dd]={'file':nm,'frame':list(frames[0].size),'frames':4,'footprint':fpp}
        st[k]['vehicles'][vn]=e
# étape 8 : international
obj(8,'tiles_water',strip([S8.water(f) for f in range(4)]),frames=4,footprint=[1,1],layer='sol')
tiles(8,'quay',[S8.quay(v) for v in range(2)],['quai','quai_bitte'])
tiles(8,'floor_asphalt',[S8.floor_asphalt(v) for v in range(4)],['asphalte','ligne_blanche','ligne_jaune','bord_neige'])
obj(8,'containers',row([S8.container(i) for i in range(4)]),footprint=[2,1],variants=['rouge','vert','bleu','jaune'],note='4 variantes côte à côte, 64x40 chacune')
obj(8,'vehicle_cargo_ship',strip([S8.cargo_ship(f) for f in range(4)]),frames=4,footprint=[6,3],layer='eau')
obj(8,'port_crane',strip([S8.port_crane(f) for f in range(4)]),frames=4,footprint=[3,2])
obj(8,'vehicle_cargo_plane',strip([S8.cargo_plane(f) for f in range(4)]),frames=4,footprint=[5,2])
obj(8,'building_hq',strip([S8.hq_tower(f) for f in range(4)]),frames=4,footprint=[3,2])
# stages 7-8 reuse stage-5 machines inside the buildings : say so
st[7]['reuses']=['etape-5','etape-6']; st[8]['reuses']=['etape-5','etape-6','etape-7']; st[6]['reuses']=['etape-5']; st[2]['reuses']=['etape-1']
for k,v in st.items():
    v={kk:vv for kk,vv in v.items() if vv not in (None,{},[])}
    json.dump(v,open(f'{d(k)}/etape.json','w'),indent=2,ensure_ascii=False)
json.dump({'tileSize':32,'projection':"vue 3/4 : un objet de hauteur Z sur une emprise W x H tuiles est dessiné dans une case W*32 x (H*32+Z+marge) ; le bas de la case = le bas de l'emprise. Trier l'affichage par bas d'emprise.",
  'orientations':{'h':'vue de face : le tapis entre à l\'ouest et sort à l\'est (rangée du bas de l\'emprise)','v':'vue de côté : le tapis entre au nord et sort au sud (colonne (W-1)//2)'},
  'families':{'art':'bois et argile, à la main (étapes 1-3)','vap':'fonte et cuivre, vapeur (étape 4)','elec':'acier et bandes jaunes, électricité (étapes 5-8)','robot':'blanc et bleu, robots (étape 6)'},
  'stages':{k:{'name':v,'folder':f'etape-{k}','family':fam_of[k]} for k,v in STAGE_NAMES.items()}},open(f'{OUT}/etapes.json','w'),indent=2,ensure_ascii=False)
print('built')
