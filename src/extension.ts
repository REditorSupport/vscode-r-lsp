import os = require('os');
import path = require('path');
import net = require('net');
import url = require('url');
import { spawn, ChildProcess } from 'child_process';
import { LanguageClient, LanguageClientOptions, StreamInfo, DocumentFilter } from 'vscode-languageclient';
import { ExtensionContext, workspace, Uri, TextDocument, WorkspaceConfiguration, OutputChannel, window, WorkspaceFolder } from 'vscode';
import { getRPath } from './util'

let defaultClient: LanguageClient;
let externalDocuments: Set<string> = new Set();
let clients: Map<string, LanguageClient> = new Map();

async function createClient(config: WorkspaceConfiguration, selector: DocumentFilter[],
    cwd: string, workspaceFolder: WorkspaceFolder, outputChannel: OutputChannel): Promise<LanguageClient> {
    let client: LanguageClient;

    const debug = config.get<boolean>("lsp.debug");
    const path = await getRPath(config);
    if (debug) {
        console.log(`R binary: ${path}`);
    }
    const use_stdio = config.get<boolean>("lsp.use_stdio");
    const env = Object.create(process.env);
    const lang = config.get<string>("lsp.lang");
    if (lang !== '') {
        env.LANG = lang;
    } else if (env.LANG == undefined) {
        env.LANG = "en_US.UTF-8";
    }
    if (debug) {
        console.log(`LANG: ${env.LANG}`);
    }

    const options = { cwd: cwd, env: env };
    const initArgs: string[] = config.get<string[]>("lsp.args").concat("--quiet", "--slave");

    const tcpServerOptions = () => new Promise<ChildProcess | StreamInfo>((resolve, reject) => {
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
            let args: string[];
            // The server is implemented in R
            if (debug) {
                args = initArgs.concat(["-e", `languageserver::run(port=${port},debug=TRUE)`]);
            } else {
                args = initArgs.concat(["-e", `languageserver::run(port=${port})`]);
            }
            const childProcess = spawn(path, args, options);
            client.outputChannel.appendLine(`R Language Server (${childProcess.pid}) started`);
            childProcess.stderr.on('data', (chunk: Buffer) => {
                const str = chunk.toString();
                console.log(`R Language Server (${childProcess.pid}): ${str}`);
                client.outputChannel.appendLine(str);
            });
            childProcess.on('exit', (code, signal) => {
                client.outputChannel.appendLine(`R Language Server (${childProcess.pid}) exited ` +
                    (signal ? `from signal ${signal}` : `with exit code ${code}`));
                if (code !== 0) {
                    client.outputChannel.show();
                }
                client.stop();
            });
            return childProcess;
        });
    });

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        // Register the server for selected R documents
        documentSelector: selector,
        uriConverters: {
            // VS Code by default %-encodes even the colon after the drive letter
            // NodeJS handles it much better
            code2Protocol: uri => url.format(url.parse(uri.toString(true))),
            protocol2Code: str => Uri.parse(str)
        },
        workspaceFolder: workspaceFolder,
        outputChannel: outputChannel,
        synchronize: {
            // Synchronize the setting section 'r' to the server
            configurationSection: 'r.lsp',
        },
    };

    // Create the language client and start the client.
    if (use_stdio && process.platform != "win32") {
        let args: string[];
        if (debug) {
            args = initArgs.concat(["-e", `languageserver::run(debug=TRUE)`]);
        } else {
            args = initArgs.concat(["-e", `languageserver::run()`]);
        }
        client = new LanguageClient('R Language Server', { command: path, args: args, options: options }, clientOptions);
    } else {
        client = new LanguageClient('R Language Server', tcpServerOptions, clientOptions);
    }
    return client;
}

function checkClient(name: string): boolean {
    let client = clients.get(name);
    return client && client.needsStop();
}

export function activate(context: ExtensionContext) {

    const config = workspace.getConfiguration('r');
    const outputChannel: OutputChannel = window.createOutputChannel('R Language Server');

    async function didOpenTextDocument(document: TextDocument) {
        if (document.uri.scheme !== 'file' && document.uri.scheme !== 'untitled') {
            return;
        }

        if (document.languageId !== 'r' && document.languageId !== 'rmd') {
            return;
        }

        const folder = workspace.getWorkspaceFolder(document.uri);
        if (!folder) {
            
            if (!defaultClient || defaultClient.needsStart()) {
                const documentSelector: DocumentFilter[] = [
                    { scheme: 'untitled', language: 'r' },
                    { scheme: 'untitled', language: 'rmd' },
                    { scheme: 'file', language: 'r' },
                    { scheme: 'file', language: 'rmd' },
                ];
                defaultClient = await createClient(config, documentSelector, os.homedir(), undefined, outputChannel);
                defaultClient.start();
            }

            if (document.uri.scheme === 'file') {
                externalDocuments.add(document.uri.fsPath);
            }

            return;
        }

        // Each workspace uses a server started from the workspace folder
        if (!checkClient(folder.uri.toString())) {
            const pattern = `${folder.uri.fsPath}/**/*`;
            const documentSelector: DocumentFilter[] = [
                { scheme: 'file', language: 'r', pattern: pattern },
                { scheme: 'file', language: 'rmd', pattern: pattern },
            ];
            let client = await createClient(config, documentSelector, folder.uri.fsPath, folder, outputChannel);
            client.start();
            clients.set(folder.uri.toString(), client);
        }
    }

    async function didCloseTextDocument(document: TextDocument) {
        if (document.uri.scheme === 'file') {
            externalDocuments.delete(document.uri.fsPath);
        }
    }

    workspace.onDidOpenTextDocument(didOpenTextDocument);
    workspace.onDidCloseTextDocument(didCloseTextDocument);
    workspace.textDocuments.forEach(didOpenTextDocument);
    workspace.onDidChangeWorkspaceFolders((event) => {
        for (let folder of event.removed) {
            let client = clients.get(folder.uri.toString());
            if (client) {
                clients.delete(folder.uri.toString());
                client.stop()
            }
        }
    });
}

export function deactivate(): Thenable<void> {
    let promises: Thenable<void>[] = [];
    if (defaultClient) {
        promises.push(defaultClient.stop());
    }
    for (let client of clients.values()) {
        promises.push(client.stop());
    }
    return Promise.all(promises).then(() => undefined);
}
