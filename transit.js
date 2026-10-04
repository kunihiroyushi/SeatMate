(function(root){
'use strict';
const trainRE=/(?:ゆふいんの森|成田エクスプレス|サンダーバード|はくたか|かがやき|あさま|たにがわ|やまびこ|はやぶさ|こまち|つばさ|なすの|のぞみ|ひかり|こだま|みずほ|さくら|つばめ|しらさぎ|くろしお|やくも|はるか|ソニック|にちりん|かもめ|みどり|ハウステンボス|しなの|あずさ|かいじ|ひたち|ときわ|踊り子|しおさい|きりしま|ゆふ|とき)\d+号?/g;
const ignored=/^(?:停車駅(?:一覧)?|途中停車駅|列車(?:詳細|情報)?|時刻表|乗換(?:案内)?|発|着|出発|到着|地図|路線図|運行情報|乗車位置|降車位置|ホーム|乗車|降車|徒歩|普通|特急|急行|快速|指定席|自由席|グリーン車|運賃|料金|検索|共有|戻る|閉じる|詳細|経路|乗換なし|経由|ルート|駅名|時刻|着発時刻|時刻表を更新)$/;
const normalize=s=>String(s||'').normalize('NFKC').replace(/\r/g,'').replace(/(?<=[一-龠々ヶぁ-んァ-ヶー])[ \t]+(?=[一-龠々ヶぁ-んァ-ヶー])/g,'');
function tokens(line){const out=[];const re=/(?<!\d)([01]?\d|2[0-3])[:.時]([0-5]\d)分?(?!\d)/g;let m;while((m=re.exec(line))){const before=line.slice(Math.max(0,m.index-4),m.index),after=line.slice(re.lastIndex,re.lastIndex+3);const label=after.match(/^\s*(着|発)/)?.[1]||before.match(/(着|発)\s*$/)?.[1]||null;out.push({value:m[1].padStart(2,'0')+':'+m[2],label});}return out;}
function nameIn(line){
 if(/→|⇒|➡|->/.test(line)||ignored.test(line))return null;
 trainRE.lastIndex=0;if(trainRE.test(line.replace(/\s/g,'')))return null;
 if(/所要|運賃|料金/.test(line))return null;
 if(/号車|番線|番ホーム|乗換\d|\d+円|\d+分/.test(line)&&!tokens(line).length)return null;
 let bare=line.replace(/\([^)]*\)/g,'').replace(/(?<!\d)([01]?\d|2[0-3])[:.時]([0-5]\d)分?(?!\d)/g,' ').replace(/(?:到着|出発|発車)|(?:^|\s)(?:発|着)(?=\s|$)/g,' ').replace(/(?:\d+番線|\d+番ホーム)/g,' ').replace(/^[\s●○・|│｜\d.)]+/,'').trim().replace(/^(?:発|着)\s+|\s+(?:発|着)$/g,'').trim().replace(/駅$/,'');
 bare=bare.replace(/\s+(?:停車|通過).*$/,'').trim();
 if(!bare||ignored.test(bare)||!/[一-龠々ヶぁ-んァ-ヶー]/.test(bare)||!/^[一-龠々ヶぁ-んァ-ヶーA-Za-z・]{2,20}$/.test(bare))return null;
 return bare;
}
function stop(name,list){let arr=null,dep=null;const unlabeled=[];for(const t of list){if(t.label==='着')arr=t.value;else if(t.label==='発')dep=t.value;else unlabeled.push(t.value);}
 if(!arr&&!dep){if(unlabeled.length>=2){arr=unlabeled[0];dep=unlabeled[1];}else dep=unlabeled[0]||null;}else {if(!arr&&dep&&unlabeled.length)arr=unlabeled[0];else if(!dep&&arr&&unlabeled.length)dep=unlabeled.at(-1);}
 return {name,arr,dep};}
