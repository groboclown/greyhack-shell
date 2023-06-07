# greyscript

Grey Hack Scripts.


## Provided Tools

### Import Files into the Game

The tool includes two primary scripts:

* [bin/gs_tar.py](bin/gs_tar.py) Bundles files, folders, and install instructions in one file.  Used to import your local files into the Grey Hack game.  Requires Python 3.6 or higher.
* [programs/gs-tar/extract.gs](programs/gs-tar/extract.gs) Extracts files bundled by `gs_tar.py` into local folders.

These two are used to extract files stored on your local disk (and this repository) into the game.  See the [Getting Started](#getting-started) section for details on using these.


### `gscc` - GreyScript Compiler

Once you get started, you'll probably want to add the `bundles/binutils.bundle.json` bundle into the game.  This gives you the `gscc` tool, which is an extended build tool.

It works around limitations in the game's filenames, and allows for relative `import_code` file locations by allowing for lines like:

```miniscript
//#require my/filename.gs
```

The tool will replace those lines with references to the actual file.


### Active Monitoring

The [monitor](src/programs/monitor) tool uses the [context](#library-context) to invoke "widgets" that populate a context page with information.


### Advanced Shell

The [mc](src/programs/mc) tool is an advanced shell that allows running command-lets and widgets with the [context](#library-context) to give an easier terminal experience.


## Game File Layout

This repository expects the files in the game to be laid out just like the repository.


## Getting Started

To get started,

1. In the game, launch the in-game `Code Editor`.
2. From your local computer editor, copy the contents of [programs/gs-tar/extract.gs](programs/gs-tar/extract.gs) into your computer's clipboard ("ctrl-c" usually works).
3. In the game's `Code Editor`, paste ("ctrl-v") the contents into the editor.
4. Save the file to `~/src/programs/gstar/extract.gs`.
5. Close the `Code Editor`.  With luck, that will be the last time you interact with it.
6. Start a terminal.

```bash
mkdir bin
build src/programs/extract/extract.gs bin
```

This allows you to run the `bin/extract` program against a compiled bundle.

To compile a bundle, you should create one similar to the [bundles/](bundles/README.md) directory.  Run the Python script [`bin/gs_tar.py`](bin/gs_tar.py) to convert the bundle file and the referenced files into a bundle.  Generally, it's easiest to run:

```bash
python bin/gs_tar.py bundles/monitor.bundle.json > local-tar.txt
```

You'll then want to copy the output of the `gs_tar.py` file into your clipboard, and paste it into a "Notepad.exe" file in the Grey Hack game.

From there, you can run "bin/extract (filename)" to run the extract bundle.

## Coding Standard

In general, a Go coding standard is used for comments and naming.

### Classes

Classes use functions named "New*" to create new instances, and "init" as initializers.  For an example, see the [extract.gs](programs/extract.gs) program.

If a class provides a string representation, it should do so in the ".Text" value or function.

### Errors

Functions that can generate an error return a list: [error, result].  The "error" is `null` if there is no error, otherwise it's something that should be displayable to the end user.


### Library: Context

(Still needs to be documented.  The rough sketch of the library and its use is in the monitor program.)
