// The Help Cmdlet
// Acts as a kind of hello world, too.
// It's written to allow easy unit testing.

import_code("../libs/context/get.gs")
import_code("../libs/context/pages-create.gs")
import_code("../libs/context/logs.gs")
import_code("../libs/context/pages-send.gs")
import_code("../libs/context/cli-helper.gs")
import_code("../libs/format/formatted-str.gs")

Help = {}

Help.Run = function(context, args)
    ContextLib.CreatePage(context, ContextLib.Cli.HelpPage.Name, ContextLib.Cli.HelpPage.Meta)
    context.ActivePage = ContextLib.Cli.HelpPage.Name
    
    ContextLib.Cli.SendHelpText(context, {
        "command": "help",
        "section": "summary",
        "kind": "h1",
        "text": "help",
    })

    // Short-hand helpers.
    section = "help"
    out = function(t)
        ContextLib.Cli.SendHelpText(context, {
            "command": "help",
            "section": outer.section,
            "kind": "p",
            "text": t,
        })
    end function
    outY = function(y, t)
        ContextLib.Cli.SendHelpText(context, {
            "command": "help",
            "section": outer.section,
            "kind": y,
            "text": t,
        })
    end function

    if args.Empty then
        // High level help.
        section = "help on help"
        outY("h1", "Help on Help")
        out("Help is broken into sections.  Use 'help (section name)' to select one.")
        outY("a", "  display   - what you're looking at")
        outY("a", "  syntax    - general prompt usage")
        outY("a", "  alias     - using command aliases")
        outY("a", "  page      - information on the page system")
        outY("a", "  config    - configuring the shell")
        return
    end if

    if args.ContainsValue("display") then
        section = "display"
        outY("h1", "Display")
        out("The MC screen is split into three areas - the page, the errors, and the prompt.")
        outY("h2", "Display: Page")
        out(
            "Because of the limitations in input control with Grey Hack, an innovation " +
            "in shells was made to split the usable store of data into referencable 'pages'.  " +
            "It's influenced by tmux and screen, and databases.")
        out("The page has rows, with each row containing different fields.  From the command line, " +
            "you can reference a field from a page as a short-hand for a cut-and-paste into your " +
            "command.")
    end if

    if args.ContainsValue("syntax") then
        section = "syntax"
        outY("h1", "Syntax Help")
        out("The general syntax is like a terminal shell:")
        outY("x", "   cmdlet-name argument1 argument2")
        out("You may start the command with a '!' (exclamation point, or 'bang') to cause " +
            "the shell to pause before continuing after running the cmdlet.  This is useful " +
            "if the command runs tools that do not conform to standard cmdlet rules.")
        out("You may also have multiple commands on a single line by separating them with a ';'.")
        out("Your command may include environment variables in the form '${ENV_NAME}'.")
        out("You may also use text from pages in one of these forms:")
        outY("x", "  [row]")
        outY("x", "  [row:fieldName]")
        outY("x", "  [page:row]")
        outY("x", "  [page:row:fieldName]")
        out("This will extract the page's row's field value and insert it into your command.  " +
            "If you don't specify a page, then it's the active page.  If you don't specify a " +
            "field name, then the default field for the page is used.")
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
