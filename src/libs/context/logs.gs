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
        "style": { "c": "#404040" },
    },
    ContextLib.LogPage.DEBUG: {
        "name": ContextLib.LogPage.DEBUG,
        "level": 1,
        "display": "[DEBUG]",
        "style": { "c": "#606060" },
    },
    ContextLib.LogPage.VERBOSE: {
        "name": ContextLib.LogPage.VERBOSE,
        "level": 2,
        "display": "[VRBSE]", // ha ha.  It's verbose.
        "style": { "c": "#006000" },
    },
    ContextLib.LogPage.INFO: {
        "name": ContextLib.LogPage.INFO,
        "level": 3,
        "display": "[ INFO]",
        "style": { "c": "#00a000" },
    },
    ContextLib.LogPage.WARNING: {
        "name": ContextLib.LogPage.WARNING,
        "level": 4,
        "display": "[ WARN]",
        "style": { "c": "#a04000", "b": true },
    },
    ContextLib.LogPage.ERROR: {
        "name": ContextLib.LogPage.ERROR,
        "level": 5,
        "display": "[ERROR]",
        "style": { "c": "#f02020", "b": true },
    },
    ContextLib.LogPage.FATAL: {
        "name": ContextLib.LogPage.FATAL,
        "level": 6,
        "display": "[FATAL]",
        "style": { "c": "#ff3030", "b": true, "u": true },
    },
}
ContextLib.LogPage.DEFAULT_LOG_LEVEL = ContextLib.LogPage.LogLevels[ContextLib.LogPage.INFO]

ContextLib.LogPage.Name = "logs"
ContextLib.LogPage.Text = function(row)
    if row != null and row isa map and row.hasIndex("level") and row.hasIndex("text") then
        return loglevel.display + " " + row.Text
    end if
    return ""
end function
// This is a bug in old versions of miniscript that grey hack hasn't picked up the fix for.
// Using a global name, not namespaced.
ContextLib_LogPage_GetLevelStyle = function(row)
    if row != null and row isa map and row.hasIndex("level") and ContextLib.LogPage.LogLevels.hasIndex(row.level) then
        return ContextLib.LogPage.LogLevels[row.level].style
    end if
    return ContextLib.LogPage.DEFAULT_LOG_LEVEL.style
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
            "Style": { "c": "#606060" },
            "Width": 4,
        },
        "source": {
            "Description": "The source that generated the log message",
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
            // There's a bug keeping this from working.
            //"Style": @ContextLib_LogPage_GetLevelStyle,
        },
    },
}
ContextLib.LogPage.Metadata.Fields.text.Style = @ContextLib_LogPage_GetLevelStyle

ContextLib.Logger = {}

ContextLib.Logger.New = function(source=null, context=null)
    if source == null then source = "()"
    if context == null then context = ContextLib.Get()
    // Ensure the log page exists.
    ContextLib.CreatePage(context, ContextLib.LogPage.Name, ContextLib.LogPage.Metadata)

    ret = new ContextLib.Logger
    ret.source = source
    ret.context = context
    ret.MinLevel = context.PagesMeta[ContextLib.LogPage.Name].minlevel
    return ret
end function

ContextLib.Logger.Log = function(level, message, arguments=null)
    if ContextLib.LogPage.LogLevels.hasIndex(level) then
        loglevel = ContextLib.LogPage.LogLevels[level]
    else
        loglevel = ContextLib.LogPage.LogLevels[ContextLib.LogPage.INFO]
    end if
    // Should it be logged?  Wrap as much as possible within this
    // if block.
    if loglevel.level >= self.MinLevel then
        if arguments == null then arguments = {}
        ContextLib.SendToPage(self.context, ContextLib.LogPage.Name, {
            "level": loglevel.name,
            "source": self.source,
            "msg": message,
            "args": arguments,
            "text": globals.FormatStr.PyFormat(message, arguments),
        })
    end if
end function

ContextLib.Logger.Trace = function(message, arguments=null)
    self.Log(ContextLib.LogPage.TRACE, message, arguments)
end function

ContextLib.Logger.Debug = function(message, arguments=null)
    self.Log(ContextLib.LogPage.DEBUG, message, arguments)
end function

ContextLib.Logger.Verbose = function(message, arguments=null)
    self.Log(ContextLib.LogPage.VERBOSE, message, arguments)
end function

ContextLib.Logger.Info = function(message, arguments=null)
    self.Log(ContextLib.LogPage.INFO, message, arguments)
end function

ContextLib.Logger.Warning = function(message, arguments=null)
    self.Log(ContextLib.LogPage.WARNING, message, arguments)
end function

ContextLib.Logger.Error = function(message, arguments=null)
    self.Log(ContextLib.LogPage.ERROR, message, arguments)
end function

ContextLib.Logger.Fatal = function(message, arguments=null)
    self.Log(ContextLib.LogPage.FATAL, message, arguments)
end function
