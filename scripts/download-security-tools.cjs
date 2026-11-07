const fs=require('node:fs');
const path=require('node:path');
const {Readable}=require('node:stream');
const {pipeline}=require('node:stream/promises');
async function main(){
 const dir=path.join(require('node:os').tmpdir(),'haro-security-tools-20261108');fs.mkdirSync(dir,{recursive:true});
 const response=await fetch('https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse');
 if(!response.ok)throw Error(`Java download HTTP ${response.status}`);
 await pipeline(Readable.fromWeb(response.body),fs.createWriteStream(path.join(dir,'jre21.zip')));
 console.log('Downloaded Java runtime to temporary QA tools directory');
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
