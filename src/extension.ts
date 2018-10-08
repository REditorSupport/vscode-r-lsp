"use strict";

import cp = require("child_process");
import { AddressInfo, createServer, Socket } from "net";
import { ExtensionContext, window, workspace } from "vscode";
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from "vscode-languageclient";

let client: LanguageClient;

export function activate(context: ExtensionContext) {
    // The server is implemented in node
    // let serverModule = context.asAbsolutePath(path.join('R'));
    // The debug options for the server
    const serverOptions: ServerOptions = function foo() {
        return new Promise((resolve, reject) => {
            let childProcess;
            const server = createServer((socket) => {
                // When the language server connects, grab socket, stop listening and resolve
                // this.socket = socket
                server.close();
                resolve({ reader: socket, writer: socket });
            });

            server.listen(0, "127.0.0.1", () => {
                const port = (server.address() as AddressInfo).port;
                const runArgs = ["--quiet", "--slave", "-e", `languageserver::run(port=${port})`];
                // const debugArgs = ["--quiet", "--slave", "-e", `languageserver::run(debug=TRUE, port=${port})`];
                            // Once we have a port assigned spawn the Language Server with the port
                childProcess = cp.spawn(getRpath(), runArgs);
                childProcess.stderr.on("data", (chunk: Buffer) => {
                    // tslint:disable-next-line:no-console
                    console.error(chunk + "");
                    // window.showErrorMessage(chunk + "");
                });
                childProcess.stdout.on("data", (chunk: Buffer) => {
                    // tslint:disable-next-line:no-console
                    console.error(chunk + "");
                });
                return childProcess;
            });
        });
    };

    const clientOptions: LanguageClientOptions = {
        // Register the server for plain text documents
        documentSelector: [{scheme: "file", language: "r"}, {scheme: "file", language: "rmd"}],
        synchronize: {
            // Notify the server about file changes to '.clientrc files contain in the workspace
            fileEvents: workspace.createFileSystemWatcher("**/*.r"),
        },
    };

    // Create the language client and start the client.
    client = new LanguageClient(
        "rlangsvr",
        "Language Server R",
        serverOptions,
        clientOptions);

    // Start the client. This will also launch the server
    client.start();
}

export let config = workspace.getConfiguration("r");

export function getRpath() {
    const path = config.get("rpath.lsp") as string;
    if (path !== "") {
        return path;
    }

    if (process.platform === "win32") {
        return config.get("rterm.windows") as string;
    } else if (process.platform === "darwin") {
        return config.get("rterm.mac") as string;
    } else if ( process.platform === "linux") {
        return config.get("rterm.linux") as string;
    } else {
        window.showErrorMessage(process.platform + " can't use R");
        return "";
    }
}
export function deactivate(): Thenable<void> {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
