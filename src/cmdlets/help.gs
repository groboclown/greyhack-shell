// The Help Cmdlet
// Acts as a kind of hello world, too.
// It's written to allow easy unit testing.

import_code("../libs/context/get.gs")
import_code("../libs/context/pages-create.gs")
import_code("../libs/context/logs.gs")
import_code("../libs/context/pages-send.gs")
import_code("../libs/format/formatted-str.gs")

Help = {}

Help.Run = function(context, args)
    // A short-hand for the output logging.
    out = function(t)
        ContextLib.Log("info", t)
    end function

    if args.Empty then
        // High level help.
        out("Help is broken into sections.  Use 'help (section name)' to select one.")
        out("")
        out("display   - what you're looking at")
        out("syntax    - general prompt usage")
        out("alias     - using command aliases")
        out("page      - information on the page system")
        out("config    - configuring the shell")
        out("")
        return
    end if

    if args.ContainsValue("syntax") then
        out("The general syntax is like a terminal shell:")
        out("")
        out("   cmdlet-name argument1 argument2")
        out("")
        out("You may start the command with a '!' (exclamation point, or 'bang')")
        out("to cause the shell to pause before continuing after running the cmdlet.")
        out("This is useful if the command runs tools that do not conform to standard")
        out("cmdlet rules.")
        out("")
    end if

end function

Help.Main = function()
    // The context is the shared context object.
    context = ContextLib.Get()
    // There's also the current session object, but the help doesn't use that.
    // Arguments are the parsed arguments.  They're constructed in the cmdlets.gs file.
    args = context.Args
    Help.Run(context, args)
    exit
end function

if locals == globals then Help.Main()
