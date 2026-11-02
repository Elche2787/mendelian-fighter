# Ikon item 16-bit (16x16 piksel, diperbesar 8x tanpa interpolasi -> 128x128).
from PIL import Image
POTION = [
"................",
"......kkkk......",
".....kCCcck.....",
"......kccck.....",
"......kgggk.....",
"......kgggk.....",
".....kgggggk....",
"....kgrrrrrgk...",
"...kgrRRrrrrgk..",
"...kgrRhrrrrgk..",
"...kgrRrrrrddgk.",
"...kgrrrrrdddgk.",
"...kgrrrrddddgk.",
"....kgddddddgk..",
".....kkkkkkkk...",
"................"]
POTION_PAL={'k':'#1a1020','C':'#f0b060','c':'#b8733a','g':'#d8f0ff','r':'#d63a4a','R':'#ff7a88','h':'#ffffff','d':'#8a1f33'}
INJECT = [
"......kkkk......",
".....kppppk.....",
"......kwwk......",
"......kwwk......",
"...kkkkkkkkkk...",
"....kggggggk....",
"....kgllllgk....",
"....kglLlldk....",
"....kgllDllk....",
"....kglDlllk....",
"....kgllllgk....",
"....kggggggk....",
"...kkkkkkkkkk...",
".......kk.......",
".......ss.......",
".......s........"]
INJECT_PAL={'k':'#1a1020','p':'#9aa3b8','w':'#e8eef8','g':'#cfe9ff','l':'#4cdc7a','L':'#b6ffc2','d':'#1f9e4a','D':'#1a7a3c','s':'#e8eef8'}
MEMBRANE = [
"................",
".....kkkkkk.....",
"...kkbbbbbbkk...",
"..kbbBBBBBBbbk..",
".kbbBwwBBBBBbbk.",
".kbBwwBBBBBBBbk.",
"kbbBBBBhhBBBBbbk",
"kbBBBBhBBhBBBBbk",
"kbBBBBhBBhBBBBbk",
"kbbBBBBhhBBBBbbk",
".kbBBBBBBBBBBbk.",
".kbbBBBBBBBBbbk.",
"..kbbbBBBBbbbk..",
"...kkbbbbbbkk...",
".....kkkkkk.....",
"................"]
MEMBRANE_PAL={'k':'#12203f','b':'#2b6fd6','B':'#6fb8ff','w':'#ffffff','h':'#bff4ff'}
def make(rows,pal,name):
    assert all(len(r)==16 for r in rows) and len(rows)==16,(name,[len(r) for r in rows])
    im=Image.new('RGBA',(16,16),(0,0,0,0)); px=im.load()
    for y,r in enumerate(rows):
        for x,c in enumerate(r):
            if c!='.': px[x,y]=tuple(int(pal[c][i:i+2],16) for i in (1,3,5))+(255,)
    im.resize((128,128),Image.NEAREST).save(f'public/assets/items/{name}.png'); print(name)
make(POTION,POTION_PAL,'potion'); make(INJECT,INJECT_PAL,'inject'); make(MEMBRANE,MEMBRANE_PAL,'membrane')
