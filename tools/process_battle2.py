# Sprite baru: asap ledakan (latar kotak-kotak palsu), standby Arka, standby/cast/summon Nara.
import colorsys, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
U='/mnt/user-data/uploads/'; O='public/assets/sprites/'
def lum(a): return a.max(axis=2).astype(int)
def load(src,whiten=None,checker=False):
    im=Image.open(U+src).convert('RGB')
    if whiten: ImageDraw.Draw(im).rectangle(whiten,fill=(255,255,255))
    a=np.array(im)
    if checker: near=(a.min(axis=2)>=190)&((a.max(axis=2)-a.min(axis=2))<=14)    # kotak putih/abu-abu latar
    else: near=a.min(axis=2)>=238
    lab,_=ndi.label(near); edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    return a, ndi.binary_erosion(~np.isin(lab,list(edge)),iterations=1)
def frames(src,cols,rows,whiten=None,minarea=80,checker=False,merge=0):
    a,al=load(src,whiten,checker); H,W=al.shape; cw,ch=W/cols,H/rows
    lab,n=ndi.label(al,structure=np.ones((3,3))); keep=np.zeros_like(al)
    for k in range(1,n+1):
        m=lab==k; ys,xs=np.where(m); bw,bh=xs.max()-xs.min()+1,ys.max()-ys.min()+1
        h,s,v=colorsys.rgb_to_hsv(*(np.median(a[m],axis=0)/255))
        if bw<80 and bh<45 and v<0.5: continue
        if m.sum()<minarea: continue
        keep|=m
    base=ndi.binary_dilation(keep,iterations=merge) if merge else keep
    lab,n=ndi.label(base,structure=np.ones((3,3))); out=[[] for _ in range(cols*rows)]
    for k in range(1,n+1):
        m=(lab==k)&keep
        if m.sum()<minarea: continue
        ys,xs=np.where(m); i=min(rows-1,int(ys.mean()//ch))*cols+min(cols-1,int(xs.mean()//cw)); out[i].append(m)
    res=[]
    for ms in out:
        m=np.any(ms,axis=0); ys,xs=np.where(m); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
        rgb=a[y0:y1,x0:x1]; mm=m[y0:y1,x0:x1]; res.append(dict(arr=np.dstack([rgb,(mm*255).astype(np.uint8)]),mask=mm,rgb=rgb))
    return res
def frames_cut(src,cols,rows,whiten=None,minarea=80):
    """Membagi sheet di celah paling kosong dekat batas sel nominal (efek yang menempel antar frame tidak ikut ke frame tetangga)."""
    a,al=load(src,whiten); H,W=al.shape; cw,ch=W/cols,H/rows
    lab,n=ndi.label(al,structure=np.ones((3,3))); keep=np.zeros_like(al)
    for k in range(1,n+1):
        m=lab==k; ys,xs=np.where(m); bw,bh=xs.max()-xs.min()+1,ys.max()-ys.min()+1
        h,s_,v=colorsys.rgb_to_hsv(*(np.median(a[m],axis=0)/255))
        if (bw<80 and bh<45 and v<0.5) or m.sum()<minarea: continue
        keep|=m
    def cut(profile,nominal,span):
        lo=max(1,int(nominal-span)); hi=min(len(profile)-1,int(nominal+span)); w=np.convolve(profile,np.ones(5)/5,mode='same')
        seg=w[lo:hi]; best=np.where(seg<=seg.min()+1e-9)[0]; return lo+int(best[len(best)//2])
    ycuts=[0]+[cut(keep.sum(axis=1),ch*r,ch*0.18) for r in range(1,rows)]+[H]
    res=[]
    for r in range(rows):
        band=keep[ycuts[r]:ycuts[r+1]]; xc=[0]+[cut(band.sum(axis=0),cw*c,cw*0.3) for c in range(1,cols)]+[W]
        for c in range(cols):
            m=np.zeros_like(keep); m[ycuts[r]:ycuts[r+1],xc[c]:xc[c+1]]=band[:,xc[c]:xc[c+1]]
            ys,xs=np.where(m); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
            rgb=a[y0:y1,x0:x1]; mm=m[y0:y1,x0:x1]; res.append(dict(arr=np.dstack([rgb,(mm*255).astype(np.uint8)]),mask=mm,rgb=rgb))
    return res
def drop_floor(f):
    rgb=f['rgb'].astype(float)/255; mx=rgb.max(2); mn=rgb.min(2); sat=np.where(mx>0,(mx-mn)/np.maximum(mx,1e-6),0); H=mx.shape[0]
    lav=f['mask']&(mx>0.8)&(sat<0.24)&(rgb[...,2]>=rgb[...,0]-0.02); lab,n=ndi.label(lav)
    for k in range(1,n+1):
        m=lab==k; ys,xs=np.where(m); bw,bh=xs.max()-xs.min()+1,ys.max()-ys.min()+1
        if ys.max()>H*0.85 and ((m.sum()>1200 and bw>bh*1.4) or (m.sum()>120 and bw>bh*4)): f['mask']&=~m
    white=f['mask']&(mn>=0.86); lab,n=ndi.label(white)
    for k in range(1,n+1):
        m=lab==k; ys,xs=np.where(m); bw,bh=xs.max()-xs.min()+1,ys.max()-ys.min()+1
        if m.sum()>900 and bw>=bh*0.7 and ys.min()>H*0.5: f['mask']&=~m
    f['arr'][...,3]=(f['mask']*255).astype(np.uint8)
def anchor(f,effect):
    rgb,mm=f['rgb'],f['mask']; hh,ww=mm.shape; px=rgb.reshape(-1,3).astype(float)/255
    mx=px.max(1); mn=px.min(1); s=np.where(mx>0,(mx-mn)/np.maximum(mx,1e-6),0)
    eff=effect(px[:,0],px[:,1],px[:,2],s,mx).reshape(hh,ww)&mm; body=mm&~eff
    if body.sum()<200: body=mm
    ys,xs=np.where(body); return xs.mean(), ys.min(), ys.max()+1
def build(fs,outcols,cell,dst,scale,effect):
    cw,ch=cell; rows=-(-len(fs)//outcols); sheet=Image.new('RGBA',(cw*outcols,ch*rows))
    for i,f in enumerate(fs):
        cx,y0,y1=anchor(f,effect); h,w=f['mask'].shape
        im=Image.fromarray(f['arr'],'RGBA').resize((max(1,int(w*scale)),max(1,int(h*scale))),Image.LANCZOS)
        x=int(cw/2-cx*scale); y=int(ch-4-y1*scale)
        tile=Image.new('RGBA',(cw,ch)); tile.paste(im,(x,y),im); sheet.paste(tile,((i%outcols)*cw,(i//outcols)*ch))
    sheet.save(O+dst,optimize=True); print(dst,sheet.size,len(fs),'frame')
magic=lambda r,g,b,s,v:(b>0.7)&(r<0.75)&(b>r+0.12)&(v>0.6)
noeff=lambda r,g,b,s,v:np.zeros_like(r,dtype=bool)
BAN=(0,0,440,100)
# --- asap ledakan: dasar asap rata di bawah, skala seragam
sm=frames('Pixel_Smoke_Explosion_Sprite_Sheet.png',3,2,checker=True,minarea=60,merge=16)
s=min(360/max(f['mask'].shape[1] for f in sm), 420/max(f['mask'].shape[0] for f in sm))
cw,ch=384,448; sheet=Image.new('RGBA',(cw*3,ch*2))
for i,f in enumerate(sm):
    h,w=f['mask'].shape; im=Image.fromarray(f['arr'],'RGBA').resize((int(w*s),int(h*s)),Image.LANCZOS)
    tile=Image.new('RGBA',(cw,ch)); tile.paste(im,(int(cw/2-im.width/2),ch-4-im.height),im); sheet.paste(tile,((i%3)*cw,(i//3)*ch))
sheet.save(O+'smoke.png',optimize=True); print('smoke.png',sheet.size)
# --- Arka standby (6 frame): tinggi tubuh disamakan dengan frame 0 sprite kombo
combo=frames('Anime_Sword_Combo_Pixel_Sprite_Sheet.png',5,2)
bh=[anchor(f,magic)[2]-anchor(f,magic)[1] for f in combo]; sc2=205/np.median(bh); target=(anchor(combo[0],magic)[2]-anchor(combo[0],magic)[1])*sc2
st=frames('Six-Frame_Pixel_RPG_Idle_Sprite_Sheet.png',3,2)
h=[anchor(f,noeff)[2]-anchor(f,noeff)[1] for f in st]; build(st,3,(448,288),'arka-standby.png',target/np.median(h),noeff)
# --- Nara: tiap sheet dinormalkan dari frame 0 (pose siaga) -> tinggi tubuh 205px
def nara(src,cols,rows,dst):
    fs=frames_cut(src,cols,rows,BAN)
    for f in fs: drop_floor(f)
    a0=anchor(fs[0],magic); build(fs,5,(448,448),dst,205/(a0[2]-a0[1]),magic)
nara('Anime_Schoolgirl_Standby_Sprite_Sheet.png',6,2,'nara-standby.png')
nara('Pixel_Art_Magic_Casting_Sprite_Sheet.png',6,2,'nara-cast.png')
nara('Summon_DNA_Pixel_Art_Sprite_Sheet.png',7,2,'nara-summon.png')
