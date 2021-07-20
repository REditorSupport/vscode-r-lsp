# R LSP Client

**⚠️ This extension has been integrated into [vscode-R](https://github.com/REditorSupport/vscode-R)
and will be unpublished in the VS Code marketplace at some point. Before installing the new version of vscode-R with language service support, please uninstall this extension to avoid conflict.**

R LSP Client for [VS Code](https://code.visualstudio.com/), powered by the [R Language Server](https://github.com/REditorSupport/languageserver).

This package exposes the following configuration options:

- `r.rpath.windows`, `r.rpath.mac`, `r.rpath.linux`: Path to R binary for launching the R Language Server package (see below). Examples: `/usr/bin/R` (Linux/macOS), `C:\\Program Files\\R\\R-3.5.2\\bin\\x64\\R.exe` (Windows). If the settings are left blank (default), then the R path will be detected from Windows registry and `PATH` environment variable. It should be *vanilla* R rather than radian console.
- `r.lsp.args`: The command line arguments to use when launching R Language Server. Example: `--vanilla` to disable loading startup scripts such as `.Rprofile` and `Rprofile.site`.
- `r.lsp.debug`: Enable debugging traces. Defaults to `false`. Set this to `true` if you are having trouble getting the Language Server working.
- `r.lsp.diagnostics`: Enable linting of R code, using the lintr package. Defaults to `true`. To disable this, you must have at least version 0.2.7 of the R Language Server installed.

Note that `r.lsp.path` will be deprecated in favor of `r.rpath.*` settings.

## Requirements

`vscode-r-lsp` requires the [R Language Server](https://github.com/REditorSupport/languageserver), a package that runs in R.
It can be installed from CRAN:

```r
install.packages("languageserver")
```

The development version of languageserver can be installed from GitHub, using the devtools package:

```r
devtools::install_github("REditorSupport/languageserver")
```

## License

MIT License.  See [the license](LICENSE) for more details.
