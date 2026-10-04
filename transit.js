(function(root){
'use strict';
const trainRE=/(?:ゆふいんの森|成田エクスプレス|サンダーバード|はくたか|かがやき|あさま|たにがわ|やまびこ|はやぶさ|こまち|つばさ|なすの|のぞみ|ひかり|こだま|みずほ|さくら|つばめ|しらさぎ|くろしお|やくも|はるか|ソニック|にちりん|かもめ|みどり|ハウステンボス|しなの|あずさ|かいじ|ひたち|ときわ|踊り子|しおさい|きりしま|ゆふ|とき)\d+号?/g;
const ignored=/^(?:停車駅(?:一覧)?|途中停車駅|列車(?:詳細|情報)?|時刻表|乗換(?:案内)?|発|着|出発|到着|地図|路線図|運行情報|乗車位置|降車位置|ホーム|乗車|降車|徒歩|普通|特急|急行|快速|指定席|自由席|グリーン車|運賃|料金|検索|共有|戻る|閉じる|詳細|経路|乗換なし|経由|ルート|駅名|時刻|着発時刻|時刻表を更新)$/;
const normalize=s=>String(s||'').normalize('NFKC').replace(/\r/g,'').replace(/(?<=[一-龠々ヶぁ-んァ-ヶー])[ \t]+(?=[一-龠々ヶぁ-んァ-ヶー])/g,'');
function tokens(line){const out=[];const re=/(?<!\d)([01]?\d|2[0-3])[:.時]([0-5]\d)分?(?!\d)/g;let m;while((m=re.exec(line))){const before=line.slice(Math.max(0,m.index-4),m.index),after=line.slice(re.lastIndex,re.lastIndex+3);const label=after.match(/^\s*(着|発)/)?.[1]||before.match(/(着|発)\s*$/)?.[1]||null;out.push({value:m[1].padStart(2,'0')+':'+m[2],label});}return out;}
function nameIn(line){
 const unread=line.match(/\[未読\d+\]/);if(unread)return unread[0];
 if(/OCR補正候補|OCR時刻候補|画像の経路/.test(line))return null;
 if(/→|⇒|➡|->/.test(line)||ignored.test(line))return null;
 trainRE.lastIndex=0;if(trainRE.test(line.replace(/\s/g,''))||root.SM.trainHeading?.(line))return null;
 if(/所要|運賃|料金|更新|情報なし|出発済|定刻|CO2|行$/.test(line))return null;
 const known=root.SM.stations.filter(n=>line.includes(n)).sort((a,b)=>b.length-a.length)[0];if(known)return known;
 if(/号車|番線|番ホーム|乗換\d|\d+円|\d+分/.test(line)&&!tokens(line).length)return null;
 let bare=line.replace(/\([^)]*\)/g,'').replace(/(?<!\d)([01]?\d|2[0-3])[:.時]([0-5]\d)分?(?!\d)/g,' ').replace(/(?:到着|出発|発車)|(?:^|\s)(?:発|着)(?=\s|$)/g,' ').replace(/(?:\d+番線|\d+番ホーム)/g,' ').replace(/^[\s●○・|│｜\d.)]+/,'').trim().replace(/^(?:発|着)\s+|\s+(?:発|着)$/g,'').trim().replace(/駅$/,'');
 bare=bare.replace(/\s+(?:停車|通過).*$/,'').trim();
 if(!bare||/^[ーぁ-ん]+$/.test(bare)||ignored.test(bare)||!/[一-龠々ヶぁ-んァ-ヶー]/.test(bare)||!/^[一-龠々ヶぁ-んァ-ヶーA-Za-z・]{2,20}$/.test(bare))return null;
 return bare;
}
function stop(name,list){let arr=null,dep=null;const unlabeled=[];for(const t of list){if(t.label==='着')arr=t.value;else if(t.label==='発')dep=t.value;else unlabeled.push(t.value);}
 if(!arr&&!dep){if(unlabeled.length>=2){arr=unlabeled[0];dep=unlabeled[1];}else dep=unlabeled[0]||null;}else {if(!arr&&dep&&unlabeled.length)arr=unlabeled[0];else if(!dep&&arr&&unlabeled.length)dep=unlabeled.at(-1);}
 return {name,arr,dep};}
