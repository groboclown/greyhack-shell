// exit the current session.

import_code("../libs/context/get.gs")
import_code("../libs/context/pages-create.gs")
import_code("../libs/context/pages-send.gs")
import_code("../libs/context/session.gs")
import_code("../libs/context/logs.gs")
import_code("../libs/context/cli-helper.gs")
import_code("../libs/format/formatted-str.gs")

Exit = {}

Exit.usage = {
    "cmd": "exit",
    "summary": "Exit the current session",
    "requiresArg": false,
    "args": [
        {"name": "name", "valued": "session-name", "desc": "session to close"},
    ],
    "long": [
        "Usage: exit",
    ],
}

Exit.Run = function(context, args)
    if ContextLib.Cli.TryHelp(args, Exit.usage, context) then return
    // could be null, which means default session.
    sessionName = args.GetNamed("name")
    ContextLib.CloseSession(context, sessionName)
end function

Exit.Main = function()
    context = ContextLib.Get()
    args = context.Args
    Exit.Run(context, args)
    exit
end function

if locals == globals then Exit.Main()
