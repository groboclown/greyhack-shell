// Error handling.

Message = {}

Message.New = function(message, parameters)
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
                    t = t + parameters[buff]
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
    ret = new Message
    ret.Msg = message
    ret.Params = parameters
    ret.Text = t
end function

Error = {}

Error.New = function(args)
    if args isa Message then

    end if

    p = {}
    m = "unknown error"
    if args isa string then
        m = args
    else if args isa list then
        if args.len == 2 and args[0] isa string and args[1] isa map then
            m = args[0]
            p = args[1]
        else if args.len > 0
            if args[0] isa string then
                m = args[0]
                args = args[1:]
            end if
            for idx in args.indexes
                p["" + idx] = args[idx]
            end for
        end if
    else if args isa map then
        if args.hasIndex("message") then
            m = args["message"]
            args.remove("message")
        else if args.hasIndex("msg") then
            m = args["msg"]
            args.remove("msg")
        end if
    end if
    ret = new Error
    ret.Message = Message.New(m, p)
    ret.Text = ret.Message.Text
    return ret
end function


