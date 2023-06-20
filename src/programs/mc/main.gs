// A Shell Replacement

// All the imports...
import_code("../../libs/format/formatted-str.gs")
import_code("../../libs/errors.gs")
import_code("../../libs/files/paths.gs")
import_code("../../libs/files/json.gs")
import_code("../../libs/context/get.gs")
import_code("../../libs/context/pages-create.gs")
import_code("../../libs/context/pages-read.gs")
import_code("../../libs/context/pages-send.gs")
import_code("../../libs/context/session.gs")
import_code("../../libs/context/logs.gs")
import_code("../../libs/std-lib/sort.gs")

import_code("config.gs")
import_code("fd.gs")
import_code("parser.gs")
import_code("ui.gs")
import_code("cmdlets.gs")


context = ContextLib.Get()
config = MCConfig.Load(context)
if config == null then exit("Failed to load config\n" + FormatStr.PyFormat("{err}", {"err":context.Errors}))
ui = UI.New()
print("Loading config into ui")
ui.LoadConfig(config.Section("ui"))

cmdlets = CmdletManager.New()
print("Loading config into cmdlets")
cmdlets.LoadConfig(config.Section("cmdlets"))


// Default page is the logs.
context.ActivePage = ContextLib.LogPage.Name

// Welcome Screen
ContextLib.Log("warning", "MC Shell v0.1", {})
ContextLib.Log("info", "https://github.com/groboclown/greyscript/", {})
ContextLib.Log("info", "Type 'help' and enter for help.", {})
ContextLib.Log("info", "Type 'exit' and enter to leave.", {})

while true
    session = ContextLib.GetSession(context)
    screen = ui.Draw(context, session)
    clear_screen()
    for line in screen[0]
        print(line)
    end for
    line = user_input(screen[1])
    if line == "exit" then exit
    cmdList = ParsedCommand.Parse(line, session.env, context)
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
