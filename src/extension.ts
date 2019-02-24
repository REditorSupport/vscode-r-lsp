import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, StreamInfo } from 'vscode-languageclient';
import * as net from 'net';
import * as url from 'url';
import { existsSync } from 'fs';
import * as winreg from "winreg";

async function getRPath(config: vscode.WorkspaceConfiguration) {
    var path = config.get("lsp.path") as string;
    if (path && existsSync(path)) {
        return path;
    }

    if (process.platform === "win32") {
        try{
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

export async function activate(context: vscode.ExtensionContext): Promise<void> {

    const config = vscode.workspace.getConfiguration('r');

    let client: LanguageClient;

    var path = await getRPath(config);
    var debug = config.get("lsp.debug");

    const serverOptions = () => new Promise<ChildProcess | StreamInfo>((resolve, reject) => {
        // Use a TCP socket because of problems with blocking STDIO
        const server = net.createServer(socket => {
            // 'connection' listener
            console.log('R process connected');
            socket.on('end', () => {
                console.log('R process disconnected');
            });
            server.close();
            resolve({ reader: socket, writer: socket });
        });
        // Listen on random port
        server.listen(0, '127.0.0.1', () => {
            const port = (server.address() as net.AddressInfo).port;
            // The server is implemented in R
            var Args: string[];
            if (debug) {
                Args = ["--quiet", "--slave", "-e", `languageserver::run(port=${port},debug=TRUE)`]
            } else {
                Args = ["--quiet", "--slave", "-e", `languageserver::run(port=${port})`]
            }

            if (debug) {
                const str = `R binary: ${path}`;
                console.log(str);
                client.outputChannel.appendLine(str);
            }

            const childProcess = spawn(path, Args);
            childProcess.stderr.on('data', (chunk: Buffer) => {
                const str = chunk.toString();
                console.log('R Language Server:', str);
                client.outputChannel.appendLine(str);
            });
            childProcess.on('exit', (code, signal) => {
                client.outputChannel.appendLine(`Language server exited ` + (signal ? `from signal ${signal}` : `with exit code ${code}`));
                if (code !== 0) {
                    client.outputChannel.show();
                }
            });
            return childProcess;
        });
    });

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        // Register the server for php documents
        documentSelector: [
            { scheme: 'file', language: 'r' },
            { scheme: 'file', language: 'rmd' },
            { scheme: 'untitled', language: 'r' },
            { scheme: 'untitled', language: 'rmd' }
        ],
        uriConverters: {
            // VS Code by default %-encodes even the colon after the drive letter
            // NodeJS handles it much better
            code2Protocol: uri => url.format(url.parse(uri.toString(true))),
            protocol2Code: str => vscode.Uri.parse(str)
        },
        synchronize: {
            // Synchronize the setting section 'r' to the server
            configurationSection: 'r.lsp',
            // Notify the server about changes to R files in the workspace
            fileEvents: vscode.workspace.createFileSystemWatcher('**/*.r')
        }
    };

    // Create the language client and start the client.
    client = new LanguageClient('R Language Server', serverOptions, clientOptions);
    const disposable = client.start();

    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(disposable);
}
