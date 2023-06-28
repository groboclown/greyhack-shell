// Library functions to make creating a CLI with the context
// (such as cmdlets) much easier.
//
// With this library, the argument "args" refers to a
// CmdletManager.ArgumentSet value.
// The argument "context" refers to the ContextLib.Get() value..
// The argument "session" refers to the ContextLib.GetSession() value.

// Requires:
// import_code("get.gs")
// import_code("session.gs")
// import_code("pages-create.gs")
// import_code("pages-send.gs")
// import_code("console.gs")

if not globals.hasIndex("ContextLib") then globals.ContextLib = {}
ContextLib = globals.ContextLib

ContextLib.Cli = {}

ContextLib.Cli.HelpPage = {}
ContextLib.Cli.HelpPage.Name = "help"
ContextLib.Cli.HelpPage.Meta = {
    "Description": "Help text for the end-user.",
    "Default": "text",
    "Fields": {
        "command": {
            "Description": "The command that generated the help text",
        },
        "section": {
            "Description": "Help section",
        },
        "kind": {
            "Description": "Kind of section (h1, h2, p, x, s)",
        },
        "text": {
            "Description": "A partial line of help text.",
            "Order": 1,
        },
    },
}
ContextLib.Cli.HelpPage.sectionStyles = {
    "h1": { "c": "#00ffff", "b": true, "u": true },
    "h2": { "c": "#00c0c0", "b": true },
    "s": { "c": "#808080", "b": true },
    "p": { "c": "#808080" },
    "a": { "c": "#80a0a0" },
    "x": { "c": "#a0a0a0" },
    "e": { "c": "#a02020" },
    "-": { "c": "#808080" },
}
ContextLib_Cli_HelpPage_GetSectionStyle = function(row)
    if row != null and row isa map and row.hasIndex("kind") and ContextLib.Cli.HelpPage.sectionStyles.hasIndex(row.kind) then
        return ContextLib.Cli.HelpPage.sectionStyles[row.kind]
    end if
    return ContextLib.Cli.HelpPage.sectionStyles.p
end function
ContextLib.Cli.HelpPage.Meta.Fields.text.Style = @ContextLib_Cli_HelpPage_GetSectionStyle

// TryHelp() Show help lines if the "-h" or "--help" arguments are given.
//
// Returns true if the arguments caused the help to be produced, false otherwise.
//
// The 'usage' argument is a rich map with general usage information.  If the
// prerequisites for the usage are not met, then this will generate an error 
// message and produce the help.
//
// 'usage' can contain:
//   cmd: name of the command (required)
//   summary: if given, then this is the summary (top) line of the command.
//   long: long text description
//   man: In-depth description, broken into sections - a list of dictionaries with
//     the form 't': (text), 'k': (section style kind), 's': (section name)
//   epilogue: text to go after the argument list
//   requiresArg: if no arguments are given, then the summary is shown.
//   args: list of argument maps:
//     * name - name of the argument, if a named argument.
//     * required - causes the TryHelp to report an error if the argument is not given.
//     * desc - a description for the argument
//     * valued - name of the argument value, if the argument takes a value ("--name=value" form).
ContextLib.Cli.TryHelp = function(args, usage, context=null)
    if args.Empty and usage.hasIndex("requiresArg") and usage.requiresArg then
        ContextLib.Cli.ShowSummary(usage, context)
        return true
    end if
    if args.GetNamed("h") or args.GetNamed("help") then
        ContextLib.Cli.ShowHelp(usage, context)
        return true
    end if

    // Check arguments for problems.
    errors = []
    if usage.hasIndex("args") then
        for argIdx in usage.args.indexes
            uArg = usage.args[argIdx]
            if uArg.hasIndex("required") and uArg.required then
                if uArg.hasIndex("name") and args.GetNamed(uArg.name) == null then
                    errors.push("Missing required argument '--" + uArg.name + "'")
                else
                    // Figure out a good way to require positional arguments.
                end if
            end if
            if uArg.hasIndex("name") and uArg.hasIndex("valued") and args.GetNamed(uArg.name) == true then
                errors.push("Argument '--" + uArg.name + "' requires a value.")
            end if
        end for
    end if
    if errors.len > 0 then ContextLib.Cli.ShowSummary(usage, context, errors)

    return errors.len > 0
