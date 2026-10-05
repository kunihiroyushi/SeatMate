(function(root){
'use strict';
const SM=root.SM;
function journeyLegs(trips,t){return t.journeyId?trips.filter(x=>x.journeyId===t.journeyId).sort((a,b)=>a.journeyOrder-b.journeyOrder):[t];}
function endpoints(t){const line=SM.timeline(t);const from=line.find(s=>s.name===t.from),to=line.find(s=>s.name===t.to);return {departure:from?.depAt??from?.arrAt??null,arrival:to?.arrAt??to?.depAt??null};}
function validateJourney(legs){for(let i=1;i<legs.length;i++){const a=legs[i-1],b=legs[i];if(a.to!==b.from)return `${i}本目の降車駅と${i+1}本目の乗車駅が一致しません。`;const end=endpoints(a).arrival,start=endpoints(b).departure;if(end!==null&&start!==null&&start<end)return `${i+1}本目の出発が前の列車の到着より早くなっています。乗車日と時刻を確認してください。`;}return '';}
function transferState(legs,t,now=Date.now()){
 const i=legs.findIndex(x=>x.id===t.id),next=legs[i+1];if(!next)return {next:null,message:'この旅の最後の列車です。'};
 if(t.to!==next.from)return {next,message:'乗降駅がつながっていません。乗車情報を確認してください。'};
 const arrive=endpoints(t).arrival,depart=endpoints(next).departure;
 if(arrive===null||depart===null)return {next,message:`${t.to}で${next.train}へ乗換。時刻を登録すると待ち時間を表示します。`};
 if(depart<arrive)return {next,message:'次の列車の出発が到着より早くなっています。日付・時刻を確認してください。'};
 if(now<arrive)return {next,message:`${t.to}で乗換 / 乗換時間 ${Math.round((depart-arrive)/60000)}分 / 次は${next.train}`};
 if(now<depart)return {next,message:`${t.to}で乗換待ち / ${next.train}の発車まであと${Math.ceil((depart-now)/60000)}分`};
 return {next,message:`${next.train}の登録発車時刻を過ぎました。乗り換えたら切り替えてください。`};
}
Object.assign(SM,{journeyLegs,endpoints,validateJourney,transferState});
if(typeof module!=='undefined')module.exports={journeyLegs,endpoints,validateJourney,transferState};
})(typeof window!=='undefined'?window:globalThis);
