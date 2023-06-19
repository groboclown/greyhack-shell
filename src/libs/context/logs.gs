// Standard context page to add in logging.

// Dependencies:
// import_code("get.gs")
// import_code("pages-create.gs")
// import_code("pages-send.gs")
// import_code("../format/formatted-str.gs")

if not globals.hasIndex("ContextLib") then globals.ContextLib = {}
ContextLib = globals.ContextLib

ContextLib.LogPage = {}

ContextLib.LogPage.TRACE = "trace"
ContextLib.LogPage.DEBUG = "debug"
ContextLib.LogPage.VERBOSE = "verbose"
ContextLib.LogPage.INFO = "info"
ContextLib.LogPage.WARNING = "warning"
ContextLib.LogPage.ERROR = "error"
ContextLib.LogPage.FATAL = "fatal"
ContextLib.LogPage.LogLevels = {
    ContextLib.LogPage.TRACE: {
        "name": ContextLib.LogPage.TRACE,
        "level": 0,
        "display": "[TRACE]",
        "color": "#404040",
    },
    ContextLib.LogPage.DEBUG: {
        "name": ContextLib.LogPage.DEBUG,
        "level": 1,
        "display": "[DEBUG]",
        "color": "#606060",
    },
    ContextLib.LogPage.VERBOSE: {
        "name": ContextLib.LogPage.VERBOSE,
        "level": 2,
        "display": "[VRBSE]", // ha ha.  It's verbose.
        "color": "#006000",
    },
    ContextLib.LogPage.INFO: {
        "name": ContextLib.LogPage.INFO,
        "level": 3,
        "display": "[ INFO]",
        "color": "#00a000",
    },
    ContextLib.LogPage.WARNING: {
        "name": ContextLib.LogPage.WARNING,
        "level": 4,
        "display": "[ WARN]",
        "color": "#a04000",
    },
    ContextLib.LogPage.ERROR: {
        "name": ContextLib.LogPage.ERROR,
        "level": 5,
        "display": "[ERROR]",
        "color": "#f02020",
    },
    ContextLib.LogPage.FATAL: {
        "name": ContextLib.LogPage.FATAL,
        "level": 6,
        "display": "[FATAL]",
        "color": "#ff3030",
    },
}
ContextLib.LogPage.DEFAULT_LOG_LEVEL = ContextLib.LogPage.LogLevels[ContextLib.LogPage.INFO]

ContextLib.LogPage.Name = "logs"
ContextLib.LogPage.Text = function(row)
    if row != null and row isa map and row.hasIndex("level") and row.hasIndex("Text") then
        if ContextLib.LogPage.LogLevels.hasIndex(row.level) then
            loglevel = ContextLib.LogPage.LogLevels[row.level]
        else
            loglevel = ContextLib.LogPage.DEFAULT_LOG_LEVEL
        end if
        return "<color=#808080>" + loglevel.display + "</color> <color=" + loglevel.color + ">" + row.Text + "</color>"
    end if
    return ""
end function
ContextLib.LogPage.GetLevelColor = function(row)
    if row != null and row isa map and row.hasIndex("level") and ContextLib.LogPage.LogLevels.hasIndex(row.level) then
        return ContextLib.LogPage.LogLevels[row.level].color
    end if
    return ContextLib.LogPage.DEFAULT_LOG_LEVEL.color
end function

ContextLib.LogPage.Metadata = {
    "Default": "msg",
    "minlevel": ContextLib.LogPage.LogLevels[ContextLib.LogPage.INFO].level,
    "Text": @ContextLib.LogPage.Text,
    "Description": "Command logs",
    "Fields": {
        "level": {
            "Description": "Log level of the output",
            "Order": 1,
            "Color": "#606060",
            "Width": 4,
        },
        "msg": {
            "Description": "Raw message text",
        },
        "args": {
            "Description": "Message arguments",
        },
        "text": {
            "Description": "Log text",
            "Order": 2,
            // This is a bug in old versions of miniscript that grey hack hasn't picked up the fix for.
            // "Color": @ContextLib.LogPage.GetLevelColor,
        },
    },
}
ContextLib.LogPage.Metadata.Fields.text.Color = @ContextLib.LogPage.GetLevelColor

ContextLib.Log = function(level, message, arguments=null, context=null)
    if arguments == null then arguments = {}
    if context == null then context = ContextLib.Get()
    if ContextLib.LogPage.LogLevels.hasIndex(level) then
        loglevel = ContextLib.LogPage.LogLevels[level]
    else
        loglevel = ContextLib.LogPage.LogLevels[ContextLib.LogPage.INFO]
    end if
    // Ensure the log page exists.
    ContextLib.CreatePage(context, ContextLib.LogPage.Name, ContextLib.LogPage.Metadata)

    // Should it be logged?
    if loglevel.level >= context.PagesMeta[ContextLib.LogPage.Name].minlevel then
        ContextLib.Send(context, ContextLib.LogPage.Name, {
            "level": loglevel.name,
            "msg": message,
            "args": arguments,
            "text": globals.FormatStr.PyFormat(message, arguments),
        })
    end if
end function
