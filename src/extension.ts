'use strict';

import * as path from 'path';

import { workspace, ExtensionContext } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient';

export function activate(context: ExtensionContext) {
	// The server is implemented in node
	// let serverModule = context.asAbsolutePath(path.join('R'));
	// The debug options for the server
	let runArgs: ["--quiet", "--slave", "-e", "languageserver::run(debug=T)"];	
	let debugArgs = ["--quiet", "--slave", "-e", "languageserver::run(debug=T)"];

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	let serverOptions: ServerOptions = {
		run : { command: "R", args: runArgs },
		debug: { command: "R", args: debugArgs }
	}

	// Options to control the language client
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
