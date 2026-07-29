@echo off
:: md.cmd — Windows wrapper for the Beledarians Markdown Editor CLI
:: Drop this directory into PATH, then use: md open notes.md
node "%~dp0md.mjs" %*
