from pathlib import Path
from PIL import Image,ImageDraw
import random,math
random.seed(632)
size=1024
image=Image.new('RGBA',(size,size))
draw=ImageDraw.Draw(image)
draw.rectangle((0,0,45,45),fill=(255,255,255,255))

def leaf(cx,cy,angle,length,width,color):
    along=(math.cos(angle),math.sin(angle))
    normal=(-along[1],along[0])
    pts=[]
    for u,v in [(-.55,0),(-.31,.50),(.05,.71),(.43,.32),(.66,0),(.37,-.31),(.02,-.64),(-.33,-.43)]:
        pts.append((cx+along[0]*u*length+normal[0]*v*width,cy+along[1]*u*length+normal[1]*v*width))
    draw.polygon(pts,fill=color)

for conifer,cx in enumerate([253,768]):
    cy=520
    for finger in range(18):
        angle=finger*math.tau/18+random.uniform(-.15,.15)
        ux,uy=math.cos(angle),math.sin(angle)
        span=random.uniform(142,213)
        end=(cx+ux*span,cy+uy*span)
        draw.line([(cx,cy),end],fill=(207,213,201,255),width=3 if conifer else 6)
        for place in range(4,26 if conifer else 17):
            u=(place+1)/(28 if conifer else 19)
            x,y=cx+ux*span*u,cy+uy*span*u
            for side in [-1,1]:
                angle2=angle+side*random.uniform(.38,1.45)
                for cluster in range(2 if conifer else 3):
                    lean=random.uniform(5,24)*(1-u*.55)
                    x2=x+math.cos(angle2)*lean*cluster
                    y2=y+math.sin(angle2)*lean*cluster
                    bright=random.randrange(133,255)
                    if conifer:
                        length=random.uniform(18,44)*(1-u*.62)
                        leaf(x2,y2,angle2,length,random.uniform(4,8), (bright,bright,min(255,bright+4),255))
                    else:
                        length=random.uniform(20,49)*(1-u*.36)
                        leaf(x2,y2,angle2,length,random.uniform(12,32), (bright,bright,min(255,bright+4),255))
image.resize((512,512),Image.Resampling.LANCZOS).save(
    Path(__file__).resolve().parents[1] / 'src/assets/environment/forest-needles.webp',quality=89,method=6)