function parseTransit(raw,year=new Date().getFullYear()){
 const text=normalize(raw),base=root.SM.parseOCR(text,year),fields={...base.fields},warnings=[];
 trainRE.lastIndex=0;const trains=[...new Set([...text.replace(/\s/g,'').matchAll(trainRE)].map(m=>/号$/.test(m[0])?m[0]:m[0]+'号'))];
 if(trains.length===1)fields.train=trains[0];
 const lines=text.split('\n').map(s=>s.trim()).filter(Boolean),items=lines.filter(line=>!/(?:20\d{2})[年/.-]|\d{1,2}月\d{1,2}日|(?<!\d)\d{1,2}\/\d{1,2}|→|⇒|➡|->/.test(line)).map(line=>({line,name:nameIn(line),times:tokens(line)}));
 // An alternating timetable beginning with a clock uses clock-before-station layout.
 const first=items.find(i=>i.name||i.times.length);const before=!!first&&!first.name&&!!first.times.length;
 let pending=[],current=null,stops=[];
 const commit=()=>{if(current){stops.push(stop(current.name,current.times));current=null;}};
 for(const item of items){
  if(item.name){commit();current={name:item.name,times:item.times.length?item.times:before?pending:[]};pending=[];if(before||item.times.length)commit();}
  else if(item.times.length){if(!before&&current)current.times.push(...item.times);else pending.push(...item.times);}
 }
 commit();
 // Only unknown stand-alone headings with no clock were discarded, while known route rows keep missing times.
 stops=stops.filter(s=>s.arr||s.dep);
 const merged=[];for(const s of stops){const old=merged.find(x=>x.name===s.name);if(old){old.arr=s.arr||old.arr;old.dep=s.dep||old.dep;}else merged.push(s);}
 stops=merged.length?merged:base.stops;
 if(stops.length>=2){if(!/→|⇒|➡|->|乗車駅|出発駅/.test(text))fields.from=stops[0].name;if(!/→|⇒|➡|->|降車駅|到着駅/.test(text))fields.to=stops.at(-1).name;}
 if(!fields.date){const m=text.match(/(?<!\d)(\d{1,2})\/(\d{1,2})(?!\d)/);if(m){const value=`${year}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;if(Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value)fields.date=value;}}
 if(!/(?:20\d{2})\s*[年/.-]/.test(text)&&fields.date)warnings.push('年がない日付にはフォームの年を補いました。乗車日を確認してください。');
 if(trains.length>1)warnings.push('複数の列車が含まれています。乗る列車1本の停車駅一覧だけに絞って再解析してください。');
 if(!stops.length)warnings.push('停車駅・時刻を読み取れませんでした。停車駅一覧のテキストか画像を追加してください。');
 else if(stops.length<3)warnings.push('抽出できた駅は2駅以下です。途中駅が表示されている一覧も取り込んでください。');
 if(stops.some(s=>s.arr===null||s.dep===null))warnings.push('時刻が1つだけの駅は、着・発の表示がなければ出発時刻として扱います。必要に応じて修正してください。');
 if(/^\s*https?:\/\/\S+\s*$/.test(text))warnings.push('共有URLだけでは内容を取得しません。画面のテキストかスクリーンショットを取り込んでください。');
 return {fields,stops,warnings,trains,blocked:trains.length>1,source:'yahoo-import'};
}
function planStops(old,incoming,mode='replace'){
 const next=mode==='replace'?incoming.map(s=>({...s})):old.map(s=>({...s}));
 if(mode==='merge'){for(let i=0;i<incoming.length;i++){const s=incoming[i],existing=next.find(x=>x.name===s.name);if(existing){if(s.arr)existing.arr=s.arr;if(s.dep)existing.dep=s.dep;}else{const following=incoming.slice(i+1).map(x=>x.name).find(n=>next.some(x=>x.name===n));const preceding=incoming.slice(0,i).reverse().map(x=>x.name).find(n=>next.some(x=>x.name===n));let pos=following?next.findIndex(x=>x.name===following):preceding?next.findIndex(x=>x.name===preceding)+1:next.length;
 if(!following&&preceding){const tl=root.SM.timeline({date:'2000-01-01',stops:next});let value=root.SM.mins(s.arr||s.dep);const anchor=tl[pos-1];if(value!==null&&anchor?.at!=null){const base=Date.parse('2000-01-01T00:00:00+09:00');let at=base+value*60000;while(at<anchor.at)at+=86400000;while(pos<tl.length&&tl[pos].at!==null&&tl[pos].at<=at)pos++;}}
 next.splice(pos,0,{...s});}}}
 const changes=[];for(const s of next){const before=old.find(x=>x.name===s.name);if(!before)changes.push({type:'追加',name:s.name,before:null,after:s});else if((before.arr||null)!==(s.arr||null)||(before.dep||null)!==(s.dep||null))changes.push({type:'時刻変更',name:s.name,before,after:s});else if(old.findIndex(x=>x.name===s.name)!==next.findIndex(x=>x.name===s.name))changes.push({type:'順序変更',name:s.name,before,after:s});}
 for(const s of old){if(!next.some(x=>x.name===s.name))changes.push({type:'削除',name:s.name,before:s,after:null});}
 return {stops:next,changes};
}
root.SM.parseTransit=parseTransit;root.SM.planStops=planStops;
if(typeof module!=='undefined')module.exports={parseTransit,planStops};
})(typeof window!=='undefined'?window:globalThis);
