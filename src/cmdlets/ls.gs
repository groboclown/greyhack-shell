// List files

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

Ls = {}

Ls.PageName = "files"
Ls.Meta = {
    "Default": "path",
    "Description": "File list",
    "Fields": {
        "type": {
            "Description": "File type",
        },
        "permissions": {
            "Description": "File permissions",
            "Order": 1,
            "Color": "#808080",
            "Width": 10,
        },
        // No hard link count
        "owner": {
            "Order": 2,
            "Color": "#808080",
            "Width": 8,
        },
        "group": {
            "Order": 3,
            "Color": "#808080",
            "Width": 8,
        },
        "size": {
            "Order": 4,
            "Color": "#808080",
            "Width": 10, // 1 gb
        },
        // No file time
        "display": {
            "Description": "Filename based on argument",
            "Order": 5,
            "Color": "#90a0a0", // @Ls__FilenameColor,
        },
        "name": {
            "Description": "Filename without the path",
            // "Order": 6,
            "Color": "#90a0a0", // @Ls__FilenameColor,
        },
        "path": {
            "Description": "Filename with the path",
            // "Order": 7,
            "Color": "#808080",
        },
    },
}

Ls.usage = {
    "cmd": "ls",
    "summary": "list files",
    "requiresArg": false,
    "args": [
        {"name": "c", "desc": "Clear the page first"},
        {"name": "F", "desc": "Suffix directory names with '/'"},
        {"name": "a", "desc": "Show hidden files"},
        {"name": "A", "desc": "Show hidden files except the current ('.') and parent ('..') directories"},
        {"name": "d", "desc": "Do not show contents of directories when explicitly requesting a directory."},
        {"valued": "fileN...", "desc": "Zero or more files to explicitly look for."},
    ],
    "epilogue": [
        "Due to the paging mechanisms, the column display is managed by the paging, not the tool.",
        "File type characters are 'd' for folder, '-' for text file, " +
        "'o' for native library (importable into scripts), and 'n' for binary.",
        "If no file is listed, then the current working directory is listed.",
    ],
}

Ls__FilenameColor = function(row)
    if row.type == "folder" then return "#20d020"
    return "#909090"
end function

Ls.Run = function(context, args, session)
    if ContextLib.Cli.TryHelp(args, Ls.usage, context) then return

    ContextLib.CreatePage(context, Ls.PageName, Ls.Meta)

    suffix = false
    hidden = false
    pdirs = false
    deepdirs = true
    nonFlagCount = 0
    for arg in args.Ordered
        if arg.Name != null then
            if arg.Name.indexOf("F") != null then
                suffix = true
            end if
            if arg.Name.indexOf("a") != null then
                hidden = true
                pdirs = true
            end if
            if arg.Name.indexOf("A") != null then
                hidden = true
                pdirs = false
            end if
            if arg.Name.indexOf("d") != null then
                deepdirs = false
            end if
            if arg.Name.indexOf("c") != null then
                ContextLib.ClearPage(Ls.PageName)
            end if
        else
            nonFlagCount = nonFlagCount + 1
        end if
    end for

    if nonFlagCount <= 0 then
        // A shorthand...
        args.Ordered.push({"Value": ".", "Name": null, "Command": null, "Original": ""})
    end if

    show_file = function(f, prefix)
        sx = ""
        type = "-"
        if f.is_folder then
            // TODO should be an ls of the contents, unless "-d" argument is given.
            type = "d"
            if suffix then sx = "/"
        else if f.allow_import then
            type = "o"
        else if f.is_binary then
            type = "n"
        end if
        ContextLib.SendToPage(context, Ls.PageName, {
            "type": type,
            "permissions": type + f.permissions[1:],
            "owner": f.owner,
            "group": f.group,
            "size": f.size, // string in bytes
            "display": prefix + f.name + sx,
            "name": f.name,
            "path": f.path,
        })
    end function

    for match in FileLib.Expand.ExpandFiles(args.Ordered, session.Computer, session.Home, session.Cwd)
        f = match.File
        if match.Value == "." then
            prefix = ""
        else
            // This isn't right.  If the argument is a file,
            // then it should just be the value.  If the argument is
            // something like "Downloads/*.txt", then the prefix needs to
            // be "Downloads/".
            prefix = match.Value + "/"
        end if
        // TODO support pdirs
        if f == null then
            context.Errors.push(ErrorLib.Error.New("No such file: '{name}'", {"name": match.Value}))
        else if not hidden and f.name[0] == "." then
            // Don't show hidden files
            continue
        else if f.is_folder then
            if deepdirs then
                // Show all the contents of the folder.
                for sub in f.get_folders
                    show_file(sub, prefix)
                end for
                for sub in f.get_files
                    show_file(sub, prefix)
                end for
            else
                // Just show the folder itself, not the contents.
                show_file(f)
            end if
        else
            show_file(f, prefix)
        end if
    end for
    context.ActivePage = Ls.PageName
end function

Ls.Main = function()
    context = ContextLib.Get()
    args = context.Args
    session = ContextLib.GetSession(context)
    Ls.Run(context, args, session)
    exit
end function

if locals == globals then Ls.Main()
