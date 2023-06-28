// Remove files

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

Rm = {}

Rm.usage = {
    "cmd": "rm",
    "summary": "remove files",
    "requiresArg": true,
    "args": [
        {"name": "f", "desc": "Force removal, even if read-only"},
        {"name": "r", "desc": "Remove subdirectories and their contents"},
        {"name": "v", "desc": "Explain what is being done"},
        {"valued": "fileN...", "desc": "One or more files to remove."},
    ],
}

Rm.RemoveOneFile = function(file, force, verbose, logger)
    if file == null then return null
    if not file.has_permission("w") then
        if force then
            res = file.chmod("u+w", false)
            if res != "" then
                return ErrorLib.Error.New("{name}: {reason}", {"name": file.path, "reason": res})
            end if
            if verbose then logger.Info("{name}: chmod u+w", {"name": file.path})
        else
            return ErrorLib.Error.New("{name}: no permissions", {"name": file.path})
        end if
    end if
    if file.is_folder then
        if f.get_folders.len + f.get_files.len > 0 then
            return ErrorLib.Error.New("{name}: not empty", {"name": file.path})
        end if
    end if
    res = file.delete()
    if res != "" then
        return ErrorLib.Error.New("{name}: {reason}", {"name": file.path, "reason": res})
    end if
    if verbose then logger.Info("{name}", {"name": file.path})
    return null
end function

Rm.RecursiveRemove = function(file, force, verbose, logger)
    if file == null then return []
    ret = []
    stack = [[file, false]]
    while stack.len > 0
        item = stack.pop()
        f = item[0]
        visited = item[1]
        if not f.is_folder then
            res = Rm.RemoveOneFile(f, force)
            if res != null then ret.push(res)
        else
            remaining = 0
            for sub in f.get_files
                res = Rm.RemoveOneFile(sub, force)
                if res != null then
                    ret.push(res)
                    remaining = remaining + 1
                end if
            end for

            child_subs = f.get_folders
            if remaining + child_subs.len > 0 then
                if visited then
                    // Already visited this folder to remove its contents,
                    // and that failed.  Don't try again.
                    ret.push(ErrorLib.Error.New("{name}: not empty", {"name": f.path}))
                else
                    // Need to remove child directories first.
                    // By pushing the parent on first, it'll be visited after the
                    // children.  Mark it as visited.
                    stack.push([f, true])
                    stack = stack + child_subs
                end if
            else
                res = Rm.RemoveOneFile(f, force)
                if res != null then ret.push(res)
            end if
        end if
    end while
    return ret
end function

Rm.Run = function(context, args, session)
    if ContextLib.Cli.TryHelp(args, Rm.usage, context) then return
    logger = ContextLib.Logger.New("pwd", context)

    force = false
    recurse = false
    verbose = false
    for arg in args.Ordered
        if arg.Name != null then
            if arg.Name.indexOf("r") != null then
                recurse = true
            end if
            if arg.Name.indexOf("f") != null then
                force = true
            end if
            if arg.Name.indexOf("v") != null then
                verbose = true
            end if
        end if
    end for

    for match in FileLib.Expand.ExpandFiles(args.Ordered, session.Computer, session.Home, session.Cwd)
        f = match.File
        if f == null then
            context.Errors.push(ErrorLib.Error.New("No such file: '{name}'", {"name": match.Value}))
        else if recurse then
            for err in Rm.RecursiveRemove(f, force, verbose, logger)
                context.Errors.push(err)
            end for
        else
            err = Rm.RemoveOneFile(f, force, verbose, logger)
            if err != null then context.Errors.push(err)
        end if
    end for
end function

Rm.Main = function()
    context = ContextLib.Get()
    args = context.Args
    session = ContextLib.GetSession(context)
    Rm.Run(context, args, session)
    exit
end function

if locals == globals then Rm.Main()
