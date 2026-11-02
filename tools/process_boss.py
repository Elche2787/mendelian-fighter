# Kriptomer Flower: 17 frame terpisah -> satu spritesheet 4 kolom x 5 baris, sel 256x256, dasar bayangan rata di bawah.
# Urutan: 0-3 standby, 4-7 move, 8-11 attack, 12 hit, 13-16 death
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
Z='/tmp/z2/'
names=[f'standby_0{i}' for i in range(1,5)]+[f'move_0{i}' for i in range(1,5)]+[f'attack_0{i}' for i in range(1,5)]+['hit_01']+[f'death_0{i}' for i in range(1,5)]
sheet=Image.new('RGBA',(1024,1280))
for i,n in enumerate(names):
    im=Image.open(Z+n+'.png').convert('RGBA'); a=np.array(im); al=a[...,3]>24
    H,W=al.shape; lab,k=ndi.label(al,structure=np.ones((3,3))); keep=np.zeros_like(al)
    for j in range(1,k+1):
        m=lab==j; ys,xs=np.where(m); bw,bh=xs.max()-xs.min()+1,ys.max()-ys.min()+1; area=m.sum()
        touch=xs.min()==0 or ys.min()==0 or xs.max()==W-1 or ys.max()==H-1
        if touch and area<1500: continue              # sisa potongan dari frame tetangga
        if bw>bh*4 and area<4500: continue            # batang label/UI
        keep|=m
    a[...,3]=np.where(keep,a[...,3],0); ys,xs=np.where(keep); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    crop=a[y0:y1,x0:x1]; kk=keep[y0:y1,x0:x1]; h=crop.shape[0]
    low=np.where(kk[int(h*0.82):].any(axis=0))[0]; cx=low.mean() if len(low) else crop.shape[1]/2    # pusat bayangan/akar = jangkar x
    t=Image.fromarray(crop,'RGBA'); x=int(128-cx); x=max(0,min(256-t.width,x)); y=253-t.height
    sheet.paste(t,((i%4)*256+x,(i//4)*256+y),t)
sheet.save('public/assets/sprites/boss-flower.png',optimize=True); print(sheet.size,len(names),'frame')
