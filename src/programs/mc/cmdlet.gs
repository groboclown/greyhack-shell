// The Commandlet Interface

// Return the return value from a command-let.
//
// Returns an exit code (null == ok, otherwise error),
// A list of values,
// and a Map of key/value pairs.
Return = {}
Return.New = function(code=null, values=null, mapped=null)
    ret = new Return
    ret.code = code
    ret.values = values
    ret.mapped = mapped
end function

// Arguments all arguments passed to the command-let.
//
// Arguments are either named (Mapped) or not-named (Indexed)
Arguments = {}
Arguments.New = function(mapped, extra)
    ret = new Arguments
    ret.Indexed = extra
    ret.Mapped = mapped
    return ret
end function

ABCCmdlet = {
    "Name": "not set",
    "Help": "no help available",
}
ABCCmdlet.Run = function(term, args)
    return Return.New
end function

CmdletStore = {}
CmdletStore.store = {}
CmdletStore.Add = function(cmdlet)
    CmdletStore.store[cmdlet.Name] = cmdlet
end function
