# Change Log

## 0.1.16

- Watch all R files in workspace ([#78](https://github.com/REditorSupport/vscode-r-lsp/pull/78))

## 0.1.15

- Prefer R Path from `PATH` ([#74](https://github.com/REditorSupport/vscode-r-lsp/pull/74))

## 0.1.14

- Update dependencies (using `vscode-languageclient` v7.0.0).

## 0.1.13

- Update dependencies (using `vscode-languageclient` v6.1.4).

## 0.1.12

- Use shared settings for R path ([#64](https://github.com/REditorSupport/vscode-r-lsp/pull/64))

## 0.1.11

- Support notebook cells ([#59](https://github.com/REditorSupport/vscode-r-lsp/pull/59))
- Closing all untitled documents will shutdown the shared language server.
- Fix a bug that prevents the extension from starting a new language server for untitled document.

## 0.1.10

- Fix multiple language server/clients created for a single workspace ([#53](https://github.com/REditorSupport/vscode-r-lsp/issues/53))

## 0.1.9

- Fix stdio mode under Linux and macOS ([#50](https://github.com/REditorSupport/vscode-r-lsp/pull/50))

## 0.1.8

- Fix settings synchronization to allow disabling diagnostics ([#47](https://github.com/REditorSupport/vscode-r-lsp/pull/47))

## 0.1.7

- Support multi-workspace ([#45](https://github.com/REditorSupport/vscode-r-lsp/pull/45), [#46](https://github.com/REditorSupport/vscode-r-lsp/pull/46)):
  - Untilted documents share a server started from home folder.
  - Each file outside workspaces uses a server started from parent folder.
  - Each workspace uses a server started from the workspace folder.
  - For `renv`-enabled project, user has to install `languageserver` into the project library,
    or otherwise `r.lsp.args = [ "--no-init-file" ]` should be used to skip the project profile.
  - User could reopen document to restart langauge server if stopped due to error.

## 0.1.6

- add a new setting `r.lsp.args` to support customized startup arguments (e.g. `--no-init-file`) of R language server ([#34](https://github.com/REditorSupport/vscode-r-lsp/issues/34))

## 0.1.5

- actually activate on r markdown

## 0.1.4

- activate on r markdown

## 0.1.3

- respect LANG var in STDIO connection

## 0.1.2

- suppor stdio connection

## 0.1.1

- allow specifying `LANG` environment variable

## 0.1.0

- follow conventional settings naming


## 0.0.7

add `r.rpath.lsp` to use other R.exe file

## 0.0.6

languageserver is now on CRAN
Get R path from Ikuyadeu.r

## 0.0.5

fix for working on windows

## 0.0.4

initial release
