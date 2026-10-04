(function(root){
'use strict';
root.SM.resolveStation=function(raw){const text=String(raw||'').normalize('NFKC').replace(/\s/g,'');const exact=root.SM.stations.filter(n=>text.includes(n)).sort((a,b)=>b.length-a.length)[0];if(exact)return {name:exact,corrected:false};
 const distance=(a,b)=>{let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=next;}return prev[b.length];};
 const candidates=text.length>=3?root.SM.stations.filter(n=>n.length>=3&&distance(text,n)===1):[];return candidates.length===1?{name:candidates[0],corrected:true}:{name:'',corrected:false};
};
root.SM.clocksFromOCR=function(raw){const times=[],repairs=[];for(const line of String(raw).split('\n')){const matches=[...line.matchAll(/(?<!\d)([01]?\d|2[0-3]):([0-5]\d)(?!\d)/g)];if(matches.length){times.push(...matches.map(m=>m[1].padStart(2,'0')+':'+m[2]));continue;}const extra=line.trim().match(/^([01]\d|2[0-3]):([0-5]\d)\d$/);if(extra){const time=extra[1]+':'+extra[2];times.push(time);repairs.push({raw:line.trim(),time});}}return {times,repairs};};
if(typeof module!=='undefined')module.exports=root.SM.resolveStation;
})(typeof window!=='undefined'?window:globalThis);
