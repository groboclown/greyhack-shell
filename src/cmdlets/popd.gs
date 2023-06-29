// Change current working directory.

import_code("../libs/context/get.gs")
import_code("../libs/context/session.gs")
import_code("../libs/context/logs.gs")
import_code("../libs/context/pages-create.gs")
import_code("../libs/context/pages-send.gs")
import_code("../libs/context/cli-helper.gs")
import_code("../libs/files/paths.gs")
import_code("../libs/format/formatted-str.gs")

PopD = {}

PopD.usage = {
    "cmd": "popd",
    "summary": "change current working directory and put the old one on the directory stack",
    "requiresArg": false,
    "args": [
        {"valued": "directory", "desc": "Directory to change to"},
    ],
    "epilogue": "When used without a value, changes to the user's home directory.",
}

PopD.Run = function(context, args, session)
    if ContextLib.Cli.TryHelp(args, PopD.usage, context) then return
    logger = ContextLib.Logger.New("pwd", context)

    if session.DirStack.len <= 0 then
        logger.Warning("popd: directory stack empty")
        return
    end if

    text = ""
    idx = session.DirStack.len
    while idx > 0
        idx = idx - 1
        if text.len > 0 then text = text + " "
        text = text + session.DirStack[idx]
    end while
    if text.len <= 0 then text = "(empty stack)"
    logger.Info(text)

    newDir = session.DirStack.pop()
    f = session.Computer.File(newDir)
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
end function

PopD.Main = function()
    context = ContextLib.Get()
    args = context.Args
    session = ContextLib.GetSession(context)
    PopD.Run(context, args, session)
    exit
end function

if locals == globals then PopD.Main()
