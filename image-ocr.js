(function(root){
'use strict';
// Route screenshots use colored text and a vertical line that confuses text segmentation.
// Detect that layout from pixels; leave other images unchanged.
root.SM.prepareOCRImage=async function(file){
 const url=URL.createObjectURL(file);try{
 const img=new Image();img.src=url;await img.decode();
 const probe=document.createElement('canvas');const scale=Math.min(1,900/img.width);probe.width=Math.round(img.width*scale);probe.height=Math.round(img.height*scale);const ctx=probe.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,probe.width,probe.height);
 const w=probe.width,h=probe.height,data=ctx.getImageData(0,0,w,h).data;let left=0,right=w;
 const darkColumn=x=>{let n=0;for(let y=0;y<h;y+=8){const i=(y*w+x)*4;if(data[i]<25&&data[i+1]<25&&data[i+2]<25)n++;}return n/(Math.ceil(h/8))>.9;};
 while(left<w/3&&darkColumn(left))left++;while(right>w*2/3&&darkColumn(right-1))right--;
 let line=-1,best=0;for(let x=Math.round(left+(right-left)*.12);x<left+(right-left)*.32;x++){let count=0;for(let y=0;y<h;y+=2){const i=(y*w+x)*4,r=data[i],g=data[i+1],b=data[i+2];if(g>r+45&&g>b+30||b>r+65&&b>g+30)count++;}if(count>best){best=count;line=x;}}
 if(best<h*.10)return file;
 let sum=0,count=0;for(let x=Math.max(left,line-10);x<=Math.min(right-1,line+10);x++){let n=0;for(let y=0;y<h;y+=2){const i=(y*w+x)*4,r=data[i],g=data[i+1],b=data[i+2];if(g>r+45&&g>b+30||b>r+65&&b>g+30)n++;}if(n>=best*.8){sum+=x;count++;}}if(count)line=sum/count;
 // Keep the timetable and train headings, omit the fare sidebar.
 const width=Math.round((right-left)*.81),factor=Math.min(2,3500/h);const out=document.createElement('canvas');out.width=Math.round(width*factor);out.height=Math.round(h*factor);const c=out.getContext('2d',{willReadFrequently:true});c.drawImage(probe,left,0,width,h,0,0,out.width,out.height);const pixels=c.getImageData(0,0,out.width,out.height);
 for(let y=0;y<out.height;y++)for(let x=0;x<out.width;x++){const i=(y*out.width+x)*4,r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];if(Math.abs(x/factor+left-line)<18){pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;}else if(b>r+40&&b>g+20||g>r+30&&g>b+20){pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=0;}}
 c.putImageData(pixels,0,0);return out.toDataURL('image/png');
 }finally{URL.revokeObjectURL(url);}
};
})(window);
