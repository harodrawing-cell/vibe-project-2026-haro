// Independent, read-only REST probe: no browser profile, SDK, ID token or service account.
const fs=require('node:fs');
const project='haro-web-project';
const base=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
async function get(path){
 const response=await fetch(`${base}/${path}?prettyPrint=false`,{headers:{'Cache-Control':'no-cache'},credentials:'omit',cache:'no-store'});
 const json=await response.json();
 return {response,json};
}
async function main(){
 const report={at:new Date().toISOString(),project,database:'(default)',authentication:'none',apiKeyUsed:false,serviceAccount:false,requests:[]};
 const list=await get('qnaList');
 report.publicListStatus=list.response.status;
 const privatePost=list.json.documents?.find(d=>d.fields?.isPublic?.booleanValue===false);
 if(!privatePost){report.privateCheck='not tested: no accessible private metadata';}
 else{
  const id=privatePost.name.split('/').pop();
  for(const collection of ['qnaDetails','qnaAnswers']){
   const {response,json}=await get(`${collection}/${encodeURIComponent(id)}`);
   report.requests.push({collection,httpStatus:response.status,errorStatus:json.error?.status||null,contentFieldPresent:Object.hasOwn(json.fields||{},'content'),contentCharacters:json.fields?.content?.stringValue?.length??null,isPublic:json.fields?.isPublic?.booleanValue??null,responseDate:response.headers.get('date'),cacheControl:response.headers.get('cache-control')});
  }
 }
 report.privateReadBlocked=report.requests.length===2&&report.requests.every(r=>r.httpStatus===403&&r.errorStatus==='PERMISSION_DENIED'&&!r.contentFieldPresent);
 fs.mkdirSync('test-results/security',{recursive:true});
 fs.writeFileSync('test-results/security/production-postpublish-rest.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