end function

ContextLib.Cli.buildHelpText = function(usage)
    summary = null
    if usage.hasIndex("summary") then summary = usage.summary
    epilogue = null
    if usage.hasIndex("epilogue") then epilogue = usage.epilogue
    if epilogue != null and epilogue isa string then epilogue = [epilogue]
    usageLine = usage.cmd + " [--help]"
    argInfo = [
        {"form": "--help", "req": false, "desc": "Descriptive help"},
    ]
    long = null
    if usage.hasIndex("long") then long = usage.long
    if long != null and long isa string then long = [long]
    man = []
    if usage.hasIndex("man") then man = usage.man

    if usage.hasIndex("args") then
        for arg in usage.args
            req = false
            if arg.hasIndex("required") and arg.required then req = true
            desc = ""
            if arg.hasIndex("desc") then desc = arg.desc
            shown = true

            if arg.hasIndex("name") and arg.hasIndex("valued") then
                form = "--" + arg.name + "=" + arg.value
                if req then
                    usageLine = usageLine + " --" + arg.name + "=" + arg.valued
                else
                    usageLine = usageLine + " [--" + arg.name + "=" + arg.valued + "]"
                end if
            else if arg.hasIndex("name") then
                form = "--" + arg.name
                if arg.hasIndex("required") and arg.required then
                    usageLine = usageLine + " --" + arg.name
                else
                    usageLine = usageLine + " [--" + arg.name + "]"
                end if
            else if arg.hasIndex("valued") then
                form = arg.valued
                if arg.hasIndex("required") and arg.required then
                    usageLine = usageLine + " " + arg.valued
                else
                    usageLine = usageLine + " [" + arg.valued + "]"
                end if
            else
                shown = false
            end if
            if shown then
                argInfo.push({"form": form, "req": req, "desc": desc})
            end if
        end for
    end if
    return {
        "summary": summary, "epilogue": epilogue,
        "usage": usageLine, "args": argInfo,
        "long": long, "man": man,
    }
end function

// ShowSummary() Show the summary text to the help page.
ContextLib.Cli.ShowSummary = function(usage, context=null, errors=null)
    if context == null then context = ContextLib.Get()
    ContextLib.CreatePage(context, ContextLib.Cli.HelpPage.Name, ContextLib.Cli.HelpPage.Meta)
    help = ContextLib.Cli.buildHelpText(usage)

    if errors != null then
        for error in errors
            ContextLib.Cli.SendHelpText(context, {
                "command": usage.cmd,
                "section": "error",
                "kind": "e",
                "text": error,
            })
        end for
    end if

    if help.summary != null then
        ContextLib.Cli.SendHelpText(context, {
            "command": usage.cmd,
            "section": "summary",
            "kind": "s",
            "text": help.summary,
        })
    end if
    ContextLib.Cli.SendHelpText(context, {
        "command": usage.cmd,
        "section": "usage",
        "kind": "x",
        "text": help.usage,
    })
    context.ActivePage = ContextLib.Cli.HelpPage.Name
end function

// ShowHelp() Shows the help to the help page.
ContextLib.Cli.ShowHelp = function(usage, include_man=false, context=null, maxArgLen=20)
    if context == null then context = ContextLib.Get()
    ContextLib.CreatePage(context, ContextLib.Cli.HelpPage.Name, ContextLib.Cli.HelpPage.Meta)
    help = ContextLib.Cli.buildHelpText(usage)
    
    ContextLib.Cli.SendHelpText(context, {
        "command": usage.cmd,
        "section": "summary",
        "kind": "h1",
        "text": usage.cmd,
    })
    ContextLib.Cli.SendHelpText(context, {
        "command": usage.cmd,
        "section": "summary",
        "kind": "s",
        "text": help.summary,
    })
    if help.long != null then
        for line in help.long
            ContextLib.Cli.SendHelpText(context, {
                "command": usage.cmd,
                "section": "description",
                "kind": "p",
                "text": line,
            })
        end for
    end if

    // internal column formatting...
    argLen = 0
    for arg in help.args
        if arg.form.len > argLen then argLen = arg.form.len
    end for
    if argLen > maxArgLen then argLen = maxArgLen

    for arg in help.args
        line = "  " + arg.form
        while line.len < argLen + 4
            line = line + " "
        end while
        if arg.req then line = line + "(required)"
        if arg.desc != null then line = line + " " + arg.desc
        ContextLib.Cli.SendHelpText(context, {
            "command": usage.cmd,
            "section": "arguments",
            "kind": "a",
            "text": line,
        })
    end for

    if help.epilogue != null then
        for line in help.epilogue
            ContextLib.Cli.SendHelpText(context, {
                "command": usage.cmd,
                "section": "epilogue",
                "kind": "p",
                "text": line,
            })
        end for
    end if

    if include_man then
        for part in help.man
            ContextLib.Cli.SendHelpText(context, {
                "command": usage.cmd,
                "section": part.s,
                "kind": part.k,
                "text": part.t,
            })
            end for
    end if
    context.ActivePage = ContextLib.Cli.HelpPage.Name
