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

    suffix = args.GetNamed("F") == true
    hidden = args.GetNamed("a") == true or args.GetNamed("A") == true
    pdirs = args.GetNamed("a") == true and args.GetNamed("A") != true
    deepdirs = args.GetNamed("d") != true
    if args.GetNamed("c") == true then
        ContextLib.ClearPage(Ls.PageName)
    end if

    if args.UnnamedEmpty then
        // A shorthand...
        args.Unnamed.push({"Value": session.Cwd, "Name": null, "File": session.Computer.File(session.Cwd), "Original": ""})
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

    for arg in args.Unnamed
        if arg.Original == "." then
            prefix = ""
        else
            // This isn't right.  If the argument is a file,
            // then it should just be the value.  If the argument is
            // something like "Downloads/*.txt", then the prefix needs to
            // be "Downloads/".
            prefix = arg.Value + "/"
        end if
        // TODO support pdirs
        f = arg.File
        if f == null then
            context.Errors.push(ErrorLib.Error.New("No such file: '{name}'", {"name": arg.Value}))
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
    return
end function

if locals == globals then Ls.Main()
