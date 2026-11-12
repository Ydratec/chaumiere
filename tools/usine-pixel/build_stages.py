import os, json, sys
from kit2 import *
import stage23 as S23, stage45 as S45, stage678 as S8
from PIL import ImageDraw
OUT=sys.argv[1]
def save(stage,name,im,meta,store,**info):
    d=f'{OUT}/etape-{stage}'; os.makedirs(d,exist_ok=True)
    im.save(f'{d}/{name}.png',optimize=True); store[name]=dict(file=f'{name}.png',**info)
def anim(fn,w,h): return sheet(fn,w,h)
def tiles(fns,w=32,h=32):
    S=Image.new('RGBA',(w*len(fns),h))
    for i,f in enumerate(fns): S.paste(f,(i*w,0))
    return S
STAGES={}
# 2
m={}
save(2,'station_kiln_bellows',anim(S23.kiln_bellows,64,64),None,m,frame=[64,64],frames=4,footprint=[2,1],makes='sand -> glass -> ball_clear (x2 vitesse)')
save(2,'station_lathe',anim(S23.lathe,64,64),None,m,frame=[64,64],frames=4,footprint=[2,1],makes='wood -> wood_star')
save(2,'storage_shelf',S23.storage_shelf(),None,m,frame=[32,64],footprint=[1,1],role='stockage +8')
save(2,'deco_tool_rack',S23.tool_rack(),None,m,frame=[32,64],footprint=[1,1],layer='wall')
el,rows=S23.assistant_elf(); save(2,'character_elf_assistant',el,None,m,frame=[32,32],frames=4,rows=rows,role='lutin assistant (PNJ automatique)')
STAGES[2]=dict(name='Atelier équipé',assets=m)
# 3
m={}
wb,_=S23.wood_belt(); save(3,'wood_belt',wb,None,m,frame=[32,32],frames=4,rows=['E','W','S','N','W>S','S>W','E>S','S>E','W>N','N>W','E>N','N>E'],note='même géométrie que les tapis métal')
save(3,'crank_station',anim(S23.crank_station,32,32),None,m,frame=[32,32],frames=4,footprint=[1,1],role='fait avancer les tapis en bois quand on clique')
save(3,'station_star_press',anim(S23.star_press,64,64),None,m,frame=[64,64],frames=4,footprint=[2,2],makes='wood_star + paint -> star')
save(3,'station_garland_loom',anim(S23.garland_loom,64,64),None,m,frame=[64,64],frames=4,footprint=[2,2],makes='branch + ball -> garland')
STAGES[3]=dict(name='Petite fabrique',assets=m)
# 4
m={}
save(4,'tiles_floor_stone',tiles([S45.floor_stone(v) for v in range(2)]),None,m,tiles=['dalle','dalle_fissure'])
save(4,'tiles_wall_brick',tiles([S45.wall_brick(k) for k in ('plain','window','pipe')],32,64),None,m,frame=[32,64],tiles=['plain','window','pipe'])
ks=['h','v','ne','nw','se','sw']
save(4,'tiles_pipes',tiles([S45.pipe_tile(k) for k in ks]),None,m,tiles=ks)
save(4,'pipe_valve',anim(lambda f:S45.pipe_tile('valve',f),32,32),None,m,frame=[32,32],frames=4)
save(4,'station_boiler',anim(S45.boiler,64,64),None,m,frame=[64,64],frames=4,footprint=[2,2],role='produit la vapeur des machines reliées par tuyaux')
save(4,'station_steam_press',anim(S45.steam_press,64,64),None,m,frame=[64,64],frames=4,footprint=[2,2],makes='glass -> ball_clear (presse)')
save(4,'deco_steam_lamp',S45.steam_lamp(),None,m,frame=[32,64],footprint=[1,1])
STAGES[4]=dict(name='Manufacture à vapeur',assets=m)
# 5
m={}
save(5,'tiles_floor_concrete',tiles([S45.floor_concrete(v) for v in range(3)]),None,m,tiles=['beton','beton_bord_danger','beton_allee'])
save(5,'tiles_wall_metal',tiles([S45.wall_metal(k) for k in ('plain','sign','light')],32,64),None,m,frame=[32,64],tiles=['plain','sortie','lampe'])
save(5,'station_paint_booth',anim(S45.paint_booth,64,64),None,m,frame=[64,64],frames=4,footprint=[2,2],makes='ball_clear -> boule peinte (4 couleurs)')
save(5,'station_generator',anim(S45.generator,64,64),None,m,frame=[64,64],frames=4,footprint=[2,2],role='électricité')
STAGES[5]=dict(name='Usine électrique',assets=m,uses=['../convoyeurs/conveyor_32x32_3-4_sheet.png','../machines/machine_furnace_2x2.png','../machines/machine_assembler_3x3.png','../machines/machine_chest_1x1.png'])
# 6
m={}
save(6,'robot_arm',anim(S8.robot_arm,32,48),None,m,frame=[32,48],frames=4,footprint=[1,1],note='joue 0-1-2-3-2-1 : prend au sud, dépose au nord ; pivoter de 90° pour les autres sens')
save(6,'scanner_gate',anim(S8.scanner,32,48),None,m,frame=[32,48],frames=4,footprint=[1,1],role='contrôle qualité, se pose au-dessus d\'un tapis')
save(6,'splitter',anim(S8.splitter,32,64),None,m,frame=[32,64],frames=4,footprint=[1,2],role='entrée ouest, sorties est sur les 2 rangées')
save(6,'station_paint_robot',anim(S8.paint_robot,64,64),None,m,frame=[64,64],frames=4,footprint=[2,2])
save(6,'control_terminal',anim(S8.control_terminal,32,48),None,m,frame=[32,48],frames=4,footprint=[1,1])
STAGES[6]=dict(name='Usine automatisée',assets=m)
# 7
m={}
save(7,'tiles_floor_asphalt',tiles([S8.floor_asphalt(v) for v in range(4)]),None,m,tiles=['asphalte','ligne_blanche','ligne_jaune','bord_neige'])
save(7,'tiles_floor_snow',tiles([S8.floor_snow(v) for v in range(2)]),None,m,tiles=['neige','neige_herbe'])
save(7,'building_warehouse',anim(S8.warehouse,128,112),None,m,frame=[128,112],frames=4,footprint=[4,3])
save(7,'loading_dock',anim(S8.loading_dock,96,64),None,m,frame=[96,64],frames=4,footprint=[3,2])
T=Image.new('RGBA',(96*4,128))
for f in range(4): T.paste(S8.truck(f,'right'),(f*96,0)); T.paste(S8.truck(f,'left'),(f*96,64))
save(7,'vehicle_truck',T,None,m,frame=[96,64],frames=4,rows=['right','left'],footprint=[3,1])
Fk=Image.new('RGBA',(32*4,64))
for f in range(4): Fk.paste(S8.forklift(f,'right'),(f*32,0)); Fk.paste(S8.forklift(f,'left'),(f*32,32))
save(7,'vehicle_forklift',Fk,None,m,frame=[32,32],frames=4,rows=['right','left'])
STAGES[7]=dict(name='Complexe industriel',assets=m)
# 8
m={}
save(8,'tiles_water',anim(S8.water,32,32),None,m,frame=[32,32],frames=4)
save(8,'tiles_quay',tiles([S8.quay(v) for v in range(2)]),None,m,tiles=['quai','quai_bitte'])
Cn=Image.new('RGBA',(64*4,40))
for i in range(4): Cn.paste(S8.container(i),(i*64,0))
save(8,'containers',Cn,None,m,frame=[64,40],variants=['rouge','vert','bleu','jaune'],footprint=[2,1])
save(8,'vehicle_cargo_ship',anim(S8.cargo_ship,192,112),None,m,frame=[192,112],frames=4,footprint=[6,3],layer='eau')
save(8,'port_crane',anim(S8.port_crane,96,144),None,m,frame=[96,144],frames=4,footprint=[3,2])
save(8,'vehicle_cargo_plane',anim(S8.cargo_plane,160,96),None,m,frame=[160,96],frames=4,footprint=[5,2])
save(8,'building_hq',anim(S8.hq_tower,96,192),None,m,frame=[96,192],frames=4,footprint=[3,2])
save(8,'icon_globe',anim(S8.globe_icon,32,32),None,m,frame=[32,32],frames=4,role='icône UI marchés internationaux')
STAGES[8]=dict(name='Multinationale',assets=m)
idx={1:dict(name="Atelier du lutin",folder='atelier')}
for k,v in STAGES.items():
    json.dump(v,open(f'{OUT}/etape-{k}/etape.json','w'),indent=2,ensure_ascii=False); idx[k]=dict(name=v['name'],folder=f'etape-{k}')
