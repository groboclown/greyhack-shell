// Error handling.
//#require format/formatted-str.gs

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

ErrorLib.Error.New = function(args)
    if args isa ErrorLib.Message then
        ret = new ErrorLib.Error
        ret.Message = args
        ret.Text = args.Text
        return ret
    end if

    p = {}
    m = "unknown error"
    if args == null then
        // do nothing
    else if args isa string then
        m = args
    else if args isa list then
        if args.len == 2 and args[0] isa string and args[1] isa map then
            m = args[0]
            p = args[1]
        else if args.len > 0 then
            if args[0] isa string then
                m = args[0]
                args = args[1:]
            end if
            for idx in args.indexes
                p["" + idx] = args[idx]
            end for
        end if
    else if args isa map then
        if args.hasIndex("Text") then
            m = args["Text"]
        else if args.hasIndex("message") then
            m = args["message"]
        else if args.hasIndex("msg") then
            m = args["msg"]
        end if
    end if
    ret = new ErrorLib.Error
    ret.Message = ErrorLib.Message.New(m, p)
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
end function
