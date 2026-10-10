// Load browser scripts that share one global scope into a node vm context.
const vm=require('vm'),fs=require('fs'),path=require('path');
module.exports=function load(...files){
  const ctx=vm.createContext({console,Math,Date});
  for(const f of files)vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),ctx,{filename:f});
  return code=>vm.runInContext(code,ctx);
};
