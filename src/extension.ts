'use strict';

import * as path from 'path';

import { workspace, ExtensionContext, window } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient';
import { Socket, createServer } from 'net';
const cp = require("child_process");

export function activate(context: ExtensionContext) {
	// The server is implemented in node
	// let serverModule = context.asAbsolutePath(path.join('R'));
	// The debug options for the server
	const serverOptions: ServerOptions = function () {
		return new Promise((resolve, reject) => {
			let childProcess
			const server = createServer(socket => {
				// When the language server connects, grab socket, stop listening and resolve
				// this.socket = socket
				server.close()
				resolve({ reader: socket, writer: socket })
			})

			server.listen(0, '127.0.0.1', () => {
				let port = server.address().port
				let runArgs = ["--quiet", "--slave", "-e", `languageserver::run(port=${port})`];
				let debugArgs = ["--quiet", "--slave", "-e", `languageserver::run(debug=TRUE, port=${port})`];
				// Once we have a port assigned spawn the Language Server with the port
				childProcess = cp.spawn(getRpath(), runArgs)
				childProcess.stderr.on('data', (chunk: Buffer) => {
					console.error(chunk + '');
				});
				childProcess.stdout.on('data', (chunk: Buffer) => {
					console.log(chunk + '');
				});
				return childProcess
			})
		})
	}

	let clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [{scheme: 'file', language: 'r'}],
		synchronize: {
			// Synchronize the setting section 'lspSample' to the server
			configurationSection: 'rlangsvr',
			// Notify the server about file changes to '.clientrc files contain in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/*.r')
		}
	}

	// Create the language client and start the client.
	let languageClient = new LanguageClient('rlangsvr', 'Language Server R', serverOptions, clientOptions);
	let disposable = languageClient.start();

	// Push the disposable to the context's subscriptions so that the
	// client can be deactivated on extension deactivation
	context.subscriptions.push(disposable);
}

export let config = workspace.getConfiguration("r");

export function getRpath() {
	let path = config.get("rpath.lsp") as string;
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