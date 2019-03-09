# R LSP Client

R LSP Client for [VS Code](https://code.visualstudio.com/), powered by the [R Language Server](https://github.com/REditorSupport/languageserver).

This package exposes the following configuration options:

- `r.lsp.path`: Path to R binary for launching the R Language Server package (see below). Examples: `/usr/bin/R` (Linux), `C:\\Program Files\\R\\R-3.5.2\\bin\\x64\\R.exe` (Windows).
- `r.lsp.debug`: Enable debugging traces. Defaults to `false`. Set this to `true` if you are having trouble getting the Language Server working.
- `r.lsp.diagnostics`: Enable linting of R code, using the lintr package. Defaults to `true`. To disable this, you must have at least version 0.2.7 of the R Language Server installed.

## Requirements

`vscode-r-lsp` requires the [R Language Server](https://github.com/REditorSupport/languageserver), which is a package that runs in R.
It can be easily installed from CRAN:

```r
install.packages("languageserver")
```

The development version of languageserver can be installed from GitHub, using the devtools package:

```r
devtools::install_github("REditorSupport/languageserver")
```

## License

MIT License.  See [the license](LICENSE) for more details.
