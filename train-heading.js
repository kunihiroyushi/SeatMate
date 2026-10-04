(function(root){
'use strict';
const compact=s=>String(s||'').normalize('NFKC').replace(/\s/g,'');
root.SM.trainHeading=function(line,next=''){
 const text=compact(line),following=compact(next);let name=root.SM.parseOCR(text).fields.train;
 if(name&&/\d/.test(name)){
  // A wrapped digit belongs to the number only when the first line did not already end it with 号.
  if(!/号/.test(text)&&/^\d{1,3}号/.test(following))name=name.replace(/号$/,'')+following.match(/^\d{1,3}/)[0];
  return name.replace(/号$/,'')+'号';
 }
 if(name&&/^\d{1,3}号/.test(following))return name+following.match(/^\d{1,3}号/)[0];
 const route=text.match(/(?:JR|JＲ)?(東海道本線|東北本線|中央本線|山手線|京浜東北線|横須賀線|総武本線|信越本線|篠ノ井線|大糸線|北陸本線|山陽本線|鹿児島本線)/);
 if(route&&!/方面|行$/.test(text))return 'JR'+route[1];
 return '';
};
root.SM.joinTrainLines=function(raw){const lines=String(raw||'').split('\n');for(let i=0;i<lines.length;i++){const train=root.SM.trainHeading(lines[i],lines[i+1]);if(train){const current=root.SM.trainHeading(lines[i]);if(train!==current&&/^\s*\d{1,3}\s*号/.test(lines[i+1]||'')){lines[i]=train;lines[i+1]=lines[i+1].replace(/^\s*\d{1,3}\s*号/,'');}}}return lines.join('\n');};
if(typeof module!=='undefined')module.exports={trainHeading:root.SM.trainHeading,joinTrainLines:root.SM.joinTrainLines};
})(typeof window!=='undefined'?window:globalThis);
