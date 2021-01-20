import os = require('os');
import path = require('path');
import net = require('net');
import url = require('url');
import { spawn, ChildProcess } from 'child_process';
import { LanguageClient, LanguageClientOptions, StreamInfo, DocumentFilter, ErrorAction, CloseAction, RevealOutputChannelOn } from 'vscode-languageclient/node';
import { ExtensionContext, workspace, Uri, TextDocument, WorkspaceConfiguration, OutputChannel, window, WorkspaceFolder } from 'vscode';
import { getRPath } from './util'

let clients: Map<string, LanguageClient> = new Map();
let initSet: Set<string> = new Set();

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
            socket.on('error', (e) => {
                console.log(`R process error: ${e}`);
                reject(e);
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
                client.outputChannel.appendLine(chunk.toString());
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
            code2Protocol: uri => new url.URL(uri.toString(true)).toString(),
            protocol2Code: str => Uri.parse(str)
        },
        workspaceFolder: workspaceFolder,
        outputChannel: outputChannel,
        synchronize: {
            // Synchronize the setting section 'r' to the server
            configurationSection: 'r.lsp',
        },
        revealOutputChannelOn: RevealOutputChannelOn.Never,
        errorHandler: {
            error: () => ErrorAction.Shutdown,
            closed: () => CloseAction.DoNotRestart,
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
        client = new LanguageClient('r', 'R Language Server', { command: path, args: args, options: options }, clientOptions);
    } else {
        client = new LanguageClient('r', 'R Language Server', tcpServerOptions, clientOptions);
    }
    return client;
}

function checkClient(name: string): boolean {
    if (initSet.has(name)) return true;
    initSet.add(name);
    let client = clients.get(name);
    return client && client.needsStop();
}

function getKey(uri: Uri) {
    switch (uri.scheme) {
        case 'untitled':
            return uri.scheme;
        case 'vscode-notebook-cell':
            return `vscode-notebook:${uri.fsPath}`;
        default:
            return uri.toString(true);
    }
}

export function activate(context: ExtensionContext) {

    const config = workspace.getConfiguration('r');
    const outputChannel: OutputChannel = window.createOutputChannel('R Language Server');

    async function didOpenTextDocument(document: TextDocument) {
        if (document.uri.scheme !== 'file' && document.uri.scheme !== 'untitled' && document.uri.scheme !== 'vscode-notebook-cell') {
            return;
        }

        if (document.languageId !== 'r' && document.languageId !== 'rmd') {
            return;
        }

        const folder = workspace.getWorkspaceFolder(document.uri);
        
        // Each notebook uses a server started from parent folder
        if (document.uri.scheme === 'vscode-notebook-cell') {
            const key = getKey(document.uri);
            if (!checkClient(key)) {
                console.log(`Start language server for ${document.uri.toString(true)}`);
                const documentSelector: DocumentFilter[] = [
                    { scheme: 'vscode-notebook-cell', language: 'r', pattern: `${document.uri.fsPath}` },
                ];
                let client = await createClient(config, documentSelector,
                    path.dirname(document.uri.fsPath), folder, outputChannel);
                client.start();
                clients.set(key, client);
                initSet.delete(key);
            }
            return;
        }

        if (folder) {

            // Each workspace uses a server started from the workspace folder
            const key = getKey(folder.uri);
            if (!checkClient(key)) {
                console.log(`Start language server for ${document.uri.toString(true)}`);
                const pattern = `${folder.uri.fsPath}/**/*`;
                const documentSelector: DocumentFilter[] = [
                    { scheme: 'file', language: 'r', pattern: pattern },
                    { scheme: 'file', language: 'rmd', pattern: pattern },
                ];
                let client = await createClient(config, documentSelector, folder.uri.fsPath, folder, outputChannel);
                client.start();
                clients.set(key, client);
                initSet.delete(key);
            }

        } else {

            // All untitled documents share a server started from home folder
            if (document.uri.scheme === 'untitled') {
                const key = getKey(document.uri);
                if (!checkClient(key)) {
                    console.log(`Start language server for ${document.uri.toString(true)}`);
                    const documentSelector: DocumentFilter[] = [
                        { scheme: 'untitled', language: 'r' },
                        { scheme: 'untitled', language: 'rmd' },
                    ];
                    let client = await createClient(config, documentSelector, os.homedir(), undefined, outputChannel);
                    client.start();
                    clients.set(key, client);
                    initSet.delete(key);
                }
                return;
            }

            // Each file outside workspace uses a server started from parent folder
            if (document.uri.scheme === 'file') {
                const key = getKey(document.uri);
                if (!checkClient(key)) {
                    console.log(`Start language server for ${document.uri.toString(true)}`);
                    const documentSelector: DocumentFilter[] = [
                        { scheme: 'file', pattern: document.uri.fsPath },
                    ];
                    let client = await createClient(config, documentSelector,
                        path.dirname(document.uri.fsPath), undefined, outputChannel);
                    client.start();
                    clients.set(key, client);
                    initSet.delete(key);
                }
                return;
            }
        }
    }

    async function didCloseTextDocument(document: TextDocument) {
        if (document.uri.scheme === 'untitled') {
            const result = workspace.textDocuments.find((doc) => doc.uri.scheme === 'untitled');
            if (result) {
                // Stop the language server when all untitled documents are closed.
                return;
            }
        }

        if (document.uri.scheme === 'vscode-notebook-cell') {
            const result = workspace.textDocuments.find((doc) =>
                doc.uri.scheme === document.uri.scheme && doc.uri.fsPath === document.uri.fsPath);
            if (result) {
                // Stop the language server when all cell documents are closed (notebook closed).
                return;
            }
        }

        // Stop the language server when single file outside workspace is closed, or the above cases.
        const key = getKey(document.uri);
        let client = clients.get(key);
        if (client) {
            clients.delete(key);
            initSet.delete(key);
            client.stop();
        }
    }

    workspace.onDidOpenTextDocument(didOpenTextDocument);
    workspace.onDidCloseTextDocument(didCloseTextDocument);
    workspace.textDocuments.forEach(didOpenTextDocument);
    workspace.onDidChangeWorkspaceFolders((event) => {
        for (let folder of event.removed) {
            const key = getKey(folder.uri);
            let client = clients.get(key);
            if (client) {
                clients.delete(key);
                initSet.delete(key);
                client.stop()
            }
        }
    });
}

export function deactivate(): Thenable<void> {
    let promises: Thenable<void>[] = [];
    for (let client of clients.values()) {
        promises.push(client.stop());
    }
    return Promise.all(promises).then(() => undefined);
}
