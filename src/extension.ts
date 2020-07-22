import { spawn, ChildProcess } from 'child_process';
import { LanguageClient, LanguageClientOptions, StreamInfo } from 'vscode-languageclient';
import * as net from 'net';
import * as url from 'url';
import { getRPath } from './util'
import { ExtensionContext, workspace, Uri } from 'vscode';

export async function activate(context: ExtensionContext): Promise<void> {

    const config = workspace.getConfiguration('r');

    let client: LanguageClient;

    var debug = config.get("lsp.debug");
    var path = await getRPath(config);
    if (debug) {
        const str = `R binary: ${path}`;
        console.log(str);
    }
    var use_stdio = config.get("lsp.use_stdio");
    var env = Object.create(process.env);
    var lang = config.get("lsp.lang") as string;
    if (lang != "") {
        env.LANG = lang;
    } else if (env.LANG == undefined) {
        env.LANG = "en_US.UTF-8";
    }
    if (debug) {
        const str = `LANG: ${env.LANG}`;
        console.log(str);
    }

    const initArgs: string[] = config.get("lsp.args");
    initArgs.push("--quiet", "--slave");

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
            var args: string[];
            // The server is implemented in R
            if (debug) {
                args = initArgs.concat(["-e", `languageserver::run(port=${port},debug=TRUE)`]);
            } else {
                args = initArgs.concat(["-e", `languageserver::run(port=${port})`]);
            }
            const childProcess = spawn(path, args, { env: env });
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
            protocol2Code: str => Uri.parse(str)
        },
        synchronize: {
            // Synchronize the setting section 'r' to the server
            configurationSection: 'r.lsp',
            // Notify the server about changes to R files in the workspace
            fileEvents: workspace.createFileSystemWatcher('**/*.r')
        }
    };

    // Create the language client and start the client.
    if (use_stdio && process.platform != "win32") {
        var args: string[];
        if (debug) {
            args = initArgs.concat(["-e", `languageserver::run(debug=TRUE)`]);
        } else {
            args = initArgs.concat(["-e", `languageserver::run()`]);
        }
        client = new LanguageClient('R Language Server', { command: path, args: args, options: { env: env } }, clientOptions);
    } else {
        client = new LanguageClient('R Language Server', tcpServerOptions, clientOptions);
    }
    const disposable = client.start();

    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(disposable);
}
