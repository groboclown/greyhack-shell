// Copy a file to another

import_code("../libs/context/get.gs")
import_code("../libs/context/session.gs")
import_code("../libs/context/logs.gs")
import_code("../libs/context/pages-create.gs")
import_code("../libs/context/pages-read.gs")
import_code("../libs/context/pages-send.gs")
import_code("../libs/context/cli-helper.gs")
import_code("../libs/format/formatted-str.gs")
import_code("../libs/errors.gs")
import_code("../libs/files/paths.gs")
import_code("../libs/files/star-glob.gs")
import_code("../libs/files/expand-args.gs")

Cp = {}

Cp.usage = {
    "cmd": "cp",
    "summary": "Copies files to a target location within the same computer",
    "requiresArg": true,
    "args": [
        {
            "name": "R",
            "desc": "If copying a directory, then it copies all contents of the directory.",
        },
        {
            "name": "f",
            "desc": "If the destination file cannot be written to, attempts to remove the file first.",
        },
        {
            "name": "p",
            "desc": "Preserve the attributes as best as possible (permissions, user, ownership)",
        },
        {
            "name": "n",
            "desc": "Do not overwrite existing files; only add new files",
        },
        {
            "name": "u",
            "desc": "Only overwrite existing files; do not add new files",
        },
        {
            "name": "v",
            "desc": "List each file as it is copied",
        },
        {
            "valued": "fileN...",
            "desc": "Files to copy into the destination.",
        },
        {
            "valued": "target",
            "desc": "The target file, or, if an existing directory, the directory to copy into.",
        }
    ],
}

// CopyFile() Copies from the source to the target using the flags.
Cp.CopyFile = function(sourceFile, targetPath, flags)
    targetParts = 
end function


Cp.Run = function(context, args, session)
    if ContextLib.Cli.TryHelp(args, Cp.usage, context) then return
    logger = ContextLib.Logger.New("cp", context)

    flags = { "recursive": false, "force": false, "attribs": false, "overwrite": true : "add": true, "verbose": false }
    for key in args.Named.indexes
        if key.indexOf("R") != null then flags.recursive = true
        if key.indexOf("f") != null then flags.force = true
        if key.indexOf("p") != null then flags.attribs = true
        if key.indexOf("n") != null then flags.overwrite = false
        if key.indexOf("u") != null then flags.add = false
        if key.indexOf("v") != null then flags.verbose = true
    end for

    files = FileLib.Expand.ExpandFiles(args.Unnamed, session.Computer, session.Home, session.Cwd)
    if files.len < 2 then
        ContextLib.Cli.ShowSummary(Cp.usage, context, context.Errors)
        return
    end if

    // The target does not need to exist as a file.
    if files[-1].File != null then
        target = FileLib.Paths.NormalizePath(FileLib.Paths.SplitPath(files[-1].File.path))
        is_folder = files[-1].File.is_folder
    else
        target = FileLib.Paths.NormalizePath(FileLib.Paths.SplitPath(files[-1].Value))
        is_folder = false
    end if

    // Multiple sources only works when the target is a file.
    // I mean, with old Unix cp, they'll just all copy with the final one winning, but
    // it's probably not what the user expected.
    if not is_folder and files.len >= 3 then
        context.Errors.push(ErrorLib.Error.New("Incorrectly specified multiple sources with a file as the target", {}))
        return
    end if


    sources = files[:-1]

    if target == null or sources.len <= 0 then
    end if

    if target.is_folder then
    else if sources.len != 1 then
    else
        
    end if
end function

Cp.Main = function()
    context = ContextLib.Get()
    args = context.Args
    session = ContextLib.GetSession(context)
    Cp.Run(context, args, session)
    exit
end function

if locals == globals then Cp.Main()
