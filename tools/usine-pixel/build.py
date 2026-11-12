import json, os
from lib import *
import elf, props, items, ui
from PIL import Image
O='out'; os.makedirs(O,exist_ok=True)
meta={'tileSize':32,'notes':'3/4 view. Sprites taller than their footprint: draw them anchored at the bottom of their footprint, sorted by y.'}
# elf
S,rows=elf.sheet(); S.save(f'{O}/character_elf.png')
meta['character_elf']={'file':'character_elf.png','frame':[32,32],'frames':4,'rows':rows,'anchor':'feet at (16,30)','fps':{'idle':3,'walk':8,'work':8,'carry':8}}
# tiles
t=Image.new('RGBA',(32*3,32))
for v in range(3): t.paste(props.floor(v),(v*32,0))
t.save(f'{O}/tiles_floor_wood.png'); meta['tiles_floor_wood']={'file':'tiles_floor_wood.png','tiles':['plank','plank_knot','plank_nails']}
w=Image.new('RGBA',(32*3,64))
for i,k in enumerate(('plain','window','shelf')): w.paste(props.wall(k),(i*32,0))
w.save(f'{O}/tiles_wall_log.png'); meta['tiles_wall_log']={'file':'tiles_wall_log.png','frame':[32,64],'tiles':['plain','window','shelf'],'note':'back wall, 2 tiles tall; place on the top rows of the room'}
props.rug().save(f'{O}/deco_rug_2x1.png')
props.deco_tree().save(f'{O}/deco_tree_1x1.png')
meta['deco']={'deco_rug_2x1.png':{'footprint':[2,1],'layer':'floor'},'deco_tree_1x1.png':{'footprint':[1,1],'sprite':[32,64]}}
# stations
st={}
for n,fn in (('kiln',props.kiln),('paint_table',props.paint_table),('wreath_table',props.wreath_table)):
    sh=Image.new('RGBA',(64*4,64))
    for f in range(4): sh.paste(fn(f),(f*64,0))
    sh.save(f'{O}/station_{n}.png'); st[n]={'file':f'station_{n}.png','frame':[64,64],'frames':4,'footprint':[2,1],'interact':'stand on the tile below the footprint, facing up'}
st['kiln']['makes']='sand -> glass -> ball_clear'
st['paint_table']['makes']='ball_clear + paint -> ball_red/green/gold/blue'
st['wreath_table']['makes']='branch + ribbon -> wreath'
for n,fn in (('sand_pile',props.sand_pile),('branch_bundle',props.branch_bundle),('ship_crate',props.ship_crate)):
    fn().save(f'{O}/station_{n}.png'); st[n]={'file':f'station_{n}.png','frame':[32,32],'footprint':[1,1]}
st['sand_pile']['gives']='sand'; st['branch_bundle']['gives']='branch'; st['ship_crate']['accepts']='finished products -> coins'
meta['stations']=st
# items
it=Image.new('RGBA',(16*len(items.ITEMS),16))
for i,n in enumerate(items.ITEMS): it.paste(items.item(n),(i*16,0))
it.save(f'{O}/items_16x16.png'); meta['items_16x16']={'file':'items_16x16.png','frame':[16,16],'order':items.ITEMS,'note':'carry above head at (8,-2) relative to the 32x32 elf frame; scale x2/x3 for UI icons'}
# ui
b=Image.new('RGBA',(48,64))
for i,s in enumerate(('normal','hover','pressed','disabled')): b.paste(ui.button(s),(0,i*16))
b.save(f'{O}/ui_button.png'); ui.panel().save(f'{O}/ui_panel.png')
bb=Image.new('RGBA',(64,20)); bb.paste(ui.bar(0),(0,0)); bb.paste(ui.bar(1),(0,10)); bb.save(f'{O}/ui_progress_bar.png')
c=Image.new('RGBA',(48,16))
for i,k in enumerate(('hand','work','exclaim')): c.paste(ui.cursor(k),(i*16,0))
c.save(f'{O}/ui_icons.png')
meta['ui']={'ui_button.png':{'frame':[48,16],'states':['normal','hover','pressed','disabled'],'nineSlice':4},
            'ui_panel.png':{'nineSlice':6},'ui_progress_bar.png':{'rows':['empty','full'],'note':'crop the full row to the progress width'},
            'ui_icons.png':{'frame':[16,16],'order':['hand','work','exclaim']}}
json.dump(meta,open(f'{O}/assets.json','w'),indent=2)
print(os.listdir(O))
