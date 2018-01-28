'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
function activate(context) {
    // The server is implemented in node
    // let serverModule = context.asAbsolutePath(path.join('R'));
    // The debug options for the server
    let runArgs;
    let debugArgs = ["--quiet", "--slave", "-e", "languageserver::run(debug=T)"];
    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    let serverOptions = {
        run: { command: "R", args: runArgs },
        debug: { command: "R", args: debugArgs }
    };
    // Options to control the language client
    let clientOptions = {
        // Register the server for plain text documents
        documentSelector: [{ scheme: 'file', language: 'r' }],
        synchronize: {
            // Synchronize the setting section 'lspSample' to the server
            configurationSection: 'rlangsvr',
            // Notify the server about file changes to '.clientrc files contain in the workspace
            fileEvents: vscode_1.workspace.createFileSystemWatcher('**/*.r')
        }
    };
    // Create the language client and start the client.
    let languageClient = new vscode_languageclient_1.LanguageClient('rlangsvr', 'Language Server R', serverOptions, clientOptions);
    let disposable = languageClient.start();
    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(disposable);
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map