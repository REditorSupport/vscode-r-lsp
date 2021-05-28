import * as winreg from "winreg";
import { WorkspaceConfiguration } from 'vscode';
import { existsSync } from "fs";
import * as path from 'path';

function getRfromEnvPath(platform: string) {
  let splitChar = ':';
  let fileExtension = '';
  
  if (platform === 'win32') {
    splitChar = ';';
    fileExtension = '.exe';
  }
  
  const os_paths: string[]|string = process.env.PATH.split(splitChar);
  for (const os_path of os_paths) {
    const os_r_path: string = path.join(os_path, 'R' + fileExtension);
    if (existsSync(os_r_path)) {
      return os_r_path;
    }
  }
  return '';
}

export async function getRpathFromSystem(): Promise<string> {
  
  let rpath = '';
  const platform: string = process.platform;
  
  rpath = getRfromEnvPath(platform);

  if ( !rpath && platform === 'win32') {
    // Find path from registry
    try {
      const key = new winreg({
        hive: winreg.HKLM,
        key: '\\Software\\R-Core\\R',
      });
      const item: winreg.RegistryItem = await new Promise((c, e) =>
        key.get('InstallPath', (err, result) => err === null ? c(result) : e(err)));
      rpath = path.join(item.value, 'bin', 'R.exe');
    } catch (e) {
      rpath = '';
    }
  }

  return rpath;
}

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
  path = await getRpathFromSystem();
  if (path && existsSync(path)) {
    return path;
  }

  return "R";
}
