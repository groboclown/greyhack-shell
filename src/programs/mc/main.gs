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

import_code("config.gs")
import_code("fd.gs")
import_code("parser.gs")
import_code("ui.gs")
import_code("page-controller.gs")


context = ContextLib.Get()
config = MCConfig.Load(context)
if config == null then exit("Failed to load config\n" + FormatStr.PyFormat("{err}", {"err":context.Errors}))
ui = UI.New()
print("Loading config into ui")
ui.LoadConfig(config.Section("ui"))

// Default page is the logs.
context.ActivePage = ContextLib.LogPage.Name

// Test page
ContextLib.Log("info", "Test log line", {})

while true
    session = ContextLib.GetSession(context)
    print("Using active page " + context.ActivePage)
    screen = ui.Draw(context, session)
    clear_screen()
    for line in screen[0]
        print(line)
    end for
    line = user_input(screen[1])
    if line == "exit" then exit
    cmdList = ParsedCommand.Parse(line, session.env, context)
    for cmd in cmdList
        for err in cmd.Errors
            context.Errors.push(err)
        end for
        if cmd.Name == "+" then
            PageController.Run(cmd.Args, context)
        end if
    end for
    // session.AddCmdToHistory(cmd)
end while
