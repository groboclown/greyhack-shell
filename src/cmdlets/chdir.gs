// Change current working directory.

import_code("../libs/context/get.gs")
import_code("../libs/context/session.gs")
import_code("../libs/context/logs.gs")
import_code("../libs/context/pages-create.gs")
import_code("../libs/context/pages-send.gs")
import_code("../libs/context/cli-helper.gs")
import_code("../libs/files/paths.gs")
import_code("../libs/files/expand-args.gs")
import_code("../libs/format/formatted-str.gs")

Cd = {}

Cd.usage = {
    "cmd": "cd",
    "summary": "change current working directory",
    "requiresArg": false,
    "args": [
        {"valued": "directory", "desc": "Directory to change to"},
    ],
    "epilogue": "When used without a value, changes to the user's home directory.",
}

Cd.Run = function(context, args, session)
    if ContextLib.Cli.TryHelp(args, Cd.usage, context) then return

    if args.Unnamed.len <= 0 then
        dirname = session.Home
    else
        dirname = args.Unnamed[0]
    end if

    for match in FileLib.Expand.ExpandFiles(args.Ordered, session.Computer, session.Home, session.Cwd)
        f = match.File
        if f == null then
            context.Errors.push(ErrorLib.Error.New("No such directory: '{name}'", {"name": match.Value}))
        else if not f.is_folder then
            context.Errors.push(ErrorLib.Error.New("Not a directory: '{name}'", {"name": match.Value}))
        else
            session.Cwd = f.path
            if f.path == session.Home then
                session.CwdN = "~"
                session.CwdR = "~"
            else
                session.CwdN = f.name
                // CwdR is supposed to be relative to home...
                session.CwdR = f.path
            end if
        end if
    end for
end function

Cd.Main = function()
    context = ContextLib.Get()
    args = context.Args
    session = ContextLib.GetSession(context)
    Cd.Run(context, args, session)
    exit
end function

if locals == globals then Cd.Main()
