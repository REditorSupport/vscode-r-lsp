import * as winreg from "winreg";
import { WorkspaceConfiguration } from 'vscode';
import { existsSync } from "fs";

export async function getRPath(config: WorkspaceConfiguration) {

  // use "old" setting to get path:
  let path = config.get<string>("lsp.path");
  
  // use "new" setting to get path:
  if(!path){
    const configEntry = (
      process.platform === 'win32' ? 'rpath.windows' :
      process.platform === 'darwin' ? 'rpath.mac' :
      'rpath.linux'
    );
    path = config.get<string>(configEntry);
  }
  
  if (path && existsSync(path)) {
    return path;
  }

  // get path from system if neither setting works:
  if (process.platform === "win32") {
    try {
      const key = new winreg({
        hive: winreg.HKLM,
        key: '\\Software\\R-Core\\R'
      });
      const item: winreg.RegistryItem = await new Promise((c, e) =>
        key.get('InstallPath', (err, result) => err ? e(err) : c(result)));

      const rhome = item.value;
      console.log("found R in registry:", rhome)

      path = rhome + "\\bin\\R.exe";
    } catch (e) {
      path = '';
    }
    if (path && existsSync(path)) {
      return path;
    }
  }

  return "R";
}