json.dump({'tileSize':32,'stages':idx,'notes':'Sprites plus hauts que leur emprise : ancrer en bas de l\'emprise, trier par y.'},open(f'{OUT}/etapes.json','w'),indent=2,ensure_ascii=False)
# boards
for k,v in STAGES.items():
    ims=[Image.open(f'{OUT}/etape-{k}/'+a['file']) for a in v['assets'].values()]
    frames=[(im.crop((0,0,a['frame'][0],a['frame'][1])) if 'frames' in a or 'rows' in a else im) for im,a in zip(ims,v['assets'].values())]
    W=8; x=y=8; rowh=0; places=[]
    for im in frames:
        if x+im.width>520: x=8; y+=rowh+8; rowh=0
        places.append((x,y)); x+=im.width+8; rowh=max(rowh,im.height)
    B=Image.new('RGBA',(528,y+rowh+28),(46,40,52,255))
    for im,(px,py) in zip(frames,places): B.alpha_composite(im,(px,py+20))
    import unicodedata
    lab=unicodedata.normalize('NFKD',f"Etape {k} - {v['name']}").encode('ascii','ignore').decode()
    ImageDraw.Draw(B).text((8,4),lab,fill=(255,240,200))
    B.save(f'/tmp/kit/board_etape{k}.png')
print('ok')