end function

// SendHelpText() Send a text page record to the help.
//
// This includes nice column fitting.
ContextLib.Cli.SendHelpText = function(context, textGroup)
    TAB = char(9)
    CR = char(10)
    LF = char(13)

    // Add a blank record as a paragraph separator...
    // if it's not an example or argument...  This is so that multi-line
    // examples have precise spacing.
    if textGroup.kind != "x" and textGroup.kind != "a" then
        ContextLib.SendToPage(context, ContextLib.Cli.HelpPage.Name, {
            "command": textGroup.command,
            "section": textGroup.section,
            "kind": "-",
            "text": "",
        })
    end if

    // Split the text into lines.  Because the display is forced to have
    // just 1 visible column, we hard-code the expected display width.
    maxWidth = 80
    if ContextLib.hasIndex("Console") then maxWidth = ContextLib.Console.Width

    isSpace = function(pos)
        if pos >= textGroup.text.len then return false
        ch = textGroup.text[pos]
        return ch == " " or ch == TAB or ch == CR or ch == LF
    end function
    
    // The logic here finds chunks of text and chunks of spaces.
    // Each item is [isText, size, start, end].  
    // This is set up to allow for leading spaces, meaning the very first
    // entry might have some space at the start.
    // All of this text parsing could be done in a single pass, but that
    // would be really tricky logic.
    textLen = textGroup.text.len
    chunks = []
    isText = 1
    chunkStart = 0
    // So, find the first non-space chunk...
    pos = 0
    while pos < textLen
        if not isSpace(pos) then break
        pos = pos + 1
    end while
    // Then break up the chunks.
    while pos <= textLen
        foundSpace = isSpace(pos)
        if isText and (foundSpace or pos >= textLen) then
            chunks.push([1, pos - chunkStart, chunkStart, pos])
            chunkStart = pos
            isText = 0
        else if not isText and (not foundSpace or pos >= textLen) then
            chunks.push([0, pos - chunkStart, chunkStart, pos])
            chunkStart = pos
            isText = 1
        end if
        pos = pos + 1
    end while

    sendText = function(text)
        ContextLib.SendToPage(context, ContextLib.Cli.HelpPage.Name, {
            "command": textGroup.command,
            "section": textGroup.section,
            "kind": textGroup.kind,
            "text": text,
        })
    end function

    // Now size up the chunks into lines based on console width.
    line = ""
    preSpace = ""
    preSpaceLen = 0
    lineLen = 0
    for chunk in chunks
        if chunk[0] and chunk[1] + preSpaceLen + lineLen > maxWidth then
            // Adding in this chunk exceeds our width.
            if lineLen > 0 then
                sendText(line)
            end if
            // Throw away the preSpace.
            line = textGroup.text[chunk[2]:chunk[3]]
            lineLen = line.len
            while lineLen > maxWidth
                // The chunk, by itself, is too big.
                sendText(line[0:maxWidth])
                line = line[maxWidth:]
                lineLen = lineLen - maxWidth
            end while
        else if chunk[0] then
            // Some text to add into the line.
            line = line + preSpace + textGroup.text[chunk[2]:chunk[3]]
            lineLen = lineLen + preSpaceLen + chunk[1]
            preSpace = ""
            preSpaceLen = 0
        else
            // Some pre-space.  Just set it.
            preSpace = textGroup.text[chunk[2]:chunk[3]]
            preSpaceLen = chunk[1]
        end if
    end for
    if lineLen > 0 then sendText(line)
end function
