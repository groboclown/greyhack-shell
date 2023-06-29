// List files in a tree format.

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

Tree = {}

Tree.PageName = "tree"

Tree.Meta = {
    "Default": "path",
    "Description": "File list",
    "Fields": {
        "type": {
            "Description": "File type",
        },
        "permissions": {
            "Description": "File permissions",
            // "Order": 1,
            "Color": "#808080",
            "Width": 10,
        },
        // No hard link count
        "owner": {
            // "Order": 2,
            "Color": "#808080",
            "Width": 8,
        },
        "group": {
            // "Order": 3,
            "Color": "#808080",
            "Width": 8,
        },
        "size": {
            // "Order": 4,
            "Color": "#808080",
            "Width": 10, // 1 gb
        },
        "depth": {
            "Order": 1,
            "Color": "#707070",
            "Width": 4,
        },
        // No file time
        "display": {
            "Description": "Filename based on argument",
            "Order": 2,
            "Color": "#90a0a0", // @Tree__FilenameColor,
        },
        "name": {
            "Description": "Filename without the path",
            // "Order": 6,
            "Color": "#90a0a0", // @Tree__FilenameColor,
        },
        "path": {
            "Description": "Filename with the path",
            // "Order": 7,
            "Color": "#808080",
        },
    },
}

Tree.usage = {
    "cmd": "tree",
    "summary": "list files under a directory",
    "requiresArg": false,
    "args": [
        {"name": "c", "desc": "Clear the page first"},
        {"name": "F", "desc": "Suffix directory names with '/'"},
        {"name": "a", "desc": "Show hidden files"},
        {"name": "d", "desc": "List directories only."},
        {"name": "max", "desc": "Maximum directory depth (number) to descend"},
        {"valued": "fileN...", "desc": "Zero or more files to explicitly look for."},
    ],
    "epilogue": [
        "Due to the paging mechanisms, the column display is managed by the paging, not the tool.",
    ],
}

Tree__FilenameColor = function(row)
    if row.type == "folder" then return "#20d020"
    return "#909090"
end function

Tree.Run = function(context, args, session)
    if ContextLib.Cli.TryHelp(args, Tree.usage, context) then return

    ContextLib.CreatePage(context, Tree.PageName, Tree.Meta)

    suffix = args.GetNamed("F") == true
    hidden = args.GetNamed("a") == true
    showfiles = args.GetNamed("d") != true
    deepdirs = true
    maxDepth = 99
    
    if args.GetNamed("max") != null then
        val = args.GetNamed("max")
        if val isa string then
            maxDepth = floor(val.val)
        else if arg.Value isa number then
            maxDepth = floor(val)
        else
            maxDepth = 0
        end if
        if maxDepth <= 0 then
            context.Errors.push(ErrorLib.Error.New("Invalid max depth value: '{value}'", {"value": val}))
            maxDepth = 1
        end if
    end if

    if args.GetNamed("c") then
        ContextLib.ClearPage(Tree.PageName)
    end if

    if args.Unnamed <= 0 then
        // A shorthand...
        args.Ordered.push({"Value": ".", "Name": null, "File": null, "Original": ""})
    end if

    show_file = function(f, prefix, depth)
        if not f.is_folder and not outer.showfiles then return
        if f.name[0] == "." and not outer.hidden then return
        sx = ""
        type = "-"
        if f.is_folder then
            // TODO should be an ls of the contents, unless "-d" argument is given.
            type = "d"
            if outer.suffix then sx = "/"
        else if f.allow_import then
            type = "o"
        else if f.is_binary then
            type = "n"
        end if
        ContextLib.SendToPage(context, Tree.PageName, {
            "type": type,
            "permissions": type + f.permissions[1:],
            "owner": f.owner,
            "group": f.group,
            "size": f.size, // string in bytes
            "display": prefix + f.name + sx,
            "name": f.name,
            "path": f.path,
            "depth": depth,
        })
    end function

    for arg in args.Unnamed
        f = arg.File
        if f == null then
            context.Errors.push(ErrorLib.Error.New("No such file: '{name}'", {"name": arg.Value}))
        else
            stack = [[arg.File, 1, ""]]
            while stack.len > 0
                next_node = stack.pop()
                f = next_node[0]
                d = next_node[1]
                p = next_node[2]
                show_file(f, p, d)

                if f.is_folder and d + 1 < maxDepth then
                    // Should be some smarter logic for this than this if statement.
                    spre = p + " +- "

                    for sub in f.get_folders
                        stack.push([sub, d + 1, spre])
                    end for
                    for sub in f.get_files
                        stack.push([sub, d + 1, spre])
                    end for
                end if
            end while
        end if
    end for
    context.ActivePage = Tree.PageName
end function

Tree.Main = function()
    context = ContextLib.Get()
    args = context.Args
    session = ContextLib.GetSession(context)
    Tree.Run(context, args, session)
    exit
end function

if locals == globals then Tree.Main()
