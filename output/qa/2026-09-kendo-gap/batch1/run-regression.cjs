// Run unchanged browser regressions, redirecting only their artifact directory.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const name=process.argv[2];if(!['phase5-contacts-browser','bugfix-browser','phase2-browser'].includes(name))throw Error('Unknown regression');
const file=path.resolve(__dirname,'../../../standard-preview/tests',name+'.cjs');
const qa=path.resolve(__dirname,'regression',name);fs.mkdirSync(qa,{recursive:true});
let source=fs.readFileSync(file,'utf8');source=source.replace(/qa=path.resolve\([^;]+?\)/,'qa='+JSON.stringify(qa));
const mod=new Module(file,module);mod.filename=file;mod.paths=Module._nodeModulePaths(path.dirname(file));mod._compile(source,file);
