# Sprite pertarungan: Walnut Rooster (idle/hit/attack) dan kombo pedang Arka -> sheet seragam.
import colorsys, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
U='/mnt/user-data/uploads/'; O='public/assets/sprites/'
def load(src,whiten=None):
    im=Image.open(U+src).convert('RGB')
    if whiten: ImageDraw.Draw(im).rectangle(whiten,fill=(255,255,255))
    a=np.array(im); near=a.min(axis=2)>=238
    lab,_=ndi.label(near); edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    return a, ndi.binary_erosion(~np.isin(lab,list(edge)),iterations=1)
def frames(src,cols,rows,whiten=None,minarea=80):
    a,al=load(src,whiten); H,W=al.shape; cw,ch=W/cols,H/rows
    lab,n=ndi.label(al,structure=np.ones((3,3))); keep=np.zeros_like(al)
    for k in range(1,n+1):
        m=lab==k; ys,xs=np.where(m); bw,bh=xs.max()-xs.min()+1,ys.max()-ys.min()+1
        med=np.median(a[m],axis=0)/255; h,s,v=colorsys.rgb_to_hsv(*med)
        if bw<80 and bh<45 and v<0.5: continue                # badge nomor
        if m.sum()<minarea: continue
        keep|=m
    lab,n=ndi.label(keep,structure=np.ones((3,3))); out=[[] for _ in range(cols*rows)]
    for k in range(1,n+1):
        m=(lab==k)&keep
        if m.sum()<minarea: continue
        ys,xs=np.where(m); i=min(rows-1,int(ys.mean()//ch))*cols+min(cols-1,int(xs.mean()//cw)); out[i].append(m)
    res=[]
    for ms in out:
        m=np.any(ms,axis=0); ys,xs=np.where(m); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
        rgb=a[y0:y1,x0:x1]; mm=m[y0:y1,x0:x1]
        hsv=np.array([colorsys.rgb_to_hsv(*(p/255)) for p in rgb[mm][::7]]) if mm.any() else np.zeros((1,3))
        res.append(dict(arr=np.dstack([rgb,(mm*255).astype(np.uint8)]),mask=mm,rgb=rgb))
    return res
def body_anchor(f,effect):
    rgb,mm=f['rgb'],f['mask']; hh,ww=mm.shape
    px=rgb.reshape(-1,3).astype(float)/255; mx=px.max(1); mn=px.min(1); s=np.where(mx>0,(mx-mn)/np.maximum(mx,1e-6),0); v=mx
    r,g,b=px[:,0],px[:,1],px[:,2]
    eff=effect(r,g,b,s,v).reshape(hh,ww)&mm
    body=mm&~eff
    if body.sum()<200: body=mm
    ys,xs=np.where(body); return xs.mean(), ys.min(), ys.max()+1
def build(fs,cols,rows,cell,dst,scale,effect,bottom=None):
    cw,ch=cell; sheet=Image.new('RGBA',(cw*cols,ch*rows))
    for i,f in enumerate(fs):
        cx,y0,y1=body_anchor(f,effect); im=Image.fromarray(f['arr'],'RGBA'); h,w=f['mask'].shape
        im=im.resize((max(1,int(w*scale)),max(1,int(h*scale))),Image.LANCZOS)
        x=int(cw/2-cx*scale); yb=int(ch-4-(h-y1)*scale*0 - 0)  # kaki (dasar tubuh) di dasar sel
        y=int(ch-4-y1*scale)
        sx,sy=(i%cols)*cw,(i//cols)*ch
        tile=Image.new('RGBA',(cw,ch)); tile.paste(im,(x,y),im); sheet.paste(tile,(sx,sy))
    sheet.save(O+dst,optimize=True); print(dst,sheet.size)
fire=lambda r,g,b,s,v:(v>0.8)&(s>0.55)&(r>g)&~((r>0.7)&(g<0.25)&(b<0.25)&False)
blue=lambda r,g,b,s,v:(b>0.7)&(r<0.7)&(b>r+0.15)&(v>0.6)
BAN=(0,0,450,105)
idle=frames('Walnut_Chicken_Idle_Animation_Sheet.png',4,2,BAN)
hit=frames('Walnut_Chicken_Hit_Animation_Sprite_Sheet.png',4,2,BAN)
atk=frames('Monster_Walnut_Chicken_Attack_Sheet.png',4,3,BAN)
# skala bersama: tubuh ayam pada idle setinggi ~215px
hs=[f['mask'].shape[0] for f in idle]; sc=215/np.median(hs)
sc_atk=sc*idle[0]['mask'].shape[1]/atk[0]['mask'].shape[1]      # samakan lebar tubuh pose awal serangan dengan idle
for fs,c,r,d,k in [(idle,4,2,'rooster-idle.png',sc),(hit,4,2,'rooster-hit.png',sc),(atk,4,3,'rooster-attack.png',sc_atk)]:
    build(fs,c,r,(448,288),d,k,fire)
combo=frames('Anime_Sword_Combo_Pixel_Sprite_Sheet.png',5,2)
bh=[body_anchor(f,blue)[2]-body_anchor(f,blue)[1] for f in combo]; sc2=205/np.median(bh)
build(combo,5,2,(448,288),'arka-combo.png',sc2,blue)
# Nara: sihir DNA (5x2, efek biru-ungu)
dna=frames('DNA_Magic_Schoolgirl_Sprite_Sheet.png',5,2)
def drop_floor_shadow(f):   # bayangan lantai lavender di bawah kaki dihapus (komponen lebar, pucat, di dasar frame)
    rgb=f['rgb'].astype(float)/255; mx=rgb.max(2); mn=rgb.min(2); sat=np.where(mx>0,(mx-mn)/np.maximum(mx,1e-6),0)
    lav=f['mask']&(mx>0.8)&(sat<0.24)&(rgb[...,2]>=rgb[...,0]-0.02)
    lab,n=ndi.label(lav); H=lav.shape[0]
    for k in range(1,n+1):
        m=lab==k; ys,xs=np.where(m); bw,bh=xs.max()-xs.min()+1,ys.max()-ys.min()+1
        if m.sum()>1200 and bw>bh*1.4 and ys.max()>H*0.88: f['mask']&=~m
    # latar putih yang terkurung di antara kaki & bayangan (lebar, pucat, di bagian bawah)
    white=f['mask']&(mn>=0.86); lab,n=ndi.label(white)
    for k in range(1,n+1):
        m=lab==k; ys,xs=np.where(m); bw,bh=xs.max()-xs.min()+1,ys.max()-ys.min()+1
        if m.sum()>900 and bw>=bh*0.7 and ys.min()>H*0.5: f['mask']&=~m
    f['arr'][...,3]=(f['mask']*255).astype(np.uint8)
for f in dna: drop_floor_shadow(f)
bh=[body_anchor(f,blue)[2]-body_anchor(f,blue)[1] for f in dna]; sc3=205/np.median(bh)
build(dna,5,2,(448,288),'nara-combo.png',sc3,blue)
