"""Builds every asset of the Christmas factory into OUT (public/usine). 3D engine edition."""
import os, json, sys
from m3d import ORI, finish, VIS
import cat3d as K, logi3d as LG, sources3d as SR, veh3d as VH, items2 as IT
import beltparts as BP, props, ui, elf as E, animals as A, accessories as X
import stage45 as S4, stage678 as S8
from kit2 import *
OUT=sys.argv[1]
def wr(path,im): os.makedirs(os.path.dirname(path),exist_ok=True); im.save(path,optimize=True)
def strip(frames):
    W,H=frames[0].size; S=Image.new('RGBA',(W*len(frames),H))
    for i,f in enumerate(frames): S.paste(f,(i*W,0))
    return S
def row(ims):
    W=sum(i.width for i in ims); H=max(i.height for i in ims); S=Image.new('RGBA',(W,H)); x=0
    for i in ims: S.paste(i,(x,H-i.height)); x+=i.width
    return S
NAMES={1:"Atelier du lutin",2:"Atelier équipé",3:"Petite fabrique",4:"Manufacture à vapeur",5:"Usine électrique",6:"Usine automatisée",7:"Usine de précision",8:"Usine pilotée"}
FAMS={1:'art',2:'art',3:'art',4:'vap',5:'elec',6:'robot',7:'robot',8:'robot'}
st={k:{'name':v,'family':FAMS[k],'objects':{},'tiles':{}} for k,v in NAMES.items()}
d=lambda k:f'{OUT}/etape-{k}'
FACE_FR={'w+':'façade (commandes)','u+':'bout de sortie','w-':'arrière (service)','u-':'bout d\'entrée'}
SIDE_IN={'e':'W','s':'N','w':'E','n':'S'}; SIDE_OUT={'e':'E','s':'S','w':'W','n':'N'}
def ports_of(ob):
    lw=ob.lane_w()
    def tile(u):
        X,Y=ob.g(u,lw); return [min(ob.FW-1,max(0,int(X//32))),min(ob.FH-1,max(0,int(Y//32)))]
    return {'in':{'side':SIDE_IN[ob.o],'tile':tile(1)},'out':{'side':SIDE_OUT[ob.o],'tile':tile(ob.L-1)}}
def put_obj(k,name,make,ports=False,frames=4,extra=None,orients=ORI):
    e={}
    for o in orients:
        ob=make(o); fr=[ob.render(f) for f in range(frames)]
        fr,org=finish(ob,fr); fn=f'{name}_{o}.png'; wr(f'{d(k)}/{fn}',strip(fr))
        e[o]={'file':fn,'frame':list(fr[0].size),'frames':frames,'footprint':[ob.FW,ob.FH],'origin':list(org),'face':FACE_FR[VIS[o]]}
        if ports: e[o]['ports']=ports_of(ob)
    if extra: e.update(extra)
    st[k]['objects'][name]=e
def put_static(k,name,im,frames=1,**info):
    wr(f'{d(k)}/{name}.png',im); w=im.width//frames
    st[k]['objects'][name]=dict(file=f'{name}.png',frame=[w,im.height],frames=frames,**info)
def put_tiles(k,name,ims,names,**info):
    wr(f'{d(k)}/{name}.png',row(ims)); st[k]['tiles'][name]=dict(file=f'{name}.png',frame=list(ims[0].size),tiles=names,**info)
# ---------------- characters ----------------
BASE=['cat','dog','bunny','duck','turtle','fish']
def char_sheet(fn):
    S=Image.new('RGBA',(128,16*48)); r=0
    for a in A.ANIMS:
        for dd in A.DIRS:
            for f in range(4): S.paste(fn(dd,a,f),(f*32,r*48))
            r+=1
    return S
for sp in A.SPECIES:
    if sp in BASE:
        for ci in range(8): wr(f'{OUT}/personnages/{sp}-{ci}.png',char_sheet(lambda dd,a,f: A.frame(sp,ci,dd,a,f)))
    else: wr(f'{OUT}/personnages/{sp}.png',char_sheet(lambda dd,a,f: A.frame(sp,0,dd,a,f)))
    for acc in X.ACCS: wr(f'{OUT}/accessoires/{sp}-{acc}.png',char_sheet(lambda dd,a,f: X.frame(sp,acc,dd,a,f)))
el=char_sheet(lambda dd,a,f: E.elf(dd,a,f)); wr(f'{OUT}/personnages/lutin.png',el)
wr(f'{OUT}/personnages/lutin-assistant.png',recolor(el.copy(),{P['g1'][:3]:P['b1'][:3],P['g0'][:3]:P['b0'][:3],P['g2'][:3]:P['b2'][:3]}))
json.dump({'frame':[32,48],'frames':4,'rows':[f'{a}_{dd}' for a in A.ANIMS for dd in A.DIRS],'feet':[16,46],
  'fps':{'idle':3,'walk':8,'work':8,'carry':8},'colorable':BASE,'colors':8,'accessories':X.ACCS,'npc':['lutin','lutin-assistant']},
  open(f'{OUT}/personnages.json','w'),indent=2,ensure_ascii=False)
# ---------------- shared ----------------
it=Image.new('RGBA',(16*len(IT.ORDER),16))
for i,n in enumerate(IT.ORDER): it.paste(IT.get(n),(i*16,0))
wr(f'{OUT}/commun/objets_16x16.png',it)
b=Image.new('RGBA',(48,64))
for i,s in enumerate(('normal','hover','pressed','disabled')): b.paste(ui.button(s),(0,i*16))
wr(f'{OUT}/commun/ui_bouton.png',b); wr(f'{OUT}/commun/ui_panneau.png',ui.panel())
bb=Image.new('RGBA',(64,20)); bb.paste(ui.bar(0),(0,0)); bb.paste(ui.bar(1),(0,10)); wr(f'{OUT}/commun/ui_barre.png',bb)
c=Image.new('RGBA',(48,16))
for i,k in enumerate(('hand','work','exclaim')): c.paste(ui.cursor(k),(i*16,0))
wr(f'{OUT}/commun/ui_icones.png',c); wr(f'{OUT}/commun/icone_globe.png',strip([S8.globe_icon(f) for f in range(4)]))
json.dump({'objets_16x16.png':{'frame':[16,16],'order':IT.ORDER,'note':'sur un tapis : 2 voies, à ±5 px du centre de la voie'},
  'ui_bouton.png':{'frame':[48,16],'states':['normal','hover','pressed','disabled'],'nineSlice':4},'ui_panneau.png':{'nineSlice':6},
  'ui_barre.png':{'rows':['vide','pleine']},'ui_icones.png':{'frame':[16,16],'order':['main','travail','alerte']},'icone_globe.png':{'frame':[32,32],'frames':4}},
  open(f'{OUT}/commun/commun.json','w'),indent=2,ensure_ascii=False)
# ---------------- belts ----------------
src_names=None
for name,fam in (('bois','wood'),('fonte','iron'),('metal','metal'),('express','express')):
    if fam=='express':
        src=open(os.path.join(os.path.dirname(os.path.abspath(BP.__file__)),'conveyors.py')).read()
        src=src.replace("belt=C('#3b3d47'); belt_e=C('#2c2e36'); rid_h=C('#62667a'); rid_d=C('#202128')","belt=C('#2e3140'); belt_e=C('#232634'); rid_h=C('#5a6a9a'); rid_d=C('#1a1c28')")
        src=src.replace("rail_o=C('#f2bd3e'); rail_i=C('#a86f18')","rail_o=C('#4f9cf0'); rail_i=C('#23549c')")
        src=src.replace("face=[C('#d49a2a'),C('#94631a'),C('#4f5462'),C('#4a4f5c'),C('#30333c')]","face=[C('#3d8be0'),C('#23549c'),C('#3a4668'),C('#323c5a'),C('#232a40')]")
        src=src.replace("sheet.save('conveyor_32x32_3-4_sheet.png')","SHEET=sheet").replace("import pickle; pickle.dump({k:v.tobytes() for k,v in frames.items()},open('fr.pkl','wb'))","")
        g={}; exec(src.split("print([n")[0],g); S=g['SHEET']; names=[n for n,_ in g['tiles']]
    else: S,FR,names=BP.belt_family(fam)
    wr(f'{OUT}/tapis/{name}.png',S); src_names=names
json.dump({'frame':[32,32],'frames':4,'rows':src_names,'speed_items_per_s':{'bois':2,'fonte':4,'metal':8,'express':16},
  'stages':{'bois':3,'fonte':4,'metal':5,'express':6},'lanes':'2 voies, à ±5 px du centre',
  'naming':"Droit : sens de déplacement. Virage 'A>B' : entre par le bord A, sort par le bord B.",
  'geometry':'tapis horizontal : surface y 4..24 (centre 14), hauteur 5 ; tapis vertical : surface x 6..26 (centre 16)'},
  open(f'{OUT}/tapis/tapis.json','w'),indent=2,ensure_ascii=False)
for k,bn in ((3,'bois'),(4,'fonte'),(5,'metal'),(6,'express'),(7,'express'),(8,'express')): st[k]['belt']=f'../tapis/{bn}.png'
# ---------------- machines ----------------
NOPORT={'kiln','paint_table','wreath_table','kiln_bellows','lathe','tree_bench','boiler','generator','silo','chest_metal','chest_wood'}
for name,(mk,stage,fam,ty,role) in K.MACHINES.items():
    put_obj(stage,name,mk,ports=name not in NOPORT,extra={'type':ty,'family':fam,'role':role})
# ---------------- logistics / energy ----------------
put_obj(3,'crank',LG.crank,extra={'role':'remonte 60 s de réserve pour 4 machines ou 8 tuiles de tapis'})
for shape,ors in (('straight',('e','s')),('corner',ORI),('tee',ORI),('cross',('e',))):
    put_obj(4,f'pipe_{shape}',lambda o,shape=shape: LG.pipe(o,shape),frames=1,orients=ors,extra={'note':'tuyau de vapeur : centre de la tuile, hauteur 7'})
put_obj(4,'pipe_valve',lambda o: LG.pipe(o,'straight',True),orients=('e','s'),extra={'role':'vanne : limite le débit d\'une branche'})
for kind,stage in (('metal',5),('express',6)):
    for end in ('in','out'):
        put_obj(stage,f'underground_{kind}_{end}',lambda o,kind=kind,end=end: LG.underground(o,kind,end),frames=1,
                extra={'role':('entrée' if end=='in' else 'sortie')+' de tapis souterrain','range_tiles':4 if kind=='metal' else 8})
put_obj(5,'splitter',lambda o: LG.splitter(o),extra={'role':'2 entrées, 2 sorties, 1:1','note':'emprise 1 x 2 en travers du flux'})
put_obj(6,'splitter_filter',lambda o: LG.splitter(o,True),extra={'role':'priorités + filtre par objet'})
put_obj(6,'qc_tunnel',LG.qc_tunnel,extra={'role':'contrôle qualité posé sur un tapis'})
for kind,stage in (('simple',5),('rapide',6),('long',6),('filtrant',6)):
    e={}
    for o in ORI:
        fr,org,hands,fp=LG.arm_frames(o,kind); fn=f'arm_{kind}_{o}.png'; wr(f'{d(stage)}/{fn}',strip(fr))
        e[o]={'file':fn,'frame':list(fr[0].size),'frames':4,'footprint':list(fp),'origin':list(org),'hand':[list(h) for h in hands],
              'pick':SIDE_IN[o],'drop':SIDE_OUT[o]}
    e.update({'play':'0-1-2-3 puis 3-2-1-0 ; objet tenu dessiné à « hand »','speed':{'simple':0.83,'rapide':2.3,'long':1.2,'filtrant':2.3}[kind],
              'reach_tiles':2 if kind=='long' else 1})
    st[stage]['objects'][f'arm_{kind}']=e
po,top=LG.pole(); fr,org=finish(po,[po.render(0)]); put_static(5,'pole',fr[0],footprint=[1,1],origin=list(org),wire_anchor=[org[0]+16,org[1]+16-47],reach_tiles=7,area='5x5')
py,top=LG.pole(big=True); fr,org=finish(py,[py.render(0)]); put_static(7,'pylon',fr[0],footprint=[2,2],origin=list(org),wire_anchor=[org[0]+32,org[1]+32-94],reach_tiles=30)
ac=LG.accumulator(); fr,org=finish(ac,[ac.render(f) for f in range(4)]); put_static(6,'accumulator',strip(fr),frames=4,footprint=[2,2],origin=list(org),note='image = niveau de charge 25/50/75/100 %')
# ---------------- sources, storage ----------------
for k in (1,2,3,4):
    for s in SR.SOURCES:
        if k<2 and s in ('bois','fil','sapin') : continue
        if k<2 and s.startswith('pigment_') and s!='pigment_rouge': pass
        im=SR.pile(s); put_static(k,f'source_{s}',im,footprint=[1,1],origin=[0,im.height-32],gives=s)
    put_static(k,'ship_crate',props.ship_crate(),footprint=[1,1],origin=[0,0],accepts='produits finis -> pièces')
for k in (5,):
    for s in SR.SOURCES: put_obj(5,f'extractor_{s}',SR.extractor(s),extra={'gives':s,'role':'source (débit améliorable)'},orients=('e',))
# ---------------- tiles ----------------
for k in (1,2,3):
    put_tiles(k,'floor_wood',[props.floor(v) for v in range(3)],['planche','noeud','clous'])
    put_tiles(k,'wall_log',[props.wall(x) for x in ('plain','window','shelf')],['simple','fenêtre','étagère'],note='mur du fond, 2 tuiles de haut')
put_static(1,'deco_rug',props.rug(),footprint=[2,1],origin=[0,0],layer='sol'); put_static(1,'deco_tree',props.deco_tree(),footprint=[1,1],origin=[0,32])
put_tiles(4,'floor_stone',[S4.floor_stone(v) for v in range(2)],['dalle','dalle_fissure'])
put_tiles(4,'wall_brick',[S4.wall_brick(x) for x in ('plain','window','pipe')],['simple','fenêtre','tuyau'])
put_static(4,'deco_steam_lamp',S4.steam_lamp(),footprint=[1,1],origin=[0,32])
for k in (5,6):
    put_tiles(k,'floor_concrete',[S4.floor_concrete(v) for v in range(3)],['béton','bord_danger','allée'])
    put_tiles(k,'wall_metal',[S4.wall_metal(x) for x in ('plain','sign','light')],['simple','sortie','lampe'])
put_static(6,'control_terminal',strip([S8.control_terminal(f) for f in range(4)]),frames=4,footprint=[1,1],origin=[0,16])
# étapes 7-8 : le jeu reste dans l'usine (même sol et mêmes murs que l'usine électrique)
for k in (7,8):
    put_tiles(k,'floor_concrete',[S4.floor_concrete(v) for v in range(3)],['béton','bord_danger','allée'])
    put_tiles(k,'wall_metal',[S4.wall_metal(x) for x in ('plain','sign','light')],['simple','sortie','lampe'])
    st[k]['reuses']=['etape-5','etape-6']
for k,v in st.items(): json.dump(v,open(f'{d(k)}/etape.json','w'),indent=2,ensure_ascii=False)
json.dump({'tileSize':32,
  'placement':"Chaque sprite donne 'origin' = position, dans la case, du coin haut-gauche de son emprise. Dessiner la case à (tuile.x*32 - origin.x, tuile.y*32 - origin.y), trier par bas d'emprise.",
  'orientations':{'e':'tapis ouest -> est : on voit la façade','s':'tapis nord -> sud : on voit le bout de sortie','w':'tapis est -> ouest : on voit l\'arrière','n':'tapis sud -> nord : on voit le bout d\'entrée'},
  'families':{'art':'bois et argile (étapes 1-3)','vap':'fonte et cuivre (étape 4)','elec':'acier, bandes jaunes (étapes 5-8)','robot':'blanc et bleu (étape 6)'},
  'stages':{k:{'name':v,'folder':f'etape-{k}','family':FAMS[k]} for k,v in NAMES.items()}},open(f'{OUT}/etapes.json','w'),indent=2,ensure_ascii=False)
print('built')
