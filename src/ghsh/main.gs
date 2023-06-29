// A Shell Replacement

// All the imports...
import_code("../libs/format/formatted-str.gs")
import_code("../libs/errors.gs")
import_code("../libs/files/paths.gs")
import_code("../libs/files/json.gs")
import_code("../libs/files/star-glob.gs")
import_code("../libs/context/get.gs")
import_code("../libs/context/pages-create.gs")
import_code("../libs/context/pages-read.gs")
import_code("../libs/context/pages-send.gs")
import_code("../libs/context/session.gs")
import_code("../libs/context/logs.gs")
import_code("../libs/context/console.gs")
import_code("../libs/std-lib/sort.gs")

import_code("config.gs")
import_code("parser.gs")
import_code("ui.gs")
import_code("cmdlets.gs")
import_code("load-config.gs")


context = ContextLib.Get()
ui = UI.New()
cmdlets = CmdletManager.New()
ProcessConfigFile(context, ui, cmdlets)

// Default page is the logs.
context.ActivePage = ContextLib.LogPage.Name

// Welcome Screen
logger = ContextLib.Logger.New("ghsh", context)
logger.Warning("GH Shell v0.2")
logger.Info("https://github.com/groboclown/greyscript/")
logger.Info("Type 'help' and enter for help.")
logger.Info("Type 'exit' and enter to leave.")
logger = null

while true
    session = ContextLib.GetSession(context)
    if session == null then
        // No more sessions.
        exit
    end if
    screen = ui.Draw(context, session)
    clear_screen()
    for line in screen[0]
        print(line)
    end for
    line = user_input(screen[1])
    // Emergency exit, in case the "exit" cmdlet fails.
    if line == "QUIT" then exit
    cmdList = ParsedCommand.Parse(line, session.Env, context)
    for cmd in cmdList
        errCount = 0
        for err in cmd.Errors
            context.Errors.push(err)
        end for
        if errCount <= 0 then
            cmdlets.Run(cmd, context, session)
        end if
        // TODO Need to check for "&&" and "||" operators on the cmd list.
    end for
    // session.AddCmdToHistory(cmd)
end while