function parseSingle(raw,year=new Date().getFullYear()){
 const text=normalize(raw),base=root.SM.parseOCR(text,year),fields={...base.fields},warnings=[];
 trainRE.lastIndex=0;const trains=[...new Set([...text.replace(/\s/g,'').matchAll(trainRE)].map(m=>/号$/.test(m[0])?m[0]:m[0]+'号'))];
 if(trains.length===1)fields.train=trains[0];
 const lines=text.split('\n').map(s=>s.trim()).filter(Boolean),items=lines.filter(line=>!/(?:20\d{2})[年/.-]|\d{1,2}月\d{1,2}日|(?<!\d)\d{1,2}\/\d{1,2}|→|⇒|➡|->/.test(line.replace(/\s/g,''))).map(line=>({line,name:nameIn(line),times:/更新/.test(line)?[]:tokens(line)}));
 // An alternating timetable beginning with a clock uses clock-before-station layout.
 const first=items.find(i=>i.name||i.times.length);const before=!!first&&!first.name&&!!first.times.length;
 let pending=[],current=null,stops=[];
 const commit=()=>{if(current){stops.push(stop(current.name,current.times));current=null;}};
 for(const item of items){
  if(item.name){commit();current={name:item.name,times:item.times.length?[...pending.filter(t=>t.label),...item.times]:before?pending:[]};pending=[];if(before||item.times.length)commit();}
  else if(item.times.length){if(!before&&current)current.times.push(...item.times);else pending.push(...item.times);}
 }
 commit();
 // Only unknown stand-alone headings with no clock were discarded, while known route rows keep missing times.
 stops=stops.filter(s=>s.arr||s.dep);
 const merged=[];for(const s of stops){const old=s.name&&!/^\[未読/.test(s.name)?merged.find(x=>x.name===s.name):null;if(old){old.arr=s.arr||old.arr;old.dep=s.dep||old.dep;}else merged.push(s);}
 stops=merged.length?merged:base.stops;
 const explicitRoute=lines.some(l=>/→|⇒|➡|->/.test(l)&&!(tokens(l).length>=2&&!root.SM.stations.some(n=>l.includes(n))));
 if(stops.length>=2){if(!explicitRoute&&!/乗車駅|出発駅/.test(text))fields.from=stops[0].name;if(!explicitRoute&&!/降車駅|到着駅/.test(text))fields.to=stops.at(-1).name;}
 if(!fields.date){const m=text.match(/(?<!\d)(\d{1,2})\/(\d{1,2})(?!\d)/);if(m){const value=`${year}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;if(Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value)fields.date=value;}}
 if(!/(?:20\d{2})\s*[年/.-]/.test(text)&&fields.date)warnings.push('年がない日付にはフォームの年を補いました。乗車日を確認してください。');
 if(trains.length>1)warnings.push('複数の列車が含まれています。乗る列車1本の停車駅一覧だけに絞って再解析してください。');
 if(!stops.length)warnings.push('停車駅・時刻を読み取れませんでした。停車駅一覧のテキストか画像を追加してください。');
 else if(stops.length<3)warnings.push('抽出できた駅は2駅以下です。途中駅が表示されている一覧も取り込んでください。');
 if(stops.some(s=>s.arr===null||s.dep===null))warnings.push('時刻が1つだけの駅は、着・発の表示がなければ出発時刻として扱います。必要に応じて修正してください。');
 if(/^\s*https?:\/\/\S+\s*$/.test(text))warnings.push('共有URLだけでは内容を取得しません。画面のテキストかスクリーンショットを取り込んでください。');
 return {fields,stops,warnings,trains,blocked:trains.length>1,source:'yahoo-import'};
}
// Segment a route at each train heading, sharing the transfer station with distinct arrival/departure clocks.
function parseJourney(raw,year=new Date().getFullYear()){
 const text=normalize(raw),lines=text.split('\n');const markers=[];
 lines.forEach((line,index)=>{trainRE.lastIndex=0;const match=[...line.replace(/\s/g,'').matchAll(trainRE)][0];const train=root.SM.trainHeading?.(line)|| (match?match[0].replace(/号$/,'')+'号':'');if(train&&markers.at(-1)?.train!==train)markers.push({index,train});});
 if(markers.length<2){const result=parseSingle(text,year);if(markers.length)result.fields.train=markers[0].train;return result;}
 const full=parseSingle(text,year),boundaries=markers.map((m,i)=>{
  const lower=i?markers[i-1].index+1:0;let row=-1;
  for(let j=m.index-1;j>=lower;j--){if(nameIn(lines[j])&&(!/月\d+日|→|⇒|->/.test(lines[j]))){row=j;break;}}
  // Require clocks near the boundary; headings alone never become a station.
  if(row>=0&&lines.slice(row+1,m.index).filter(l=>tokens(l).length&&!/更新/.test(l)).length>=2)row=-1;
  if(row>=0){let begin=row;while(begin>lower&&!nameIn(lines[begin-1])&&!/月\d+日|→|⇒|->/.test(lines[begin-1].replace(/\s/g,'')))begin--;const local=lines.slice(begin,m.index);const parsed=parseSingle(local.join('\n'),year);const name=nameIn(lines[row]);const found=parsed.stops.find(s=>s.name===name);return {row:begin,stop:found||{name,arr:null,dep:null},missing:!found};}
  const clocks=[];for(let j=m.index-1;j>=lower;j--){const tt=tokens(lines[j]);if(tt.length)clocks.unshift(...tt);if(clocks.length>=2)break;}
  return {row:m.index,stop:stop('',clocks.slice(-2)),missing:true};
 });
 const segments=markers.map((m,i)=>{
  const end=i+1<markers.length?boundaries[i+1].row:lines.length;
  const parsed=parseSingle(lines.slice(m.index,end).join('\n'),year);
  let stops=parsed.stops;
  const start=boundaries[i].stop;
  if(start.name||start.arr||start.dep){stops=stops.filter(s=>s.name!==start.name);stops.unshift({...start,dep:start.dep||(i===0?start.arr:null),arr:null});}
  if(i+1<markers.length){const last=boundaries[i+1].stop;stops=stops.filter(s=>!last.name||s.name!==last.name);stops.push({...last,dep:null,arr:last.arr||last.dep});}
  if(i===markers.length-1&&stops.length){const last=stops.at(-1);if(!last.arr){last.arr=last.dep;last.dep=null;}}
  const fields={...full.fields,train:m.train,from:stops[0]?.name||'',to:stops.at(-1)?.name||''};delete fields.car;delete fields.seat;
  const warnings=full.warnings.filter(w=>!w.includes('複数の列車')&&!w.includes('2駅以下'));
  if(stops.length<=2)warnings.push('途中駅が含まれていません。乗換案内の「○駅」を開いた画像で追加できます。');
  warnings.unshift('乗換経路から、この列車の区間だけを取り込みます。号車・座席は予約情報を確認して入力してください。');
  let previous=null;for(const s of stops){const minute=root.SM.mins(s.arr||s.dep);if(minute!==null&&previous!==null&&minute<previous&&!(previous>=18*60&&minute<6*60)){warnings.push('時刻が大きく逆戻りしています。OCRで数字が欠けていないか確認し、編集してください。');break;}if(minute!==null)previous=minute;}
  if(stops.some(s=>!s.arr&&!s.dep))warnings.push('時刻を読み取れない駅があります。反映後に時刻を入力してください。');
  if(stops.some(s=>!s.name))warnings.push('乗換駅の駅名を読み取れませんでした。反映後、空欄の駅名と乗降駅を画像で確認して入力してください。');
  return {fields,stops,warnings,trains:[m.train],blocked:false,source:'yahoo-import'};
 });
 return {...segments[0],segments};
}
function parseTransit(raw,year=new Date().getFullYear()){
 raw=root.SM.joinTrainLines?root.SM.joinTrainLines(raw):raw;
 const strict=/乗換|番線|画像の経路/.test(raw),unknown=new Map();let serial=0;
 const prepared=normalize(raw).split('\n').map(line=>{
  if(!strict||/OCR補正候補|OCR時刻候補|更新|月\s*\d+\s*日|→|⇒|->/.test(line))return line;
  trainRE.lastIndex=0;if(trainRE.test(line.replace(/\s/g,'')))return line;
  const tt=tokens(line);if(!tt.length)return line;
  if(root.SM.stations.some(n=>line.includes(n))||/\[未読\d+\]/.test(line))return line;
  const tail=line.replace(/(?<!\d)([01]?\d|2[0-3])[:.時]([0-5]\d)分?(?!\d)/g,'').replace(/[着発\s]/g,'');
  if(!tail)return line;
  if(/円|km|CO2|時間|分\)/.test(line))return line;
  const marker=`[未読${serial++}]`;unknown.set(marker,tail);return line.replace(tail,marker).includes(marker)?line.replace(tail,marker):tt.map(t=>t.value+(t.label||'')).join(' ')+' '+marker;
 }).join('\n');
 const result=parseJourney(prepared,year);const all=result.segments||[result];
 for(const r of all){for(const s of r.stops){if(/^\[未読\d+\]$/.test(s.name)){s.rawName=unknown.get(s.name)||'';s.name='';}}
  if(/^\[未読\d+\]$/.test(r.fields.from||''))r.fields.from='';if(/^\[未読\d+\]$/.test(r.fields.to||''))r.fields.to='';
  const count=r.stops.filter(s=>!s.name).length;if(count)r.warnings.push(`${count}駅の駅名を確認できません。時刻付きの空欄を残しました。画像を見て入力してください。`);
  const corrections=String(raw).split('\n').filter(l=>/^OCR(?:補正|時刻)候補/.test(l));r.warnings.push(...corrections);
 }
 return result.segments?{...all[0],segments:all}:result;
}
function planStops(old,incoming,mode='replace'){
 const next=mode==='replace'?incoming.map(s=>({...s})):old.map(s=>({...s}));
 if(mode==='merge'){for(let i=0;i<incoming.length;i++){const s=incoming[i],existing=s.name?next.find(x=>x.name===s.name):null;if(existing){if(s.arr)existing.arr=s.arr;if(s.dep)existing.dep=s.dep;}else{const following=incoming.slice(i+1).map(x=>x.name).find(n=>next.some(x=>x.name===n));const preceding=incoming.slice(0,i).reverse().map(x=>x.name).find(n=>next.some(x=>x.name===n));let pos=following?next.findIndex(x=>x.name===following):preceding?next.findIndex(x=>x.name===preceding)+1:next.length;
 if(!following&&preceding){const tl=root.SM.timeline({date:'2000-01-01',stops:next});let value=root.SM.mins(s.arr||s.dep);const anchor=tl[pos-1];if(value!==null&&anchor?.at!=null){const base=Date.parse('2000-01-01T00:00:00+09:00');let at=base+value*60000;while(at<anchor.at)at+=86400000;while(pos<tl.length&&tl[pos].at!==null&&tl[pos].at<=at)pos++;}}
 next.splice(pos,0,{...s});}}}
 const changes=[];for(const s of next){const before=old.find(x=>x.name===s.name);if(!before)changes.push({type:'追加',name:s.name,before:null,after:s});else if((before.arr||null)!==(s.arr||null)||(before.dep||null)!==(s.dep||null))changes.push({type:'時刻変更',name:s.name,before,after:s});else if(old.findIndex(x=>x.name===s.name)!==next.findIndex(x=>x.name===s.name))changes.push({type:'順序変更',name:s.name,before,after:s});}
 for(const s of old){if(!next.some(x=>x.name===s.name))changes.push({type:'削除',name:s.name,before:s,after:null});}
 return {stops:next,changes};
}
root.SM.parseTransit=parseTransit;root.SM.planStops=planStops;
if(typeof module!=='undefined')module.exports={parseTransit,planStops};
})(typeof window!=='undefined'?window:globalThis);
