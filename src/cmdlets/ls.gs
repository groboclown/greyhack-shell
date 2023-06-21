// List files

import_code("../libs/context/get.gs")
import_code("../libs/context/session.gs")
import_code("../libs/context/logs.gs")
import_code("../libs/context/pages-create.gs")
import_code("../libs/context/pages-read.gs")
import_code("../libs/context/pages-send.gs")
import_code("../libs/format/formatted-str.gs")
import_code("../libs/errors.gs")
import_code("../libs/files/paths.gs")
import_code("../libs/files/star-glob.gs")
import_code("../libs/files/expand-args.gs")

Ls = {}

Ls.PageName = "files"

Ls__FilenameColor = function(row)
    if row.type == "folder" then return "#20d020"
    return "#909090"
end function

Ls.Run = function(context, args, session)
    if args.GetNamed("h") or args.GetNamed("--help") then
        ContextLib.Log("warning", "ls - List files.")
        ContextLib.Log("info", "")
        ContextLib.Log("info", "Usage: ls [-F] [-a] [-A] [-d] [file] [file] ...")
        ContextLib.Log("info", "")
        ContextLib.Log("info", "-F  Suffix directory names with '/'")
        ContextLib.Log("info", "-a  Show hidden files")
        ContextLib.Log("info", "-A  Show hidden files except the current and parent directories")
        ContextLib.Log("info", "-d  Do not show contents of directories when listing the directory")
        ContextLib.Log("info", "")
        ContextLib.Log("info", "Due to the paging mechanisms, the column display is managed by")
        ContextLib.Log("info", "the paging, not the tool.")
        ContextLib.Log("info", "")
        ContextLib.Log("info", "File type characters are 'd' for folder, '-' for text file,")
        ContextLib.Log("info", "'o' for native library (importable), and 'n' for binary.")
        ContextLib.Log("info", "")
        return
    end if

    ContextLib.CreatePage(context, Ls.PageName, {
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
            // Not showing hard link count
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
            // No time display
            "name": {
                "Description": "Filename without the path",
                "Order": 5,
                "Color": "#909090", // @Ls__FilenameColor,
            },
            "path": {
                "Description": "Filename with the path",
                // "Order": 6,
                "Color": "#808080",
            },
        },
    })

    suffix = false
    hidden = false
    pdirs = false
    deepdirs = true
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
        end if
    end for

    if args.Empty then
        // A shorthand...
        args.Ordered.push({"Value": "*", "Name": null, "Command": null, "Original": ""})
    end if

    show_file = function(f)
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
            "name": f.name + sx,
            "path": f.path,
        })
    end function

    for match in FileLib.Expand.ExpandFiles(args.Ordered, session.Computer, session.Home, session.Cwd)
        f = match.File
        if f == null then
            context.Errors.push(ErrorLib.Error.New("No such file: '{name}'", {"name": match.Value}))
        else if f.is_folder then
            if deepdirs then
                // Show all the contents of the folder.
                for sub in f.get_folders
                    show_file(sub)
                end for
                for sub in f.get_files
                    show_file(sub)
                end for
            else
                // Just show the folder itself, not the contents.
                show_file(f)
            end if
        else
            show_file(f)
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
