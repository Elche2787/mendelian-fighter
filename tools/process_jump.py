# Sprite lompat -> sheet 4x3 (256px/frame), skala disamakan dengan sprite lari, kaki rata di bawah sel.
import colorsys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
U='/mnt/user-data/uploads/'; O='public/assets/sprites/'
def rgba(im,thr=236):
    a=np.array(im.convert('RGB')); near=a.min(axis=2)>=thr
    lab,_=ndi.label(near); edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    al=ndi.binary_erosion(~np.isin(lab,list(edge)),iterations=1)
    return a,al
def frames(src,cols,rows):
    a,al=rgba(Image.open(U+src)); H,W=al.shape; cw,ch=W/cols,H/rows
    lab,n=ndi.label(al,structure=np.ones((3,3))); keep=np.zeros_like(al)
    for k in range(1,n+1):
        m=lab==k; ys,xs=np.where(m); bw,bh=xs.max()-xs.min()+1,ys.max()-ys.min()+1; px=a[m]; med=np.median(px,axis=0)/255
        h,s,v=colorsys.rgb_to_hsv(*med); area=m.sum()
        if bw<70 and bh<70 and (v<0.5 or (v>0.85 and s<0.15)): continue   # badge & angka nomor
        if bw<14 or bh<14: continue                                 # garis gerak / garis tanah
        if area<8000 and s<0.15 and 0.35<v<=1.0: continue          # debu abu-abu bawaan sheet
        keep|=m
    lab,n=ndi.label(ndi.binary_dilation(keep,iterations=10)); out=[[] for _ in range(cols*rows)]
    for k in range(1,n+1):
        m=(lab==k)&keep
        if m.sum()<400: continue
        ys,xs=np.where(m); i=min(rows-1,int(ys.mean()//ch))*cols+min(cols-1,int(xs.mean()//cw)); out[i].append(m)
    res=[]
    for ms in out:
        m=np.any(ms,axis=0); ys,xs=np.where(m)
        res.append((np.dstack([a,(m*255).astype(np.uint8)])[ys.min():ys.max()+1,xs.min():xs.max()+1], xs.mean()-xs.min()))
    return res
def run_h(name):
    im=np.array(Image.open(O+name))[...,3]; hs=[]
    for i in range(12):
        c=im[(i//4)*256:(i//4+1)*256,(i%4)*256:(i%4+1)*256]; ys=np.where(c.max(axis=1)>0)[0]; hs.append(ys.max()-ys.min()+1)
    return float(np.median(hs))
def build(src,cols,rows,runfile,dst,standing=11):
    fr=frames(src,cols,rows); target=run_h(runfile)*1.06
    s=target/fr[standing][0].shape[0]; s=min(s,250/max(f[0].shape[0] for f in fr),250/max(f[0].shape[1] for f in fr))
    sheet=Image.new('RGBA',(1024,768))
    for i,(arr,cx) in enumerate(fr):
        im=Image.fromarray(arr,'RGBA'); im=im.resize((max(1,int(im.width*s)),max(1,int(im.height*s))),Image.LANCZOS)
        x=int(128-cx*s); x=max(0,min(256-im.width,x)); sheet.paste(im,((i%4)*256+x,(i//4)*256+253-im.height),im)
    sheet.save(O+dst,optimize=True); print(dst,'skala',round(s,3),'tinggi lari',run_h(runfile))
build('12-Frame_Anime_Jump_Sprite_Sheet.png',6,2,'arka-run.png','arka-jump.png')
build('Lembar_Sprite_Lompat_Gadis_Anime_Pixel_Art.png',4,3,'nara-run.png','nara-jump.png')
