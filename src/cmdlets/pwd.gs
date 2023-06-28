// Log current working directory.

import_code("../libs/context/get.gs")
import_code("../libs/context/session.gs")
import_code("../libs/context/logs.gs")
import_code("../libs/context/pages-create.gs")
import_code("../libs/context/pages-send.gs")
import_code("../libs/context/cli-helper.gs")
import_code("../libs/format/formatted-str.gs")

Pwd = {}

Pwd.usage = {
    "cmd": "pwd",
    "summary": "display current working directory",
    "requiresArg": false,
    "args": [],
}

Pwd.Run = function(context, args, session)
    if ContextLib.Cli.TryHelp(args, Pwd.usage, context) then return

    logger = ContextLib.Logger.New("pwd", context)
    logger.Info(session.Cwd)
end function

Pwd.Main = function()
    context = ContextLib.Get()
    args = context.Args
    session = ContextLib.GetSession(context)
    Pwd.Run(context, args, session)
    exit
end function

if locals == globals then Pwd.Main()
