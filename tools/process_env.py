# Memotong lembar aset lingkungan (latar putih) menjadi PNG transparan terpisah untuk Level 1.
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
U='/mnt/user-data/uploads/'; O='public/assets/env/'
sheet=Image.open(U+'Lembar_Aset_Fantasi_Benteng_Terapung.png').convert('RGB')
from PIL import ImageDraw
_d=ImageDraw.Draw(sheet)
for r in [(10,296,280,326),(10,580,192,609),(10,724,188,753),(832,380,940,408),(990,573,1122,600),(1404,562,1550,590),(752,10,1002,40),(1308,10,1530,40),(1320,234,1520,262),(1390,748,1505,775),(814,742,974,770)]:
    _d.rectangle(r,fill=(255,255,255))
_d.rectangle((15,38,736,284),fill=(255,255,255))   # langit tidak boleh bocor ke kastil
def cut(box, thr=240, holes=False):
    a=np.array(sheet.crop(box)); near=a.min(axis=2)>=thr
    lab,_=ndi.label(near)
    edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    bg=np.isin(lab,list(edge))
    if holes:   # bagian putih tertutup (isi lengkungan/gerbang) juga dibuat transparan
        sizes=ndi.sum(near,lab,range(1,lab.max()+1))
        bg|=np.isin(lab,[i+1 for i,v in enumerate(sizes) if v>500])
    al=ndi.binary_erosion(~bg,iterations=1)
    return np.dstack([a,(al*255).astype(np.uint8)])
def save(arr,name,maxw=None):
    im=Image.fromarray(arr,'RGBA'); bb=im.getbbox()
    if bb: im=im.crop(bb)
    if maxw and im.width>maxw: im=im.resize((maxw,int(im.height*maxw/im.width)),Image.LANCZOS)
    im.save(O+name,optimize=True); print(name,im.size); return im
def multi(box,prefix,merge=6,min_area=900,maxw=None,holes=False,thr=240):
    arr=cut(box,thr,holes); m=arr[...,3]>0
    lab,n=ndi.label(ndi.binary_dilation(m,iterations=merge))
    items=[]
    for k in range(1,n+1):
        mk=(lab==k)&m
        if mk.sum()<min_area: continue
        ys,xs=np.where(mk); items.append((xs.min(),k,mk))
    for i,(_,k,mk) in enumerate(sorted(items,key=lambda t:t[0])):
        a=arr.copy(); a[...,3]=np.where(mk,a[...,3],0); save(a,f'{prefix}{i}.png',maxw)
# Latar
sheet.crop((15,38,736,284)).save(O+'sky.jpg',quality=88)
Image.open(U+'Stormlit_Citadel_Among_Ruins.png').convert('RGB').resize((1600,900),Image.LANCZOS).save(O+'backdrop.jpg',quality=84)
multi((680,42,1335,378),'castle',merge=10,min_area=60000,maxw=700)
multi((1325,40,1658,230),'island',merge=8,min_area=3000)
save(cut((1325,270,1658,378)),'mountains.png')
multi((10,326,830,570),'ruin',merge=3,min_area=2500,holes=True,thr=243)
multi((840,410,1660,565),'falls',merge=8,min_area=3000)
save(cut((15,600,628,715)),'ground-long.png')
save(cut((640,615,782,715)),'ground-mid.png')
save(cut((833,570,995,738)),'rune.png')
multi((1000,588,1405,738),'rock',merge=4,min_area=1200)
multi((1420,585,1640,742),'banner',merge=4,min_area=1500)
multi((10,748,800,920),'veg',merge=2,min_area=500)
save(cut((820,780,1050,918),thr=250),'water.png')
