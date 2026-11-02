# Memotong lineup NPC (latar putih) menjadi 5 PNG transparan setinggi 288px: npc0..npc4 (kiri -> kanan).
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
im=Image.open('/mnt/user-data/uploads/16-Bit_RPG_NPC_Character_Lineup.png').convert('RGB'); a=np.array(im)
near=a.min(axis=2)>=238; lab,_=ndi.label(near)
edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
al=ndi.binary_erosion(~np.isin(lab,list(edge)),iterations=1)
lab,n=ndi.label(ndi.binary_dilation(al,iterations=10)); items=[]
for k in range(1,n+1):
    m=(lab==k)&al
    if m.sum()<8000: continue
    ys,xs=np.where(m); items.append((xs.min(),m))
for i,(_,m) in enumerate(sorted(items,key=lambda t:t[0])):
    ys,xs=np.where(m); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    t=Image.fromarray(np.dstack([a,(m*255).astype(np.uint8)])[y0:y1,x0:x1],'RGBA')
    t=t.resize((int(t.width*288/t.height),288),Image.LANCZOS); t.save(f'public/assets/npcs/npc{i}.png',optimize=True); print(i,t.size)
