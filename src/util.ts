import * as winreg from "winreg";
import { WorkspaceConfiguration } from 'vscode';
import { existsSync } from "fs";

export async function getRPath(config: WorkspaceConfiguration) {
  var path = config.get("lsp.path") as string;
  if (path && existsSync(path)) {
    return path;
  }

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
      path = ""
    }
    if (path && existsSync(path)) {
      return path;
    }
  }

  return "R";
}
