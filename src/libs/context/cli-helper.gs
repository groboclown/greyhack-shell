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

ContextLib.Cli.HelpPageMeta = {
    "Description": "Help text for the end-user.",
    "Fields": {
        "command": {
            "Description": "The command that generated the help text",
        },
        "section": {
            "Description": "Help section",
        },
        "text", {
            "Description": "A partial line of help text.",
            "Order": 1,
        },
    },
}

// TryHelp() Show help lines if the "-h" or "--help" arguments are given.
//
// Returns true if the arguments include help, false otherwise.
//
// Generally, this command is used when the user wants explicit, long-form
// help displayed.
//
// Long help is sent to a special "help" page.  The lines should be an
// array of markup strings.
ContextLib.Cli.TryHelp = function(args, helpLines)
    if args.GetNamed("h") or args.GetNamed("help") then
        
        return true
    end if
    return false
end function

// TrySummaryOnNoArgs() Show the summary text.
//
// Summary text is sent to the logs.
ContextLib.Cli.TrySummaryOnNoArgs = function(args, summaryLines)
    if args.Empty
end function
