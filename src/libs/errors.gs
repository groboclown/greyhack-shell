// Error handling.

// Optional:
//import_code("format/formatted-str.gs")

if not globals.hasIndex("ErrorLib") then globals.ErrorLib = {}

ErrorLib.Message = {}

ErrorLib.Message.New = function(message, parameters)
    if globals.hasIndex("FormatStr") and globals["FormatStr"].hasIndex("PyFormat") then
        formatter = @globals.FormatStr.PyFormat
    else
        formatter = @globals.ErrorLib.Message._simple_format
    end if

    ret = new ErrorLib.Message
    ret.Msg = message
    ret.Params = parameters
    ret.Text = formatter(message, parameters)
    return ret
end function

ErrorLib.Error = {}

ErrorLib.Error.New = function(message, parameters=null)
    if message isa ErrorLib.Message then
        // parameters ends up being ignored.
        ret = new ErrorLib.Error
        ret.Message = message
        ret.Text = message.Text
        return ret
    end if

    if message == null then message = "unknown error"
    if parameters == null then parameters = {}
    ret = new ErrorLib.Error
    ret.Message = ErrorLib.Message.New(message, parameters)
    ret.Text = ret.Message.Text
    return ret
end function

ErrorLib.Message._simple_format = function(message, parameters)
    t = ""
    buff = ""
    state = 0
    for idx in message.indexes
        c = message[idx]
        if state == 0 then
            if c == "{" then
                state = 1
            else
                t = t + c
            end if
        else if state == 1 then
            if c == "{" or c == "}" then
                // Escaped "{" or an empty "{}"
                t = t + c
                state = 0
            else
                buff = c
                state = 2
            end if
        else if state == 2 then
            if c == "}" then
                // End buffer
                if parameters.hasIndex(buff) then
                    t = t + str(parameters[buff])
                else
                    t = t + "{" + buff + "}"
                end if
                state = 0
            else
                buff = buff + c
            end if
        end if
    end for
    if state != 0 then
        // partial state
        t = t + "{" + buff
    end if
    return t
end function
