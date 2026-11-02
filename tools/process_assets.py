# Mengubah aset mentah (latar putih, nomor frame) menjadi PNG transparan + spritesheet seragam 4x3 (256px/frame)
import numpy as np, sys
from PIL import Image
from scipy import ndimage as ndi
U='/mnt/user-data/uploads/'; O='public/assets/'
def bgmask(a, thr=232):
    near=(a[...,:3].min(axis=2)>=thr)
    lab,_=ndi.label(near)
    edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    return np.isin(lab,list(edge))
def to_rgba(im, thr=232):
    a=np.array(im.convert('RGB')); bg=bgmask(a,thr)
    alpha=np.where(bg,0,255).astype(np.uint8)
    alpha=ndi.binary_erosion(alpha>0,iterations=1)*255
    return np.dstack([a,alpha.astype(np.uint8)])
def portrait(src,dst):
    r=to_rgba(Image.open(U+src),240); im=Image.fromarray(r,'RGBA'); im=im.crop(im.getbbox())
    im.thumbnail((700,1050),Image.LANCZOS); im.save(O+dst,optimize=True); print(dst,im.size)
def isyellow(px): 
    r,g,b=px[:,0].mean(),px[:,1].mean(),px[:,2].mean(); return r>200 and g>130 and b<120
def sheet(src,dst):
    full=np.array(Image.open(U+src).convert('RGB')); H,W,_=full.shape
    cw,ch=W//4,H//3; frames=[]
    for i in range(12):
        r,c=divmod(i,4); cell=full[r*ch:(r+1)*ch,c*cw:(c+1)*cw]
        rgba=to_rgba(Image.fromarray(cell),236); al=rgba[...,3]>0
        lab,n=ndi.label(al,structure=np.ones((3,3)))
        for k in range(1,n+1):
            m=lab==k; ys,xs=np.where(m); bw,bh=xs.max()-xs.min()+1,ys.max()-ys.min()+1
            if bw<70 and bh<70 and not isyellow(rgba[m][:,:3]): rgba[m]=0  # buang nomor/badge
        frames.append(rgba)
    boxes=[];
    for f in frames:
        ys,xs=np.where(f[...,3]>0); boxes.append((xs.min(),ys.min(),xs.max()+1,ys.max()+1,xs.mean()))
    s=min(236/max(b[3]-b[1] for b in boxes), 236/max(b[2]-b[0] for b in boxes))
    out=Image.new('RGBA',(1024,768))
    for i,(f,b) in enumerate(zip(frames,boxes)):
        im=Image.fromarray(f,'RGBA').crop((b[0],b[1],b[2],b[3]))
        im=im.resize((max(1,int(im.width*s)),max(1,int(im.height*s))),Image.LANCZOS)
        cx=(b[4]-b[0])*s; x=int(128-cx); x=max(0,min(256-im.width,x)); y=252-im.height
        out.paste(im,((i%4)*256+x,(i//4)*256+y),im)
    out.save(O+dst,optimize=True); print(dst)
portrait('Pemuda_Anime_Berseragam_Taktis_Berornamen_Tribal.png','characters/arka.png')
portrait('Gadis_Anime_Taktis_Berseragam_Sekolah.png','characters/nara.png')
sheet('12-Frame_Pixel_Art_Reading_Sprite_Sheet.png','sprites/arka-read.png')
sheet('Sprite_Animasi_Membaca_Karakter_Anime__1_.png','sprites/nara-read.png')
sheet('12-Frame_Fantasy_Runner_Sprite_Sheet.png','sprites/arka-run.png')
sheet('Lembar_Sprite_Lari_Karakter_Anime_12_Pose__1_.png','sprites/nara-run.png')
