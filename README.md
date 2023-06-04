# greyscript

Grey Hack Scripts.


## Usage

The tool includes two primary scripts:

* [bin/gs_tar.py](bin/gs_tar.py) Bundles files, folders, and install instructions in one file.  Used to import your local files into the Grey Hack game.  Requires Python 3.6 or higher.
* [programs/extract/extract.gs](programs/extract.gs) Extracts files bundled by `gs_tar.py` into local folders.

These two are used to extract files stored on your local disk (and this repository) into the game.


## Game File Layout

This repository expects the files in the game to be laid out just like the repository.


## Getting Started

To get started,

1. In the game, launch the in-game `Code Editor`.
2. From your local computer editor, copy the contents of [programs/extract/extract.gs](programs/extract.gs) into your computer's clipboard ("ctr-c" usually works).
3. In the game's `Code Editor`, paste ("ctr-v") the contents into the editor.
4. Save the file to `~/src/programs/extract/extract.gs`.
5. Close the `Code Editor`.  With luck, that will be the last time you interact with it.
6. Start a terminal.

```bash
mkdir bin
build src/programs/extract/extract.gs bin
```

From there, you can run "bin/extract" and it will prompt you to enter

## Coding Standard

In general, a Go coding standard is used for comments and naming.

### Classes

Classes use functions named "New*" to create new instances, and "init" as initializers.  For an example, see the [extract.gs](programs/extract.gs) program.

### Errors

Functions that can generate an error return a list: [error, result].  The "error" is `null` if there is no error, otherwise it's something that should be displayable to the end user.
